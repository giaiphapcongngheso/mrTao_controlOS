import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MoreVertical, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// Types & Interfaces
// ==========================================

export type CardVariant = 'flat' | 'bordered' | 'elevated';
export type CardAccentColor = 'brand' | 'teal' | 'red' | 'blue' | 'green' | 'amber' | 'slate' | 'none';
export type CardAccentPosition = 'left' | 'top' | 'none';
export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

type MotionSafeProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'style'>;

export interface MobileCardProps extends MotionSafeProps {
  readonly variant?: CardVariant;
  readonly accentColor?: CardAccentColor;
  readonly accentPosition?: CardAccentPosition;
  readonly interactive?: boolean;
  readonly activeScale?: number;
  readonly delayIndex?: number; // for staggered entrance animation
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}

export interface MobileCardHeaderProps {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly avatar?: React.ReactNode | string; // URL, initials, or node
  readonly badge?: React.ReactNode | {
    text: string;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
  };
  readonly actions?: React.ReactNode; // e.g. more icon button
  readonly className?: string;
  readonly collapsible?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: () => void;
}

export interface MobileCardBodyProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export interface GridItem {
  label: React.ReactNode;
  value: React.ReactNode;
  fullWidth?: boolean;
  valueClassName?: string;
  labelClassName?: string;
}

export interface MobileCardGridProps {
  readonly items: readonly GridItem[];
  readonly cols?: 2 | 3;
  readonly className?: string;
}

export interface MobileCardProgressBarProps {
  readonly value: number; // 0 to 100
  readonly label?: React.ReactNode;
  readonly valueLabel?: React.ReactNode;
  readonly color?: 'red' | 'teal' | 'blue' | 'green' | 'amber' | 'slate';
  readonly showPulse?: boolean;
  readonly className?: string;
}

export interface MobileCardStatusIndicatorProps {
  readonly status: StatusType;
  readonly label?: string;
  readonly pulse?: boolean;
  readonly className?: string;
}

export interface FooterAction {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface MobileCardFooterProps {
  readonly actions?: readonly FooterAction[];
  readonly layout?: 'row' | 'column' | 'grid';
  readonly children?: React.ReactNode;
  readonly className?: string;
}

// ==========================================
// Helper Classes / Color Mapping
// ==========================================

const ACCENT_LEFT_CLASSES: Record<CardAccentColor, string> = {
  brand: 'border-l-4 border-l-[var(--primary)]',
  teal: 'border-l-4 border-l-emerald-500',
  red: 'border-l-4 border-l-[#C21A1A]',
  blue: 'border-l-4 border-l-blue-500',
  green: 'border-l-4 border-l-green-500',
  amber: 'border-l-4 border-l-amber-500',
  slate: 'border-l-4 border-l-slate-400',
  none: '',
};

const ACCENT_TOP_CLASSES: Record<CardAccentColor, string> = {
  brand: 'border-t-4 border-t-[var(--primary)]',
  teal: 'border-t-4 border-t-emerald-500',
  red: 'border-t-4 border-t-[#C21A1A]',
  blue: 'border-t-4 border-t-blue-500',
  green: 'border-t-4 border-t-green-500',
  amber: 'border-t-4 border-t-amber-500',
  slate: 'border-t-4 border-t-slate-400',
  none: '',
};

const CARD_VARIANTS: Record<CardVariant, string> = {
  flat: 'bg-slate-50/75 dark:bg-zinc-900/30 border-0',
  bordered: 'bg-card border border-border/80 shadow-xs',
  elevated: 'bg-card border border-border/40 shadow-sm dark:shadow-zinc-950/20',
};

// ==========================================
// Sub-components
// ==========================================

/**
 * Avatar sub-component with fallback to initials or icon
 */
export function MobileCardAvatar({
  avatar,
  nameForFallback = '',
}: {
  readonly avatar?: React.ReactNode | string;
  readonly nameForFallback?: string;
}) {
  if (!avatar) return null;

  if (React.isValidElement(avatar)) {
    return <div className="shrink-0">{avatar}</div>;
  }

  if (typeof avatar === 'string') {
    if (avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:')) {
      return (
        <img
          src={avatar}
          alt={nameForFallback}
          className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/50"
        />
      );
    }

    // Initials fallback
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center shrink-0 uppercase border border-border/20">
        {avatar.slice(0, 3)}
      </div>
    );
  }

  return null;
}

/**
 * Status Dot/Badge Indicator
 */
export function MobileCardStatusIndicator({
  status,
  label,
  pulse = false,
  className,
}: MobileCardStatusIndicatorProps) {
  const statusColors: Record<StatusType, { bg: string; dot: string; text: string }> = {
    success: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/20', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    error: { bg: 'bg-rose-50 dark:bg-rose-950/20', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' },
    info: { bg: 'bg-blue-50 dark:bg-blue-950/20', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
    neutral: { bg: 'bg-slate-100 dark:bg-zinc-800/60', dot: 'bg-slate-500', text: 'text-slate-700 dark:text-zinc-400' },
  };

  const currentColors = statusColors[status];

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', currentColors.bg, currentColors.text, className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', currentColors.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', currentColors.dot)} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}

/**
 * Header Section
 */
export function MobileCardHeader({
  title,
  subtitle,
  avatar,
  badge,
  actions,
  className,
  collapsible = false,
  isExpanded = true,
  onToggleExpand,
}: MobileCardHeaderProps) {
  const isBadgeObject = (b: any): b is { text: string; variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' } => {
    return b !== null && typeof b === 'object' && 'text' in b && !('$$typeof' in b);
  };

  return (
    <div className={cn('flex items-start justify-between gap-3 p-4 pb-3 border-b border-border/30', className)}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <MobileCardAvatar avatar={avatar} nameForFallback={typeof title === 'string' ? title : ''} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-50 leading-tight tracking-tight truncate">
              {title}
            </h3>
            {badge && (
              <div className="shrink-0">
                {!isBadgeObject(badge) ? (
                  badge
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border leading-none',
                      badge.variant === 'success' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
                      badge.variant === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
                      badge.variant === 'error' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40',
                      badge.variant === 'info' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40',
                      badge.variant === 'primary' && 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 dark:text-teal-400',
                      (badge.variant === 'secondary' || !badge.variant) && 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                    )}
                  >
                    {badge.text}
                  </span>
                )}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal leading-normal mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        {actions}
        {collapsible && onToggleExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Body Section
 */
export function MobileCardBody({ children, className }: MobileCardBodyProps) {
  return (
    <div className={cn('p-4 space-y-4 text-sm text-slate-700 dark:text-zinc-300', className)}>
      {children}
    </div>
  );
}

/**
 * Key-Value Grid layout
 */
export function MobileCardGrid({ items, cols = 2, className }: MobileCardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-y-3 gap-x-4 border-t border-b border-border/20 py-3.5 my-1',
        cols === 3 ? 'grid-cols-3' : 'grid-cols-2',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'flex flex-col gap-1 min-w-0',
            item.fullWidth ? 'col-span-full' : ''
          )}
        >
          <span className={cn('text-xs text-slate-400 dark:text-zinc-500 font-medium truncate', item.labelClassName)}>
            {item.label}
          </span>
          <div className={cn('text-sm text-slate-900 dark:text-slate-100 font-semibold truncate', item.valueClassName)}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Progress Bar Section
 */
export function MobileCardProgressBar({
  value,
  label,
  valueLabel,
  color = 'teal',
  showPulse = false,
  className,
}: MobileCardProgressBarProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  const progressColors: Record<Exclude<MobileCardProgressBarProps['color'], undefined>, string> = {
    teal: 'bg-emerald-500',
    red: 'bg-[#C21A1A]',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
  };

  const pulseBgColors: Record<Exclude<MobileCardProgressBarProps['color'], undefined>, string> = {
    teal: 'bg-emerald-400',
    red: 'bg-[#C21A1A]/80',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    amber: 'bg-amber-400',
    slate: 'bg-slate-300',
  };

  const currentColorClass = progressColors[color] || 'bg-emerald-500';
  const pulseColorClass = pulseBgColors[color] || 'bg-emerald-400';

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 dark:text-zinc-400 truncate">{label}</span>
          <span className="text-slate-900 dark:text-slate-200">
            {valueLabel ?? `${boundedValue}%`}
          </span>
        </div>
      )}
      <div className="relative w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${boundedValue}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full relative', currentColorClass)}
        >
          {showPulse && boundedValue > 0 && boundedValue < 100 && (
            <span className={cn('absolute inset-0 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent', pulseColorClass)} style={{ backgroundSize: '200% 100%' }} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Footer Section
 */
export function MobileCardFooter({ actions, layout = 'row', children, className }: MobileCardFooterProps) {
  const getButtonStyles = (variant?: FooterAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-[#C21A1A] hover:bg-[#A31414] active:bg-[#8A0F0F] text-white font-medium border-0';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium border-0';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border-0';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-600 dark:hover:bg-zinc-800 dark:text-zinc-300 border-0';
      case 'outline':
      default:
        return 'bg-transparent border border-border hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-200';
    }
  };

  return (
    <div className={cn('p-4 pt-2 border-t border-border/30', className)}>
      {actions && actions.length > 0 ? (
        <div
          className={cn(
            'w-full gap-2.5',
            layout === 'row' && 'flex items-center justify-end',
            layout === 'column' && 'flex flex-col',
            layout === 'grid' && 'grid grid-cols-2'
          )}
        >
          {actions.map((act, index) => (
            <button
              key={index}
              type="button"
              disabled={act.disabled}
              onClick={act.onClick}
              className={cn(
                'min-h-[44px] px-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all duration-200 font-semibold cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex-1 min-w-[70px]',
                getButtonStyles(act.variant)
              )}
            >
              {act.icon && <span className="shrink-0">{act.icon}</span>}
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ==========================================
// Core Unified Component
// ==========================================

export function MobileCard({
  variant = 'bordered',
  accentColor = 'none',
  accentPosition = 'none',
  interactive = false,
  activeScale = 0.98,
  delayIndex = 0,
  className,
  children,
  ...props
}: MobileCardProps) {
  const accentClass =
    accentPosition === 'left'
      ? ACCENT_LEFT_CLASSES[accentColor]
      : accentPosition === 'top'
      ? ACCENT_TOP_CLASSES[accentColor]
      : '';

  // Fade-in stagger effect
  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
        delay: delayIndex * 0.05,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={interactive ? { scale: activeScale } : undefined}
      whileHover={interactive ? { y: -2, transition: { duration: 0.15 } } : undefined}
      className={cn(
        'w-full rounded-xl overflow-hidden text-card-foreground transition-all duration-150',
        CARD_VARIANTS[variant],
        accentClass,
        interactive && 'cursor-pointer select-none',
        className
      )}
      {...props}
    >
      <div className="flex flex-col h-full w-full">{children}</div>
    </motion.div>
  );
}

// Attach sub-components to MobileCard for compound pattern access
MobileCard.Header = MobileCardHeader;
MobileCard.Avatar = MobileCardAvatar;
MobileCard.StatusIndicator = MobileCardStatusIndicator;
MobileCard.Body = MobileCardBody;
MobileCard.Grid = MobileCardGrid;
MobileCard.ProgressBar = MobileCardProgressBar;
MobileCard.Footer = MobileCardFooter;
