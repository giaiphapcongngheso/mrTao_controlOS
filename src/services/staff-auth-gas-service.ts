const sanitizeEnvVal = (val: string | undefined): string => {
  if (!val) return '';
  return val.trim().replace(/\\r/g, '').replace(/\\n/g, '').trim();
};

const STAFF_AUTH_GAS_WEBAPP_URL = sanitizeEnvVal(
  import.meta.env.VITE_GAS_WEBAPP_URL
);
const STAFF_AUTH_GAS_TOKEN = sanitizeEnvVal(
  import.meta.env.VITE_GAS_SYNC_TOKEN
);

const STAFF_AUTH_GAS_TIMEOUT_MS = 60_000;
const STAFF_AUTH_GAS_ALLOWED_HOSTS = new Set([
  'script.google.com',
  'script.googleusercontent.com',
]);

type StaffAuthGasAction = 'staffAuthUpdate';

type StaffAuthGasSuccessData = {
  uid: string;
  authEmail: string;
  status: 'created' | 'updated';
};

type StaffAuthGasResponse = {
  success?: boolean;
  error?: string;
  data?: Partial<StaffAuthGasSuccessData>;
};

type StaffAuthIframeResponse = StaffAuthGasResponse & {
  requestId?: string;
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

function createRequestId(): string {
  return `staff-auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function appendHiddenField(
  form: HTMLFormElement,
  name: string,
  value: string | undefined,
) {
  if (value === undefined) {
    return;
  }

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function isAllowedGasOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && STAFF_AUTH_GAS_ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function isValidIframePayload(payload: unknown): payload is StaffAuthIframeResponse {
  return typeof payload === 'object' && payload !== null;
}

async function submitGasFormViaIframe(
  action: StaffAuthGasAction,
  input: SyncStaffAuthViaGasInput,
): Promise<StaffAuthGasSuccessData> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new StaffAuthGasError(
      'Môi trường hiện tại không hỗ trợ gọi Apps Script từ trình duyệt.',
      500,
    );
  }

  const gasUrl = STAFF_AUTH_GAS_WEBAPP_URL.trim();
  const requestId = createRequestId();
  const iframeName = `staff-auth-gas-frame-${requestId}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const container = document.body ?? document.documentElement;

    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.title = iframeName;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.display = 'none';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = gasUrl;
    form.target = iframeName;
    form.style.display = 'none';

    appendHiddenField(form, 'action', action);
    appendHiddenField(form, 'mode', 'iframe');
    appendHiddenField(form, 'requestId', requestId);
    appendHiddenField(form, 'origin', window.location.origin);
    appendHiddenField(form, 'token', STAFF_AUTH_GAS_TOKEN);
    appendHiddenField(form, 'authEmail', input.authEmail);
    appendHiddenField(form, 'currentAuthEmail', input.currentAuthEmail);
    appendHiddenField(form, 'firebaseUid', input.firebaseUid);
    appendHiddenField(form, 'password', input.password);
    appendHiddenField(
      form,
      'allowCreate',
      input.allowCreate === undefined ? undefined : String(input.allowCreate),
    );

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(timeoutId);
      iframe.remove();
      form.remove();
    };

    const finishWithError = (error: StaffAuthGasError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const finishWithSuccess = (payload: StaffAuthGasSuccessData) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve({
        uid: payload.uid,
        authEmail: payload.authEmail,
        status: payload.status,
      });
    };

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedGasOrigin(event.origin)) {
        return;
      }

      if (!isValidIframePayload(event.data) || event.data.requestId !== requestId) {
        return;
      }

      const payload = event.data;
      if (
        payload.success &&
        payload.data?.uid &&
        payload.data?.authEmail &&
        payload.data?.status
      ) {
        finishWithSuccess({
          uid: payload.data.uid,
          authEmail: payload.data.authEmail,
          status: payload.data.status as 'created' | 'updated',
        });
        return;
      }

      finishWithError(
        new StaffAuthGasError(
          payload.error || 'Apps Script trả về phản hồi không hợp lệ.',
          502,
        ),
      );
    };

    const timeoutId = window.setTimeout(() => {
      finishWithError(
        new StaffAuthGasError(
          'Hết thời gian chờ phản hồi từ Apps Script. Vui lòng thử lại.',
          504,
        ),
      );
    }, STAFF_AUTH_GAS_TIMEOUT_MS);

    window.addEventListener('message', handleMessage);
    container.appendChild(iframe);
    container.appendChild(form);

    try {
      form.submit();
    } catch (error) {
      finishWithError(
        new StaffAuthGasError(
          error instanceof Error
            ? error.message
            : 'Không thể gửi yêu cầu đến Apps Script.',
          500,
        ),
      );
    }
  });
}

export async function syncStaffAuthViaGas(
  input: SyncStaffAuthViaGasInput,
): Promise<StaffAuthGasSuccessData> {
  const gasUrl = STAFF_AUTH_GAS_WEBAPP_URL.trim();
  if (!gasUrl) {
    throw new StaffAuthGasError(
      'Chưa cấu hình Apps Script cho cập nhật tài khoản nhân sự. Vui lòng kiểm tra VITE_GAS_WEBAPP_URL.',
      500,
    );
  }

  return submitGasFormViaIframe('staffAuthUpdate', input);
}
