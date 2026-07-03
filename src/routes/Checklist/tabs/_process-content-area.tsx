import React from 'react';
import { ChevronDown, ChevronUp, Edit2, Layers, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, ScrollArea } from '../../../../share/ui';
import { DeleteConfirm } from '../../../../share/components/delete-confirm';
import type { ProcessDocument } from '../../../types/checklist.types';
import { cn } from '../../../../share/lib/utils';
import { getChecklistColorMeta, resolveChecklistIcon } from '../checklist-meta';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import { MobileCard, type CardAccentColor } from '../../../components/custom/mobile-card';

interface ProcessContentAreaProps {
  processes: ProcessDocument[];
  roleOptions: Array<{ code: string; name: string }>;
  isLoading?: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (process: ProcessDocument) => void;
  onDeleteProcess: (id: string) => Promise<void>;
  onResetFilters: () => void;
  onOpenDetail: (process: ProcessDocument) => void;
}

const mapCategoryColorToAccent = (colorKey?: string): CardAccentColor => {
  if (!colorKey) return 'none';
  const key = colorKey.toLowerCase();
  if (key.includes('red') || key.includes('rose') || key.includes('pink')) return 'red';
  if (key.includes('emerald') || key.includes('green')) return 'green';
  if (key.includes('teal')) return 'teal';
  if (key.includes('blue') || key.includes('indigo') || key.includes('sky')) return 'blue';
  if (key.includes('amber') || key.includes('orange') || key.includes('yellow')) return 'amber';
  if (key.includes('slate') || key.includes('gray')) return 'slate';
  return 'none';
};

const ProcessContentArea = React.memo(function ProcessContentArea({
  processes,
  roleOptions,
  isLoading = false,
  canCreate,
  canUpdate,
  canDelete,
  onOpenCreateDialog,
  onOpenEditDialog,
  onDeleteProcess,
  onResetFilters,
  onOpenDetail,
}: ProcessContentAreaProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<ProcessDocument | null>(null);
  const isMobile = useIsMobile();

  const handleDeleteClick = React.useCallback((process: ProcessDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(process);
  }, []);

  const handleEditClick = React.useCallback((process: ProcessDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenEditDialog(process);
  }, [onOpenEditDialog]);

  const handleOpenClick = React.useCallback((process: ProcessDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetail(process);
  }, [onOpenDetail]);

  return (
    <div className="w-full font-sans">
      <ScrollArea className="w-full h-auto lg:h-[calc(100dvh-230px)] pr-0 lg:pr-1" viewportClassName="w-full pr-0 sm:pr-2 [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full overflow-x-hidden">
        <div className="space-y-3 pb-4">
          {isLoading ? (
            <Card className="bg-white p-10 text-center rounded-2xl border border-slate-200 gap-3 py-10 shadow-none flex flex-col items-center justify-center">
              <span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
              <p className="text-sm font-semibold text-slate-500">Đang tải quy trình...</p>
            </Card>
          ) : processes.length === 0 ? (
            <Card className="bg-white p-14 text-center rounded-2xl border border-dashed border-slate-200 gap-3 py-14 shadow-none flex flex-col items-center justify-center">
              <Layers className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-500">Không có quy trình phù hợp bộ lọc</p>
                <p className="text-xs text-slate-400 mt-1">Thử đổi vai trò, tìm kiếm khác hoặc tạo quy trình mới.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onResetFilters} className="rounded-xl">
                  Đặt lại bộ lọc
                </Button>
                {canCreate && (
                  <Button type="button" size="sm" onClick={onOpenCreateDialog} className="rounded-xl bg-[#C21A1A] hover:bg-[#A81515]">
                    <Plus className="w-4 h-4 mr-1" />
                    Tạo quy trình
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            processes.map((process, index) => {
              const colorMeta = getChecklistColorMeta(process.colorKey || 'rose');
              const ProcessIcon = resolveChecklistIcon(process.iconName || 'Layers');
              const stepsCount = process.steps.length;
              const tasksCount = process.steps.reduce((total, step) => total + (step.tasks?.length || 0), 0);
              
              const handleCardClick = () => {
                onOpenDetail(process);
              };

              const handleOnDelete = (e: React.MouseEvent) => handleDeleteClick(process, e);
              const handleOnEdit = (e: React.MouseEvent) => handleEditClick(process, e);
              const handleOnOpen = (e: React.MouseEvent) => handleOpenClick(process, e);

              if (isMobile) {
                return (
                  <MobileCard
                    key={process.id}
                    variant="bordered"
                    interactive={true}
                    delayIndex={index}
                    onClick={handleCardClick}
                    accentColor={mapCategoryColorToAccent(process.colorKey)}
                  >
                    <MobileCard.Header
                      title={
                        <span className="text-slate-800 font-extrabold text-xs tracking-tight leading-normal font-sans block">
                          {process.title}
                        </span>
                      }
                      subtitle={
                        <span className="text-[10px] text-slate-400 font-bold font-sans block">
                          {roleOptions.find((r) => r.code.toUpperCase() === (process.roleCode || '').toUpperCase())?.name || process.roleCode}
                        </span>
                      }
                      avatar={
                        <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
                          <ProcessIcon className={cn("w-4.5 h-4.5", colorMeta.iconColor)} />
                        </span>
                      }
                      badge={
                        (process.status || 'active') === 'active'
                          ? { text: 'Đang dùng', variant: 'success' }
                          : { text: 'Tạm ẩn', variant: 'secondary' }
                      }
                    />

                    <MobileCard.Grid
                      items={[
                        { label: 'Số bước', value: `${stepsCount} bước` },
                        { label: 'Nhiệm vụ', value: `${tasksCount} nhiệm vụ` }
                      ]}
                    />

                    {process.description && (
                      <div className="px-4 pb-3 text-left">
                        <p className="text-[11px] font-bold text-slate-450 line-clamp-2 leading-relaxed">
                          {process.description}
                        </p>
                      </div>
                    )}

                    <MobileCard.Footer
                      actions={[
                        {
                          label: 'Mở chi tiết',
                          onClick: handleOnOpen,
                          variant: 'outline' as const,
                        },
                        ...(canUpdate ? [{
                          label: 'Sửa',
                          onClick: handleOnEdit,
                          variant: 'secondary' as const,
                          icon: <Edit2 className="w-3.5 h-3.5" />
                        }] : []),
                        ...(canDelete ? [{
                          label: 'Xóa',
                          onClick: handleOnDelete,
                          variant: 'danger' as const,
                          icon: <Trash2 className="w-3.5 h-3.5" />
                        }] : [])
                      ]}
                    />
                  </MobileCard>
                );
              }

              return (
                <Card
                  key={process.id}
                  onClick={handleCardClick}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-none gap-0 py-0 transition-all duration-200 hover:border-slate-300 hover:shadow-3xs cursor-pointer flex flex-col select-none text-left"
                >
                  <CardHeader className="p-3 sm:p-3.5 items-center flex-row justify-between w-full min-w-0 gap-2.5">
                    {/* Left Side: Icon + Title & Metadata */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
                        <ProcessIcon className={cn("w-4 h-4", colorMeta.iconColor)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CardTitle className="text-sm font-bold tracking-tight text-slate-800 truncate max-w-[220px]" title={process.title}>
                            {process.title}
                          </CardTitle>
                          <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-px rounded-full border leading-normal shrink-0", colorMeta.iconBg)}>
                            {roleOptions.find((r) => r.code.toUpperCase() === (process.roleCode || '').toUpperCase())?.name || process.roleCode}
                          </span>
                        </div>

                        <CardDescription className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>{stepsCount} bước</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                          <span>{tasksCount} nhiệm vụ</span>
                        </CardDescription>
                      </div>
                    </div>

                    {/* Right Side Actions */}
                    <CardAction className="flex items-center gap-1.5 shrink-0 self-center" onClick={(event) => event.stopPropagation()}>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border text-center select-none",
                          (process.status || 'active') === 'active'
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                            : "bg-slate-50 text-slate-400 border-slate-200/50"
                        )}
                      >
                        {(process.status || 'active') === 'active' ? 'Đang dùng' : 'Tạm ẩn'}
                      </span>

                      {canUpdate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          tooltip="Chỉnh sửa quy trình"
                          onClick={handleOnEdit}
                          className="w-7 h-7 rounded-lg bg-slate-50 border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 cursor-pointer active:scale-95"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          tooltip="Xóa quy trình"
                          onClick={handleOnDelete}
                          className="w-7 h-7 rounded-lg bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOnOpen}
                        className="h-7 px-3 text-[9px] font-black uppercase tracking-wider rounded-lg border-slate-200 text-slate-650 hover:text-slate-900 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all shadow-3xs"
                      >
                        Mở
                      </Button>
                    </CardAction>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <DeleteConfirm
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa quy trình"
        description={`Bạn có chắc chắn muốn xóa quy trình "${deleteTarget?.title || ''}"?`}
        confirmText="Xóa quy trình"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteProcess(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
});

export default ProcessContentArea;
