import * as React from 'react';

import { cn } from '@/lib/utils';

type ContainerProps = React.ComponentProps<'div'> & {
  children: React.ReactNode;
  className?: string;
};

function Container({ children, className }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn(
        'grid grid-rows-[auto_1fr] h-full min-h-0 pl-5 pt-5 pb-5 rounded-xl overflow-hidden bg-background space-y-5 w-full',
        '[&>*:nth-child(1)]:pr-5 [&>*:nth-child(2)]:overflow-auto [&>*:nth-child(2)]:pr-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Container };
