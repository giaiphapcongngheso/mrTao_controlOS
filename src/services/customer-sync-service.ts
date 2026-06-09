import type { Customer, CustomerSyncLog } from '../types/customer.types';
import { customersService } from './customers-service';
import { customerSyncLogsService } from './customer-sync-logs-service';

const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL ?? '';
const GAS_SYNC_TOKEN = import.meta.env.VITE_GAS_SYNC_TOKEN ?? '';

class CustomerSyncRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CustomerSyncRequestError';
  }
}

export interface CustomerSyncResponse {
  success: boolean;
  preview: boolean;
  summary?: string;
  error?: string;
  timeTaken?: string;
  customers?: Customer[];
}

function normalizeSyncError(error: unknown): string {
  if (error instanceof CustomerSyncRequestError) {
    if (error.status === 401) {
      return 'Mã bảo mật Apps Script Token không hợp lệ hoặc đã hết hạn.';
    }
    if (error.status === 404) {
      return 'Không tìm thấy URL Web App của Google Apps Script.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Không thể đồng bộ dữ liệu khách hàng.';
}

export async function syncCustomerData(previewOnly = false): Promise<CustomerSyncResponse> {
  const gasUrl = GAS_WEBAPP_URL.trim();
  if (!gasUrl) {
    throw new Error(
      'Thiếu cấu hình VITE_GAS_WEBAPP_URL. Vui lòng cấu hình URL Google Apps Script Web App cho đồng bộ.'
    );
  }

  try {
    const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(GAS_SYNC_TOKEN)}&action=customers&preview=${previewOnly}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new CustomerSyncRequestError(
        response.status,
        `Không thể kết nối với Apps Script Proxy (${response.status})`
      );
    }

    const body = (await response.json()) as CustomerSyncResponse;
    if (body.success === false) {
      throw new CustomerSyncRequestError(
        502,
        String(body.error || 'Lỗi không xác định từ Google Apps Script.')
      );
    }

    if (!previewOnly) {
      // Invalidate cache when sync is completed successfully
      customersService.invalidateCache();
      customerSyncLogsService.invalidateCache();
    }

    return body;
  } catch (error) {
    throw new Error(normalizeSyncError(error));
  }
}
