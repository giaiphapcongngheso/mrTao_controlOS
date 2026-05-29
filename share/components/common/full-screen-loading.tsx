import { WorkflowLoading } from './workflow-loading';

type FullScreenLoadingProps = {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

/**
 * Full screen loading overlay with optional message
 * Used for auth callback, user info loading, etc.
 */
export function FullScreenLoading({ message, size = 'lg' }: FullScreenLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="flex flex-col items-center gap-4">
        <WorkflowLoading size={size} />
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
      </div>
    </div>
  );
}
