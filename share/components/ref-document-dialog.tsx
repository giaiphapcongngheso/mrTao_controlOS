import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { WorkItemStatusBadge } from './work-item-status-badge';
import { hasPermission, PermissionAction } from '../permission/permission-util';
import type { IWorkItem } from '../types';
import type { IWorkItemCategory } from '../types';

function getLocalizedText(data: unknown, lang: string): string {
  if (!data) return '-';
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return data;
    }
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj[lang] === 'string') return String(obj[lang]);
    if (typeof obj['vi'] === 'string') return String(obj['vi']);
    if (typeof obj['en'] === 'string') return String(obj['en']);
    if (obj.name) return getLocalizedText(obj.name, lang);
    const firstStr = Object.values(obj).find((v) => typeof v === 'string');
    return firstStr ? String(firstStr) : '-';
  }
  return typeof parsed === 'object' ? '-' : String(parsed);
}

export interface RefDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refType: IWorkItemCategory;
  refDoc?: IWorkItem | null;
  refDocNum?: string;
  refDetailUrl?: string;
  permissionModule?: string;
  isLoading?: boolean;
  isError?: boolean;
}

export function RefDocumentDialog({
  open,
  onOpenChange,
  refType,
  refDoc,
  refDocNum,
  refDetailUrl,
  permissionModule,
  isLoading,
  isError,
}: RefDocumentDialogProps) {
  const handleViewDetail = () => {
    if (!refDetailUrl) {
      toast.warning('Chưa cấu hình đường dẫn xem chi tiết cho phiếu này');
      return;
    }
    if (permissionModule && !hasPermission(permissionModule, PermissionAction.View)) {
      toast.error('Bạn không có quyền xem phiếu này');
      return;
    }
    onOpenChange(false);
    requestAnimationFrame(() => {
      window.open(refDetailUrl, '_blank');
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 pt-5 pb-4 border-b">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base">Thông tin phiếu đầu vào</DialogTitle>
            <DialogDescription className="text-xs">
              Chi tiết phiếu đầu vào với phiếu hiện tại
            </DialogDescription>
          </DialogHeader>
          {/* Ref badges */}
          <div className="flex items-center gap-3 mt-3">
            <div className="rounded-md bg-white border px-3 py-2 flex-1 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Ref type
              </p>
              <p className="text-sm font-semibold">{refType.shortName || refType.name}</p>
            </div>
            <div className="rounded-md bg-white border px-3 py-2 flex-1 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Ref doc num
              </p>
              <p className="text-sm font-semibold text-primary">
                {isLoading ? 'Đang tải...' : refDoc?.code || refDocNum || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Đang tải thông tin...</p>
            </div>
          ) : isError || !refDoc ? (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-500 border border-amber-100">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="space-y-1 px-4">
                <p className="text-sm text-amber-700 font-medium">
                  Phiếu này không thuộc quy trình phê duyệt hoặc không có thông tin nhanh.
                </p>
                <p className="text-xs text-muted-foreground">
                  Vui lòng nhấn nút "Xem chi tiết" phía dưới để mở tài liệu trong tab mới.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Section: Thông tin phiếu */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Thông tin
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {refDoc.name && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-muted-foreground">Tên phiếu</p>
                      <p className="text-sm font-medium truncate">{refDoc.name}</p>
                    </div>
                  )}
                  {refDoc.currentStep && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">Bước hiện tại</p>
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {getLocalizedText(refDoc.currentStep.name, 'vi')}
                        </p>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              refDoc.currentStep.workItemStatus?.color ||
                              refDoc.workItemStatus?.color ||
                              '#16a34a',
                          }}
                        >
                          {refDoc.currentStep.customStatusLabel
                            ? getLocalizedText(refDoc.currentStep.customStatusLabel, 'vi')
                            : 'Chờ xử lý'}
                        </span>
                      </div>
                    </div>
                  )}
                  {refDoc.workItemStatus && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Trạng thái tổng</p>
                      <WorkItemStatusBadge
                        status={{
                          name: refDoc.workItemStatus.name,
                          color: refDoc.workItemStatus.color,
                          icon: refDoc.workItemStatus.icon,
                        }}
                        variant="badge"
                        defaultLabel="Chờ xử lý"
                      />
                    </div>
                  )}
                  {refDoc.description && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-muted-foreground">Mô tả</p>
                      <p className="text-sm text-foreground/80">{refDoc.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t" />

              {/* Section: Lịch sử */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Lịch sử
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {refDoc.createdByUser && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">Người tạo</p>
                      <p className="text-sm font-medium">{refDoc.createdByUser}</p>
                    </div>
                  )}
                  {refDoc.createdDate && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">Ngày tạo</p>
                      <p className="text-sm font-medium">
                        {format(new Date(refDoc.createdDate), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                  {refDoc.modifiedByUser && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">Người cập nhật</p>
                      <p className="text-sm font-medium">{refDoc.modifiedByUser}</p>
                    </div>
                  )}
                  {refDoc.lastModifiedDate && (
                    <div>
                      <p className="text-[11px] text-muted-foreground">Cập nhật lần cuối</p>
                      <p className="text-sm font-medium">
                        {format(new Date(refDoc.lastModifiedDate), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button size="sm" onClick={handleViewDetail} disabled={!refDetailUrl}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Xem chi tiết
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
