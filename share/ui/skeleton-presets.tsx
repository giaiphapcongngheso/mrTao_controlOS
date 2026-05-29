import { cn } from '../lib/utils';
import { Skeleton } from './skeleton';

type BaseSkeletonProps = {
  className?: string;
};

type FormSkeletonProps = BaseSkeletonProps & {
  fields?: number;
  columns?: number;
  showActions?: boolean;
};

export const FormSkeleton = ({
  fields = 6,
  columns = 3,
  showActions = true,
  className,
}: FormSkeletonProps) => {
  const safeColumns = Math.max(1, columns);
  const skeletonFields = Array.from({ length: fields });

  return (
    <div className={cn('space-y-6', className)}>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))` }}
      >
        {skeletonFields.map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24 max-w-[60%]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      {showActions && (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      )}
    </div>
  );
};

type TableSkeletonProps = BaseSkeletonProps & {
  columns?: number;
  rows?: number;
  showToolbar?: boolean;
  showHeader?: boolean;
};

export const TableSkeleton = ({
  columns = 4,
  rows = 6,
  showToolbar = true,
  showHeader = true,
  className,
}: TableSkeletonProps) => {
  const columnArray = Array.from({ length: columns });
  const rowArray = Array.from({ length: rows });

  return (
    <div className={cn('space-y-3', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden">
        {showHeader && (
          <div
            className="grid gap-3 border-b bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {columnArray.map((_, columnIndex) => (
              <Skeleton key={`header-${columnIndex}`} className="h-4 w-full" />
            ))}
          </div>
        )}
        <div className="divide-y">
          {rowArray.map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-3 px-4 py-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {columnArray.map((_, columnIndex) => (
                <Skeleton key={`cell-${rowIndex}-${columnIndex}`} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type ListSkeletonProps = BaseSkeletonProps & {
  items?: number;
  showAvatar?: boolean;
};

export const ListSkeleton = ({ items = 5, showAvatar = true, className }: ListSkeletonProps) => {
  const itemArray = Array.from({ length: items });

  return (
    <div className={cn('space-y-3', className)}>
      {itemArray.map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border px-4 py-3">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
};
