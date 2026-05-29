export type SystemLogActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'RESET' | 'OTHER';

export interface SystemLog {
  id: string;
  storeId?: string;
  timestamp: string;
  actor: string;
  role: string;
  actionType: SystemLogActionType;
  target: string;
  details: string;
}
