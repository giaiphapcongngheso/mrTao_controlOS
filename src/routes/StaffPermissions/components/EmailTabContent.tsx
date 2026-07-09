import React, { useState, useEffect } from 'react';
import { Mail, Save, Send, Sparkles, Copy } from 'lucide-react';
import { toastSuccess, toastError } from '../../../shared/lib/toast';
import { emailService, type EmailConfig } from '../../../services/email-service';
import { env } from '../../../services/env';

export function EmailTabContent() {
  const [config, setConfig] = useState<EmailConfig>({
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await emailService.getConfig();
        setConfig(data);
      } catch (err) {
        console.error('Lỗi khi tải cấu hình email:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await emailService.saveConfig(config);
      toastSuccess('Đã lưu cấu hình email thành công.');
    } catch (err) {
      console.error(err);
      toastError(err instanceof Error ? err.message : 'Không thể lưu cấu hình. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!config.defaultRecipients.trim()) {
      toastError('Vui lòng nhập email nhận thử nghiệm vào ô "Danh sách nhận email".');
      return;
    }

    setTesting(true);
    try {
      const recipientList = config.defaultRecipients
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      if (recipientList.length === 0) {
        toastError('Email nhận không hợp lệ.');
        setTesting(false);
        return;
      }

      // Lưu tạm trước khi gửi để chắc chắn thông số mới nhất được áp dụng
      await emailService.saveConfig(config);

      const res = await emailService.sendEmail({
        to: recipientList.join(','),
        subject: `[Test] Thư thử nghiệm từ hệ thống ${config.senderName}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #ea580c; margin-bottom: 10px;">Thử nghiệm Hệ thống Email</h2>
            <p>Xin chào quản trị viên,</p>
            <p>Đây là thư thử nghiệm cấu hình gửi từ hệ thống quản lý <strong>Mr Táo</strong>.</p>
            <p>Phương thức gửi đang chọn: <strong>Google Apps Script</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
        `,
      });

      if (res.success) {
        toastSuccess('Đã gửi email thử nghiệm thành công! Hãy kiểm tra hòm thư của bạn.');
      } else {
        toastError(res.error || 'Gửi thử thất bại.');
      }
    } catch (err) {
      console.error(err);
      toastError('Có lỗi xảy ra khi gửi thử email.');
    } finally {
      setTesting(false);
    }
  };

  const codeTemplate = `function doPost(e) {
  try {
    var params = e.parameter;
    var jsonBody = {};
    if (e.postData && e.postData.contents) {
      jsonBody = JSON.parse(e.postData.contents);
    }
    
    var action = params.action || jsonBody.action;
    var token = params.token || jsonBody.token;
    
    // Khớp token đồng bộ từ cấu hình .env (VITE_GAS_SYNC_TOKEN)
    var expectedToken = "${env.VITE_GAS_SYNC_TOKEN || 'mrTaoOs'}";
    if (token !== expectedToken) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Unauthorized token"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sendEmail") {
      var to = params.to || jsonBody.to;
      var subject = params.subject || jsonBody.subject;
      var body = params.body || jsonBody.body;
      var htmlBody = params.htmlBody || jsonBody.htmlBody;
      
      MailApp.sendEmail({
        to: to,
        subject: subject,
        body: body || "",
        htmlBody: htmlBody || undefined
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Email sent successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(codeTemplate);
    toastSuccess('Đã copy đoạn mã nguồn Apps Script vào clipboard!');
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center text-slate-500 font-medium">Đang tải cấu hình email...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 text-left font-sans">
      {/* Cấu hình bên trái */}
      <form onSubmit={handleSave} className="space-y-6 lg:col-span-7">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Cấu hình Gửi Thông Báo Email</h2>
              <p className="text-xs text-slate-400">Thiết lập phương thức và địa chỉ nhận email thông báo</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">
                  Tên hiển thị người gửi (Sender Name)
                </label>
                <input
                  type="text"
                  value={config.senderName}
                  onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                  placeholder="Ví dụ: Cửa hàng Mr Táo"
                  required
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">
                  Danh sách nhận email thử nghiệm (Phân tách bằng dấu phẩy)
                </label>
                <textarea
                  value={config.defaultRecipients}
                  onChange={(e) => setConfig({ ...config, defaultRecipients: e.target.value })}
                  placeholder="admin@mrtaostore.com"
                  rows={2}
                  required
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                />
                <p className="text-[10px] text-slate-400 italic pl-1">
                  * Danh sách này chỉ dùng để nhận thư thử nghiệm khi bấm nút "Gửi mail thử nghiệm". Khi có nhân viên gửi báo cáo thực tế, hệ thống sẽ tự động gửi thông báo đến các địa chỉ này.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">Tự động gửi mail khi</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-55 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifyOnReportCreated}
                  onChange={(e) => setConfig({ ...config, notifyOnReportCreated: e.target.checked })}
                  className="h-4 w-4 rounded-sm border-slate-300 text-orange-650 focus:ring-orange-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Có báo cáo ca làm việc mới</p>
                  <p className="text-[11px] text-slate-400">Gửi kèm chi tiết kết quả KPI, doanh số và ảnh check-in khi nhân sự nộp báo cáo ca.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 hover:bg-slate-55 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifyOnIssueCreated}
                  onChange={(e) => setConfig({ ...config, notifyOnIssueCreated: e.target.checked })}
                  className="h-4 w-4 rounded-sm border-slate-300 text-orange-650 focus:ring-orange-500"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">Phát sinh vấn đề cần xử lý</p>
                  <p className="text-[11px] text-slate-400">Gửi mail lập tức khi nhân viên báo cáo có sự cố, lỗi thiết bị hoặc vấn đề phát sinh tại quầy.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 justify-between">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={testing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-55 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4 text-slate-500" />
              {testing ? 'Đang gửi thử...' : 'Gửi mail thử nghiệm'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-bold text-white hover:bg-orange-700 transition shadow-sm cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </form>

      {/* Tài liệu/Hướng dẫn bên phải */}
      <div className="space-y-6 lg:col-span-5">
        {/* Hướng dẫn Apps Script */}
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-orange-500" />
            Hướng dẫn Google Apps Script
          </h2>
          
          <div className="text-xs text-slate-600 space-y-4 leading-relaxed">
            <p>Để hệ thống gửi mail bằng chính tài khoản Gmail của bạn một cách bảo mật và hoàn toàn miễn phí, hãy tích hợp một Google Apps Script nhỏ:</p>
            
            <div className="space-y-2 border-l-2 border-slate-100 pl-3">
              <p className="font-bold text-slate-800">Các bước tích hợp:</p>
              <ol className="list-decimal list-inside space-y-1.5 font-semibold text-slate-500">
                <li>Truy cập trang dự án Apps Script Web App của bạn.</li>
                <li>Copy đoạn mã nguồn Apps Script phía dưới.</li>
                <li>Dán đè vào file mã nguồn chính của bạn.</li>
                <li>Bấm **Deploy (Triển khai mới)** dưới dạng Web App, cấp quyền gửi Email và copy URL.</li>
                <li>Mở tệp cấu hình <code className="bg-slate-100 px-1.5 py-0.5 rounded-sm">.env</code> của hệ thống, dán URL vừa copy vào dòng <code className="bg-slate-100 px-1.5 py-0.5 rounded-sm">VITE_GAS_WEBAPP_URL</code> và <code className="bg-slate-100 px-1.5 py-0.5 rounded-sm">VITE_GAS_STAFF_AUTH_URL</code>.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã nguồn Apps Script</span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 transition cursor-pointer"
                >
                  <Copy className="h-3 w-3" /> Copy mã
                </button>
              </div>
              <pre className="max-h-60 overflow-y-auto text-[10px] font-mono bg-slate-900 text-slate-200 p-3 rounded-xl scrollbar-thin">
                {codeTemplate}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
