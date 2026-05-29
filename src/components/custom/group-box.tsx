import * as React from 'react';
import { cn } from '@/lib/utils';

interface GroupBoxProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  legend?: React.ReactNode;
  legendClassName?: string;
}

const GroupBox = React.forwardRef<HTMLFieldSetElement, GroupBoxProps>(
  ({ className, legend, legendClassName, children, ...props }, ref) => (
    <fieldset
      ref={ref}
      className={cn('relative rounded-lg border border-border bg-card px-4 py-4', className)}
      {...props}
    >
      {legend && (
        <legend className={cn('px-2 text-sm font-semibold text-foreground -ml-2', legendClassName)}>
          {legend}
        </legend>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  ),
);
GroupBox.displayName = 'GroupBox';

export { GroupBox };
