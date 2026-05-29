import { ButtonHTMLAttributes, forwardRef } from 'react';
import { ExportIcon, ImportIcon, SpinnerIcon } from './icons';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

const buttonVariants = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary-hover focus:outline-none focus:shadow-[0_0_0_4px_var(--figma-blue-light-100)] transition-shadow',
  outline:
    'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
};

const baseButtonClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 [&_svg]:shrink-0 outline-none h-9 px-4 py-2';

export interface ImportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Custom label for the button
   */
  label?: string;
  /**
   * Show only icon without label
   */
  iconOnly?: boolean;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Button variant
   */
  variant?: 'default' | 'outline';
}

export interface ExportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Custom label for the button
   */
  label?: string;
  /**
   * Show only icon without label
   */
  iconOnly?: boolean;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Button variant
   */
  variant?: 'default' | 'outline';
}

/**
 * Reusable Import Button with consistent styling
 */
export const ImportButton = forwardRef<HTMLButtonElement, ImportButtonProps>(
  (
    {
      label = 'Import',
      iconOnly = false,
      loading = false,
      variant = 'outline',
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(baseButtonClass, buttonVariants[variant], className)}
        {...props}
      >
        {loading ? (
          <SpinnerIcon className="h-4 w-4 animate-spin" />
        ) : (
          <ImportIcon className="h-4 w-4" />
        )}
        {!iconOnly && <span>{label}</span>}
      </button>
    );
  },
);
ImportButton.displayName = 'ImportButton';

/**
 * Reusable Export Button with consistent styling
 */
export const ExportButton = forwardRef<HTMLButtonElement, ExportButtonProps>(
  (
    {
      label = 'Export',
      iconOnly = false,
      loading = false,
      variant = 'outline',
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(baseButtonClass, buttonVariants[variant], className)}
        {...props}
      >
        {loading ? (
          <SpinnerIcon className="h-4 w-4 animate-spin" />
        ) : (
          <ExportIcon className="h-4 w-4" />
        )}
        {!iconOnly && <span>{label}</span>}
      </button>
    );
  },
);
ExportButton.displayName = 'ExportButton';
