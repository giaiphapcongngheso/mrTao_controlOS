import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../lib/utils';
import type { IAuthEmployee } from '../types/auth.types';

export interface EmployeePickerDialogProps {
  open: boolean;
  employees: IAuthEmployee[];
  onSelect: (employeeId: string) => void;
  /** Hiển thị loading sau khi chọn */
  loading?: boolean;
}

/**
 * Dialog chọn nhân viên khi login vào hệ thống.
 * Hiển thị danh sách nhân viên liên kết với user để chọn 1 nhân viên.
 */
export function EmployeePickerDialog({
  open,
  employees,
  onSelect,
  loading = false,
}: EmployeePickerDialogProps) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleSelect = React.useCallback(
    (employeeId: string) => {
      setLoadingId(employeeId);
      onSelect(employeeId);
    },
    [onSelect],
  );

  // Tự động chọn nếu chỉ có 1 nhân viên
  React.useEffect(() => {
    if (open && employees.length === 1 && !loading) {
      handleSelect(employees[0].id);
    }
  }, [open, employees, loading, handleSelect]);

  // Không hiển thị dialog khi chỉ có 1 nhân viên (auto-select ngầm)
  if (employees.length === 1) {
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Chọn nhân viên</DialogTitle>
          <DialogDescription>
            Vui lòng chọn nhân viên để bắt đầu sử dụng hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
          {employees.map((emp) => {
            const isLoading = loading && loadingId === emp.id;
            return (
              <div
                key={emp.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-all',
                  isLoading ? 'border-primary bg-primary/5' : 'border-border',
                  loading && !isLoading && 'opacity-50',
                )}
              >
                {/* Avatar circle */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  {emp.fullName?.charAt(0)?.toUpperCase() ||
                    emp.code?.charAt(0)?.toUpperCase() ||
                    '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {emp.fullName || emp.code || 'N/A'}
                  </div>
                  {emp.code && (
                    <div className="text-xs text-muted-foreground">Mã NV: {emp.code}</div>
                  )}
                  {emp.organization?.name && (
                    <div className="text-xs text-muted-foreground truncate">
                      {emp.organization.name}
                    </div>
                  )}
                  {emp.position?.name && (
                    <div className="text-xs text-muted-foreground truncate">
                      {emp.position.name}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isLoading ? 'default' : 'outline'}
                  disabled={loading}
                  onClick={() => handleSelect(emp.id)}
                  className="shrink-0"
                >
                  {isLoading ? 'Đang chọn...' : 'Chọn'}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
