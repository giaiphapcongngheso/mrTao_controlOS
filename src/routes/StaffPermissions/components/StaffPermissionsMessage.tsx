import { AlertCircle } from 'lucide-react';

interface StaffPermissionsMessageProps {
  errorMessage: string;
}

export function StaffPermissionsMessage({ errorMessage }: StaffPermissionsMessageProps) {
  if (!errorMessage) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-[0_18px_32px_-28px_rgba(225,29,72,0.7)]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 rounded-xl bg-rose-100 p-2 text-rose-600">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-700">Co loi khi thao tac</p>
          <p className="mt-1 font-semibold leading-6">{errorMessage}</p>
        </div>
      </div>
    </div>
  );
}
