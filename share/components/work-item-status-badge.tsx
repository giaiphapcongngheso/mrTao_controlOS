import React from 'react';
import { hexToRgba } from '../lib';
import { Badge } from '../ui';
import * as LucideIcons from 'lucide-react';

interface WorkItemStatusBadgeProps {
  readonly status?: {
    readonly name?: string;
    readonly color?: string;
    readonly icon?: string;
  };
  readonly defaultLabel?: string;
  readonly variant?: 'badge' | 'div';
  readonly className?: string;
  readonly icon?: React.ReactNode;
}

export function WorkItemStatusBadge({
  status,
  defaultLabel = '',
  variant = 'div',
  className,
  icon,
}: WorkItemStatusBadgeProps) {
  if (!status?.color) {
    const label = status?.name || defaultLabel;
    return variant === 'badge' ? (
      <Badge className={`flex items-center gap-1.5 ${className || ''}`}>
        {icon}
        <span>{label}</span>
      </Badge>
    ) : (
      <div className={`flex items-center gap-1.5 ${className || ''}`}>
        {icon}
        <span>{label}</span>
      </div>
    );
  }

  const badgeStyle = {
    color: status.color,
    backgroundColor: hexToRgba(status.color, 0.1),
    borderColor: variant === 'badge' ? status.color : undefined,
  };

  const IconComponent = status?.icon
    ? (LucideIcons as any)[status.icon] || LucideIcons.FileText
    : null;

  const IconRender =
    icon ||
    (IconComponent ? (
      <IconComponent className="w-3.5 h-3.5" style={{ color: status.color, flexShrink: 0 }} />
    ) : (
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: status.color,
        }}
      />
    ));

  if (variant === 'badge') {
    return (
      <Badge
        className={`relative border rounded px-2 flex items-center gap-1.5 font-normal ${className || ''}`}
        style={badgeStyle}
      >
        {IconRender}
        <span className="truncate">{status.name || defaultLabel}</span>
      </Badge>
    );
  }

  return (
    <div
      className={`relative border rounded px-2 py-0.5 w-fit flex items-center gap-1.5 ${className || ''}`}
      style={badgeStyle}
    >
      {IconRender}
      <span className="truncate">{status.name || defaultLabel}</span>
    </div>
  );
}
