import type { SystemLog, SystemLogActionType } from '../types/system-log.types';
import { createBaseService, registerLogHandler } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';
import { DEFAULT_STORE_ID } from '../data';
import { useAppStore } from '../stores/app-store';

const baseService = createBaseService<SystemLog, Partial<SystemLog>>({
  client: dataClient,
  resource: RESOURCE_PATH.SYSTEM_LOGS,
});

export const systemLogService = {
  ...baseService,

  /**
   * Tạo log hệ thống chuẩn hoá.
   * Tự động điền timestamp, sinh ID ngẫu nhiên không trùng lặp, tính expireAt (30 ngày),
   * tự động lấy actor/role từ app store nếu không được cung cấp và bắt lỗi an toàn.
   */
  async createLog(params: {
    storeId?: string;
    actionType: SystemLogActionType;
    target: string;
    details: string;
    actor?: string | { fullName?: string; username?: string } | null;
    role?: string | null;
    expireDays?: number;
  }): Promise<SystemLog> {
    const timestamp = new Date();
    const id = `LOG-${timestamp.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    
    // Resolve actor name & role from inputs or session storage
    let actorName = 'Hệ thống';
    let actorRole = 'Không xác định';

    if (params.actor) {
      if (typeof params.actor === 'string') {
        actorName = params.actor;
      } else {
        actorName = params.actor.fullName || params.actor.username || 'Hệ thống';
      }
    } else {
      const currentUser = useAppStore.getState().currentUser;
      if (currentUser) {
        actorName = currentUser.fullName || currentUser.username || 'Hệ thống';
        actorRole = currentUser.role || 'Không xác định';
      }
    }

    const role = params.role || actorRole;
    const storeId = params.storeId || DEFAULT_STORE_ID;
    
    // Mặc định thời gian lưu trữ log là 30 ngày (Compliance & Storage Cost Control)
    const expireDays = params.expireDays ?? 30;
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + expireDays);
    
    const newLog: SystemLog = {
      id,
      storeId,
      timestamp: timestamp.toISOString(),
      actor: actorName,
      role,
      actionType: params.actionType,
      target: params.target,
      details: params.details,
      expireAt,
    };

    try {
      await baseService.update(id, newLog);
    } catch (error) {
      console.error('Failed to persist system log to Firestore:', error);
    }

    return newLog;
  }
};

// Đăng ký log handler toàn cục cho các base services khác
registerLogHandler(async (params) => {
  // Ngăn chặn vòng lặp ghi log vô hạn nếu một log service lại gọi log service
  if (
    params.target === 'SystemLog' || 
    params.target === 'Nhật ký hệ thống' || 
    params.target === 'LOG' || 
    params.target === 'system_logs'
  ) {
    return;
  }
  
  await systemLogService.createLog({
    storeId: params.storeId,
    actionType: params.actionType,
    target: params.target,
    details: params.details,
  });
});

