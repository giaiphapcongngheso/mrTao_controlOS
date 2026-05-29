import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../../../../share/ui';

interface ChecklistErrorBannerProps {
  errorMessage?: string | null;
  onDismissError?: () => void;
}

/**
 * Dismissible error alert banner for notifying users about operational or API errors.
 */
const ChecklistErrorBanner = React.memo(function ChecklistErrorBanner({
  errorMessage,
  onDismissError,
}: ChecklistErrorBannerProps) {
  if (!errorMessage) {
    return null;
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
      <div className="flex items-start gap-2.5 text-rose-700">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
      </div>
      <Button
        type="button"
        onClick={onDismissError}
        className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
        title="Đóng thông báo lỗi"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
});

export default ChecklistErrorBanner;
