const STAFF_AUTH_GAS_WEBAPP_URL =
  import.meta.env.VITE_GAS_STAFF_AUTH_URL ?? import.meta.env.VITE_GAS_WEBAPP_URL ?? '';
const STAFF_AUTH_GAS_TOKEN =
  import.meta.env.VITE_GAS_STAFF_AUTH_TOKEN ?? import.meta.env.VITE_GAS_SYNC_TOKEN ?? '';

type StaffAuthGasAction = 'staffAuthUpdate';

type StaffAuthGasResponse = {
  success?: boolean;
  error?: string;
  data?: {
    uid?: string;
    authEmail?: string;
    status?: 'created' | 'updated';
  };
};

export type SyncStaffAuthViaGasInput = {
  authEmail: string;
  currentAuthEmail?: string;
  firebaseUid?: string;
  password?: string;
  allowCreate?: boolean;
};

export class StaffAuthGasError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'StaffAuthGasError';
    this.status = status;
  }
}

export function isStaffAuthGasConfigured(): boolean {
  return STAFF_AUTH_GAS_WEBAPP_URL.trim().length > 0;
}

export async function syncStaffAuthViaGas(
  input: SyncStaffAuthViaGasInput,
): Promise<{ uid: string; authEmail: string; status: 'created' | 'updated' }> {
  const gasUrl = STAFF_AUTH_GAS_WEBAPP_URL.trim();
  if (!gasUrl) {
    throw new StaffAuthGasError(
      'Chưa cấu hình Apps Script cho cập nhật tài khoản nhân sự. Vui lòng kiểm tra VITE_GAS_STAFF_AUTH_URL.',
      500,
    );
  }

  const formBody = new URLSearchParams();
  formBody.set('action', 'staffAuthUpdate');
  formBody.set('token', STAFF_AUTH_GAS_TOKEN);
  formBody.set('authEmail', input.authEmail);
  if (input.currentAuthEmail) {
    formBody.set('currentAuthEmail', input.currentAuthEmail);
  }
  if (input.firebaseUid) {
    formBody.set('firebaseUid', input.firebaseUid);
  }
  if (input.password) {
    formBody.set('password', input.password);
  }
  if (input.allowCreate !== undefined) {
    formBody.set('allowCreate', String(input.allowCreate));
  }

  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: formBody.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as StaffAuthGasResponse;
  if (!response.ok || !payload.success || !payload.data?.uid || !payload.data?.authEmail || !payload.data?.status) {
    throw new StaffAuthGasError(
      payload.error || `Apps Script cập nhật Firebase Auth thất bại (${response.status}).`,
      response.status,
    );
  }

  return {
    uid: payload.data.uid,
    authEmail: payload.data.authEmail,
    status: payload.data.status,
  };
}
