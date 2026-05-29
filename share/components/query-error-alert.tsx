import { Button, Alert, AlertTitle } from '../ui';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCallback } from 'react';

interface QueryErrorAlertProps {
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
  title?: string;
  description?: string;
  retryText?: string;
  defaultErrorMessage?: string;
}

export function QueryErrorAlert({
  error,
  onRetry,
  className,
  description,
  retryText = 'Retry',
  defaultErrorMessage = 'An error occurred while loading data.',
}: QueryErrorAlertProps) {
  const handleRetry = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
      }
      if (onRetry) {
        try {
          onRetry();
        } catch (err) {
          console.error('Error in retry:', err);
        }
      }
    },
    [onRetry],
  );

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error?.message || defaultErrorMessage;

  return (
    <Alert variant="destructive" className={cn('mb-4', className)}>
      <AlertCircle className="h-4 w-4" />
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex-1">
          <AlertTitle>{description || errorMessage}</AlertTitle>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="h-auto px-3 py-1.5 text-sm font-medium shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            {retryText}
          </Button>
        )}
      </div>
    </Alert>
  );
}
