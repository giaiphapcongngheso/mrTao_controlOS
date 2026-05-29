import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { HoverPauseToast } from '../../../share/ui';

const DEFAULT_TOAST_DURATION_MS = 6000;

export const toastError = (message: string, description?: string) => {
  if (
    message === 'An exception has been raised that is likely due to a transient failure.' ||
    description === 'An exception has been raised that is likely due to a transient failure.'
  ) {
    return;
  }

  return toast.custom(
    (t) => (
      <HoverPauseToast toastRef={t} durationMs={DEFAULT_TOAST_DURATION_MS}>
        {(progress) => (
          <div className="relative overflow-hidden bg-[#FEF3F2] border border-[#FDA29B] dark:border-[#FDA29B] rounded-lg shadow-lg p-4 min-w-[320px] max-w-md">
            <div className="absolute left-0 bottom-0 h-0.5 w-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full bg-black/40 dark:bg-white/60"
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-[var(--error)] dark:text-[var(--error)]" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[var(--error)] dark:text-[var(--error)]">
                  {message}
                </p>
                {description && <p className="text-sm mt-1">{description}</p>}
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </HoverPauseToast>
    ),
    { duration: Infinity },
  );
};

export const toastSuccess = (message: string, description?: string) =>
  toast.custom(
    (t) => (
      <HoverPauseToast toastRef={t} durationMs={DEFAULT_TOAST_DURATION_MS}>
        {(progress) => (
          <div className="relative overflow-hidden bg-[#ECFDF3] border border-[#75E0A7] dark:border-[#75E0A7] rounded-lg shadow-lg p-4 min-w-[320px] max-w-md">
            <div className="absolute left-0 bottom-0 h-0.5 w-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full bg-black/40 dark:bg-white/60"
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-[var(--success)] dark:text-green-400" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[var(--success)] dark:text-[var(--success)]">
                  {message}
                </p>
                {description && <p className="text-sm mt-1">{description}</p>}
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </HoverPauseToast>
    ),
    { duration: Infinity },
  );

export const toastWarning = (message: string, description?: string) =>
  toast.custom(
    (t) => (
      <HoverPauseToast toastRef={t} durationMs={DEFAULT_TOAST_DURATION_MS}>
        {(progress) => (
          <div className="relative overflow-hidden bg-[#FFFAEB] border border-[#FEC84B] dark:border-[#FEC84B] rounded-lg shadow-lg p-4 min-w-[320px] max-w-md">
            <div className="absolute left-0 bottom-0 h-0.5 w-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full bg-black/40 dark:bg-white/60"
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[var(--warning)] dark:text-[var(--warning)]" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[var(--warning)] dark:text-[var(--warning)]">
                  {message}
                </p>
                {description && <p className="text-sm  mt-1">{description}</p>}
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </HoverPauseToast>
    ),
    { duration: Infinity },
  );

export const toastInfo = (message: string, description?: string) =>
  toast.custom(
    (t) => (
      <HoverPauseToast toastRef={t} durationMs={DEFAULT_TOAST_DURATION_MS}>
        {(progress) => (
          <div className="relative overflow-hidden bg-[#EAF5FF] border border-[#5DA7E2] dark:border-[#5DA7E2] rounded-lg shadow-lg p-4 min-w-[320px] max-w-md">
            <div className="absolute left-0 bottom-0 h-0.5 w-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full bg-black/40 dark:bg-white/60"
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Info className="h-5 w-5 text-[var(--info)] dark:text-[var(--info)]" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold text-[var(--info)] dark:text-[var(--info)]">
                  {message}
                </p>
                {description && <p className="text-sm  mt-1">{description}</p>}
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </HoverPauseToast>
    ),
    { duration: Infinity },
  );
