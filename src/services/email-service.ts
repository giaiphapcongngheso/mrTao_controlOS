import { createBaseService } from '../shared/services/create-base-service';
import { dataClient } from './data-client';
import { env } from './env';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { getCurrentFirebaseIdToken } from './firebase-auth-service';

export interface EmailConfig {
  id: string;
  defaultRecipients: string; // Comma separated email list
  notifyOnReportCreated: boolean;
  notifyOnIssueCreated: boolean;
  senderName: string;
  sendMethod: 'apps_script' | 'smtp'; // Phương thức gửi
  gasUrl?: string;
  gasToken?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const emailConfigService = createBaseService<EmailConfig, Partial<EmailConfig>>({
  client: dataClient,
  resource: RESOURCE_PATH.KPI_CONFIGS,
  cacheTtlMs: 2 * 60 * 1000,
  autoLog: { target: 'Cấu hình Email' },
});

export const emailService = {
  /**
   * Lấy cấu hình email hiện tại từ localStorage hoặc Firestore
   */
  async getConfig(): Promise<EmailConfig> {
    const cleanConfig = (cfg: EmailConfig): EmailConfig => {
      if (cfg.smtpHost === 'smtp.gmail.comsmtp.gmail.com') cfg.smtpHost = 'smtp.gmail.com';
      if (cfg.smtpPort === 587587) cfg.smtpPort = 587;
      if (cfg.smtpUser === 'phungdai.hoc@gmail.comtest@gmail.com') cfg.smtpUser = 'phungdai.hoc@gmail.com';
      if (cfg.defaultRecipients === 'phungdai.hoc@gmail.comreceiver@gmail.com') cfg.defaultRecipients = 'phungdai.hoc@gmail.com';
      return cfg;
    };

    // 1. Thử lấy từ localStorage trước (đảm bảo phản hồi nhanh, hoạt động offline)
    try {
      const cached = localStorage.getItem('mrtao_email_config');
      if (cached) {
        const parsed = JSON.parse(cached) as EmailConfig;
        if (!parsed.sendMethod) parsed.sendMethod = 'apps_script';
        return cleanConfig(parsed);
      }
    } catch (e) {
      console.warn('Không thể đọc cấu hình từ localStorage:', e);
    }

    // 2. Thử lấy từ Firestore để đồng bộ giữa các máy
    try {
      const config = await emailConfigService.getById('email_config');
      if (config) {
        if (!config.sendMethod) config.sendMethod = 'apps_script';
        const cleaned = cleanConfig(config);

        try {
          localStorage.setItem('mrtao_email_config', JSON.stringify(cleaned));
        } catch (e) {
          console.warn(e);
        }
        return cleaned;
      }
    } catch (e) {
      console.warn('Không tìm thấy cấu hình email trên Firestore, dùng fallback config.');
    }
    
    return {
      id: 'email_config',
      defaultRecipients: '',
      notifyOnReportCreated: false,
      notifyOnIssueCreated: false,
      senderName: 'Hệ thống Mr Táo',
      sendMethod: 'apps_script',
      gasUrl: '',
      gasToken: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
    };
  },

  /**
   * Lưu cấu hình email vào cả localStorage và Firestore (fail-safe)
   */
  async saveConfig(config: Partial<EmailConfig>): Promise<void> {
    const updated = {
      ...config,
      id: 'email_config',
      updatedAt: new Date().toISOString(),
    } as EmailConfig;

    // 1. Lưu vào localStorage trước (luôn luôn thành công)
    try {
      localStorage.setItem('mrtao_email_config', JSON.stringify(updated));
    } catch (e) {
      console.error('Không thể lưu cấu hình vào localStorage:', e);
    }

    // 2. Đồng bộ lên Firestore (nếu lỗi bảo mật/offline, bỏ qua không block UI)
    try {
      await emailConfigService.update('email_config', updated);
    } catch (e) {
      console.warn('Lưu Firestore thất bại (bảo mật/offline), cấu hình được lưu cục bộ:', e);
    }
  },

  /**
   * Gửi email thông qua dịch vụ được chọn (Apps Script hoặc SMTPJS)
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    body?: string;
    htmlBody?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      const sendMethod = 'apps_script'; // Tạm thời chỉ dùng Google Apps Script

      if (sendMethod === 'apps_script') {
        const gasUrl = env.VITE_GAS_WEBAPP_URL?.trim();
        const gasToken = env.VITE_GAS_SYNC_TOKEN?.trim() || 'mrTaoOs';

        if (!gasUrl) {
          return { success: false, error: 'Chưa cấu hình Web App URL của Google Apps Script.' };
        }

        // Sử dụng text/plain;charset=utf-8 để tránh preflight check (CORS)
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'sendEmail',
            token: gasToken,
            to: options.to,
            subject: options.subject,
            body: options.body || '',
            htmlBody: options.htmlBody || '',
          }),
        });

        if (!response.ok) {
          throw new Error(`Apps Script HTTP ${response.status}`);
        }

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          if (text.includes('"success":true') || text.includes('success:true')) {
            result = { success: true };
          } else {
            throw new Error(text || 'Phản hồi không xác định từ Apps Script');
          }
        }

        if (result && result.success) {
          return { success: true };
        }
        return { success: false, error: result?.error || 'Gửi email qua Apps Script thất bại.' };
      } else {
        // Gửi qua Firebase Cloud Function (SMTP bảo mật từ backend)
        const host = config.smtpHost?.trim();
        const user = config.smtpUser?.trim();
        const pass = config.smtpPass?.trim();

        if (!host || !user || !pass) {
          return { success: false, error: 'Chưa cấu hình thông tin tài khoản SMTP (Host, User hoặc Mật khẩu).' };
        }

        // Lấy token xác thực phiên để gửi request đến Firebase Cloud Function
        const token = await getCurrentFirebaseIdToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const projectId = env.VITE_FIREBASE_PROJECT_ID || 'mrtaocontrolos';
        const url = `https://asia-southeast1-${projectId}.cloudfunctions.net/sendEmailViaSmtp`;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            to: options.to,
            subject: options.subject,
            body: options.body || '',
            htmlBody: options.htmlBody || '',
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let errMsg = `SMTP server returned status ${response.status}`;
          try {
            const errObj = JSON.parse(errText);
            errMsg = errObj.error || errMsg;
          } catch {
            errMsg = errText || errMsg;
          }
          throw new Error(errMsg);
        }

        const result = await response.json();
        if (result && result.success) {
          return { success: true };
        }
        return { success: false, error: result.error || 'Gửi email qua SMTP thất bại.' };
      }
    } catch (error) {
      console.error('Lỗi khi gửi mail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi kết nối dịch vụ gửi mail.',
      };
    }
  },
};
