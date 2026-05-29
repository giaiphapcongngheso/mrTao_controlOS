import * as React from 'react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ActionItem {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
  tooltip?: string;
  element?: React.ReactNode;
  onClick?: () => void | Promise<void>;
}

export interface ActionStackProps {
  /**
   * Array of action configurations
   */
  actions: ActionItem[];

  /**
   * Maximum number of actions to show before creating dropdown
   * @default 3
   */
  maxVisible?: number;

  /**
   * Size of the buttons
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';

  /**
   * Layout direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical';

  /**
   * Gap between action items
   * @default 2
   */
  gap?: number;

  /**
   * Whether to show tooltips for all actions
   * @default false
   */
  showTooltips?: boolean;

  /**
   * Show only icons without labels
   * @default false
   */
  iconOnly?: boolean;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Loading state for the entire stack
   * @default false
   */
  loading?: boolean;

  /**
   * Disabled state for the entire stack
   * @default false
   */
  disabled?: boolean;

  /**
   * Dropdown alignment
   * @default 'end'
   */
  dropdownAlign?: 'start' | 'center' | 'end';
}

export const ActionStack: React.FC<ActionStackProps> = ({
  actions = [],
  maxVisible = 3,
  size = 'default',
  direction = 'horizontal',
  gap = 2,
  showTooltips = false,
  iconOnly = false,
  className,
  loading = false,
  disabled = false,
  dropdownAlign = 'end',
}) => {
  // Filter visible actions
  const visibleActions = (actions ?? []).filter((action) => !action.hidden);

  // Split actions into visible and dropdown
  const primaryActions = visibleActions.slice(0, maxVisible);
  const dropdownActions = visibleActions.slice(maxVisible);

  // Handle action click
  const handleActionClick = async (action: ActionItem) => {
    if (action.disabled || disabled || loading) return;

    try {
      await action.onClick?.();
    } catch (error) {
      console.error(`Error executing action ${action.key}:`, error);
    }
  };

  // Render individual action button
  const renderActionButton = (action: ActionItem) => {
    let button: React.ReactNode = (
      <Button
        key={action.key}
        size={iconOnly ? 'icon' : size}
        variant={action.variant || 'default'}
        disabled={action.disabled || disabled || loading}
        onClick={() => handleActionClick(action)}
      >
        {action.icon}
        {!iconOnly && <span>{action.label}</span>}
      </Button>
    );

    if (action?.element) {
      button = action.element;
    }

    // Show tooltip when iconOnly is true, or when explicitly requested
    if (iconOnly || showTooltips || action.tooltip) {
      const tooltipTitle = action.tooltip || action.label;
      return (
        <Tooltip key={action.key}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipTitle}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  // No actions to render
  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center',
          direction === 'vertical' ? 'flex-col' : 'flex-row',
          className,
        )}
        style={{ gap: `${gap * 0.25}rem` }}
      >
        {/* Primary action buttons */}
        {primaryActions.map(renderActionButton)}

        {/* Dropdown for additional actions */}
        {dropdownActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={iconOnly ? 'icon' : size}
                variant="ghost"
                disabled={disabled || loading}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dropdownAlign}>
              {dropdownActions.map((action) => (
                <DropdownMenuItem
                  key={action.key}
                  disabled={action.disabled || disabled || loading}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    action.variant === 'destructive' && 'text-destructive focus:text-destructive',
                  )}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
};
