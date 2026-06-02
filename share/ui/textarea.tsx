import * as React from 'react';

import { cn } from '../lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  const hasCustomSizing =
    typeof className === 'string' &&
    /(min-h-|h-|\[field-sizing:)/.test(className);

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'font-sans placeholder:font-light placeholder:text-gray-400 dark:placeholder:text-[#fff]/30 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-[#fff] px-3 py-2 text-[#141414] dark:text-[#fff] shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-[#A3A3A3] md:text-sm read-only:bg-[#FAFAFA] read-only:text-[#141414]',
        'focus-visible:border-primary focus-visible:ring-primary/18 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        hasCustomSizing ? 'flex' : 'flex field-sizing-content min-h-[60px]',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
