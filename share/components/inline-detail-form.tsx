import { cn } from '../lib';
import { Button, Label } from '../ui';
import type { ReactNode } from 'react';

export interface InlineDetailFormField {
  /** Unique key for the field */
  key: string;
  /** Label displayed above the field */
  label: string;
  /** Whether the field is required (shows red asterisk) */
  required?: boolean;
  /** The rendered input/control element */
  render: () => ReactNode;
  /** Optional column span (e.g. 2 to span 2 cols) */
  colSpan?: number;
  /** Optional error message to display below the field */
  error?: string;
  /** When true, the field is not rendered at all */
  hidden?: boolean;
}

export interface InlineDetailFormProps {
  /** Whether the form is visible */
  open: boolean;
  /** Title shown at the top (e.g. "Thêm mới chi tiết" or "Chỉnh sửa dòng 3") */
  title: string;
  /** Array of field definitions to render in the grid */
  fields: InlineDetailFormField[];
  /** Label for the save/submit button */
  saveLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Called when save is clicked */
  onSave: () => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
  /** Additional className for the container */
  className?: string;
  /** Number of grid columns at xl breakpoint, default 4 */
  gridCols?: number;
}

export function InlineDetailForm({
  open,
  title,
  fields,
  saveLabel = 'Lưu',
  cancelLabel = 'Hủy',
  onSave,
  onCancel,
  className,
  gridCols = 4,
}: Readonly<InlineDetailFormProps>) {
  if (!open) return null;

  const gridClass =
    gridCols === 3
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      : gridCols === 2
        ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  return (
    <div className={cn('mt-4 p-4 rounded-lg bg-muted', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="default" size="sm" onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </div>
      <div className={gridClass}>
        {fields
          .filter((f) => !f.hidden)
          .map((field) => (
            <div
              key={field.key}
              className="space-y-1.5"
              style={field.colSpan ? { gridColumn: `span ${field.colSpan}` } : undefined}
            >
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {field.render()}
              {field.error && (
                <p className="text-[0.8rem] font-medium text-destructive">{field.error}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
