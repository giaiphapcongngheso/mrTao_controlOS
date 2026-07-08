import React, { useMemo, useState, useCallback } from 'react';
import { Clock, Square, CheckSquare, Paperclip, MoreVertical, Check, X, Edit2, Trash2, Award, Eye } from 'lucide-react';
import { Button, Textarea, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../share/ui';
import { cn } from '../../../../share/lib/utils';
import type { ChecklistItem } from '../../../types/checklist.types';
import type { ChecklistPermissions, ChecklistViewCategory } from '../checklist-view.types';
import { isItemLate, formatCheckedAt } from '../checklist-utils';
import { DatePicker } from '../../../../share/components/custom/date-picker';
import { ActionConfirmDialog } from '../../../../share/components/action-confirm-dialog';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import { MobileCard, type CardAccentColor } from '../../../components/custom/mobile-card';

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

const parseTimeToDate = (timeStr: string) => {
  if (!timeStr) return undefined;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
};

const formatDateToTime = (date: Date | undefined) => {
  if (!date) return '08:00';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

interface TaskEditState {
  editingItemId: string | null;
  editItemTitle: string;
  editItemTimeLimit: string;
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditItemTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditItemTimeLimit: React.Dispatch<React.SetStateAction<string>>;
  onInlineSave: (itemId: string, dateKey?: string) => Promise<void>;
}

interface ChecklistFlatTableProps {
  filteredCategories: ChecklistViewCategory[];
  permissions: ChecklistPermissions;
  onToggleItem: (itemId: string, dateKey?: string) => void;
  editState: TaskEditState;
  onDeleteItem: (itemId: string, dateKey?: string) => Promise<void>;
  onOpenDetail: (item: ChecklistItem) => void;
}

interface FlatTaskItem extends ChecklistItem {
  categoryTitle: string;
  categoryAccentHex?: string;
}

export const ChecklistFlatTable = React.memo(function ChecklistFlatTable({
  filteredCategories,
  permissions,
  onToggleItem,
  editState,
  onDeleteItem,
  onOpenDetail,
}: ChecklistFlatTableProps) {
  const [uncheckTarget, setUncheckTarget] = useState<{ id: string; title: string; timeLimit: string; dateKey?: string } | null>(null);
  const isMobile = useIsMobile();

  // Flatten tasks and sort by timeLimit chronologically
  const flatTasks = useMemo(() => {
    const tasks: FlatTaskItem[] = [];
    filteredCategories.forEach((cat) => {
      cat.tasks.forEach((task) => {
        tasks.push({
          ...task,
          categoryTitle: cat.title,
          categoryAccentHex: cat.meta?.accentHex,
        });
      });
    });

    return tasks.sort((a, b) => {
      const timeA = a.timeLimit || '23:59';
      const timeB = b.timeLimit || '23:59';
      return timeA.localeCompare(timeB);
    });
  }, [filteredCategories]);

  const handleRowClick = useCallback((item: FlatTaskItem) => {
    const isCurrentlyEditing = editState.editingItemId === item.id;
    if (isCurrentlyEditing) return;

    if (item.isCompleted) {
      // Single click to uncheck (toggle back from completed)
      const tempItem = { ...item, isCompleted: false, checkedAt: undefined };
      const isLateAfterUncheck = isItemLate(tempItem);

      if (isLateAfterUncheck) {
        setUncheckTarget({
          id: item.id,
          title: item.title,
          timeLimit: item.timeLimit || '',
          dateKey: item.dateKey,
        });
      } else {
        onToggleItem(item.id, item.dateKey);
      }
    } else {
      // Single click to check completed
      onToggleItem(item.id, item.dateKey);
    }
  }, [editState.editingItemId, onToggleItem, setUncheckTarget]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editState.setEditItemTitle(e.target.value);
    e.target.style.height = '34px';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }, [editState.setEditItemTitle]);

  const handleDatePickerChange = useCallback((date: Date | undefined) => {
    editState.setEditItemTimeLimit(formatDateToTime(date));
  }, [editState.setEditItemTimeLimit]);

  const handleSaveClick = useCallback((itemId: string, dateKey: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    void editState.onInlineSave(itemId, dateKey);
  }, [editState.onInlineSave]);

  const handleCancelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    editState.setEditingItemId(null);
  }, [editState.setEditingItemId]);

  const triggerInlineEdit = useCallback((item: FlatTaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    editState.setEditItemTitle(item.title);
    editState.setEditItemTimeLimit(item.timeLimit || '08:00');
    editState.setEditingItemId(item.id);
  }, [editState]);

  const handleDeleteClick = useCallback((itemId: string, dateKey: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa đầu việc này?')) {
      void onDeleteItem(itemId, dateKey);
    }
  }, [onDeleteItem]);

  if (isMobile) {
    return (
      <div className="space-y-3 font-sans pb-4">
        {flatTasks.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 gap-3 py-10 shadow-none flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-slate-500 italic">
              Hôm nay không có công việc nào cần hoàn thành.
            </p>
          </div>
        ) : (
          flatTasks.map((item, index) => {
            const isLate = isItemLate(item);
            const isEditing = editState.editingItemId === item.id;
            const hasImages = (item.imageUrls || []).length > 0;

            if (isEditing) {
              return (
                <div
                  key={item.id}
                  className="bg-slate-50/75 p-4 rounded-2xl border border-slate-200 space-y-3 text-left animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tên đầu việc</span>
                    <Textarea
                      rows={2}
                      value={editState.editItemTitle}
                      onChange={handleTitleChange}
                      placeholder="Nhập tên đầu việc..."
                      className="font-sans w-full min-h-[50px] py-1.5 resize-none overflow-hidden text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Giờ chốt</span>
                      <DatePicker
                        value={parseTimeToDate(editState.editItemTimeLimit)}
                        onChange={handleDatePickerChange}
                        timeOnly={true}
                        clearable={false}
                        size="sm"
                      />
                    </div>
                    <div className="flex gap-2 items-end pt-5 shrink-0">
                      <Button
                        type="button"
                        onClick={(e) => handleSaveClick(item.id, item.dateKey, e)}
                        className="h-8 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 border-none text-xs font-extrabold"
                      >
                        Lưu
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelClick}
                        className="h-8 px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 border-none text-xs font-extrabold"
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <MobileCard
                key={item.id}
                variant="bordered"
                interactive={true}
                delayIndex={index}
                onClick={() => onOpenDetail(item)}
                accentColor={mapCategoryColorToAccent(item.categoryAccentHex)}
              >
                <MobileCard.Header
                  title={
                    <span className={cn(
                      "text-slate-800 font-extrabold text-xs tracking-tight leading-normal font-sans block",
                      item.isCompleted && "line-through text-slate-400"
                    )}>
                      {item.title}
                    </span>
                  }
                  subtitle={
                    <span className="text-[10px] text-slate-400 font-bold font-sans block">
                      {item.categoryTitle}
                    </span>
                  }
                  avatar={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(item);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-90"
                    >
                      {item.isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square
                          className={cn(
                            "w-5 h-5 shrink-0 transition-colors",
                            isLate ? "text-rose-500" : "text-slate-350"
                          )}
                        />
                      )}
                    </button>
                  }
                  badge={
                    item.isCompleted
                      ? { text: 'Đã xong', variant: 'success' }
                      : isLate
                      ? { text: 'Quá hạn', variant: 'error' }
                      : { text: 'Chưa làm', variant: 'secondary' }
                  }
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          className="w-7 h-7 p-0 hover:bg-slate-100 rounded-lg flex items-center justify-center shrink-0 cursor-pointer active:scale-95 border-none"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 font-sans" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => onOpenDetail(item)}
                          className="text-slate-600 cursor-pointer gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Chi tiết & bằng chứng</span>
                        </DropdownMenuItem>

                        {!item.isCompleted && (
                          <DropdownMenuItem
                            onClick={(e) => triggerInlineEdit(item, e)}
                            className="text-slate-600 cursor-pointer gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenuItem>
                        )}

                        {permissions.canDelete && (
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(item.id, item.dateKey, e)}
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Xóa đầu việc</span>
                          </DropdownMenuItem>
                        )}

                        {item.isCompleted && (
                          <>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <div className="p-2 text-[10px] text-slate-400 text-left space-y-0.5 select-none">
                              <div className="font-extrabold text-slate-500 flex items-center gap-1 text-[9px]">
                                <Award className="w-3.5 h-3.5 text-emerald-555 shrink-0" />
                                <span>Hoàn thành</span>
                              </div>
                              <p className="truncate">Bởi: {item.checkedByName || 'Hệ thống'}</p>
                              {item.checkedAt && (
                                <p className="truncate">Lúc: {formatCheckedAt(item.checkedAt)}</p>
                              )}
                            </div>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />

                <MobileCard.Grid
                  items={[
                    ...(item.timeLimit
                      ? [
                          {
                            label: 'Giờ chốt',
                            value: (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {item.timeLimit}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    ...(item.isCompleted && item.checkedByName
                      ? [
                          {
                            label: 'Người làm',
                            value: (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-650 bg-slate-50 border border-slate-100 rounded px-1.5 py-px max-w-[110px] truncate">
                                {item.checkedByName}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    {
                      label: 'Minh chứng',
                      value: (
                        <span className={cn(
                          "flex items-center gap-1 text-[11px] font-black border rounded px-1.5 py-px w-fit transition-all",
                          hasImages
                            ? "bg-blue-50 border-blue-200 text-blue-600"
                            : "bg-slate-50 border-slate-200/60 text-slate-400"
                        )}>
                          <Paperclip className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{(item.imageUrls || []).length}</span>
                        </span>
                      ),
                    },
                  ]}
                />

                <MobileCard.Footer className="!py-2 !px-3.5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 h-7 flex items-center">
                    Bấm thẻ để xem chi tiết
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!item.isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 cursor-pointer rounded-lg border-none"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          triggerInlineEdit(item, e);
                        }}
                      >
                        <Edit2 className="size-3.5" />
                        <span>Sửa nhanh</span>
                      </Button>
                    )}
                  </div>
                </MobileCard.Footer>
              </MobileCard>
            );
          })
        )}

        {/* Confirmation for unchecking late items */}
        <ActionConfirmDialog
          open={uncheckTarget !== null}
          onOpenChange={(open) => {
            if (!open) setUncheckTarget(null);
          }}
          title="Bỏ hoàn thành công việc trễ hạn"
          description={`Bỏ hoàn thành công việc "${uncheckTarget?.title || ''}" lúc này sẽ làm nó bị TRỄ HẠN do thời gian hiện tại đã quá giờ quy định (${uncheckTarget?.timeLimit || ''}). Bạn có chắc chắn muốn bỏ hoàn thành?`}
          onConfirm={() => {
            if (uncheckTarget) {
              onToggleItem(uncheckTarget.id, uncheckTarget.dateKey);
            }
            setUncheckTarget(null);
          }}
          variant="confirm"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden font-sans">
      <Table className="w-full">
        <TableHeader className="bg-slate-50 select-none">
          <TableRow className="border-b border-slate-100 hover:bg-transparent">
            <TableHead className="w-[8%] text-center text-sm !font-semibold !bg-slate-50 !text-slate-800">Chọn</TableHead>
            <TableHead className="w-[12%] text-left text-sm !font-semibold !bg-slate-50 !text-slate-800">Giờ chốt</TableHead>
            <TableHead className="w-[40%] text-left text-sm !font-semibold !bg-slate-50 !text-slate-800">Việc cần làm</TableHead>
            <TableHead className="w-[18%] text-left text-sm !font-semibold !bg-slate-50 !text-slate-800">Người thực hiện</TableHead>
            <TableHead className="w-[10%] text-center text-sm !font-semibold !bg-slate-50 !text-slate-800">Minh chứng</TableHead>
            <TableHead className="w-[10%] text-center text-sm !font-semibold !bg-slate-50 !text-slate-800">Trạng thái</TableHead>
            <TableHead className="w-[2%] text-center !bg-slate-50 !text-slate-800"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-sm text-slate-400 font-medium italic">
                Hôm nay không có công việc nào cần hoàn thành.
              </TableCell>
            </TableRow>
          ) : (
            flatTasks.map((item) => {
              const isLate = isItemLate(item);
              const isEditing = editState.editingItemId === item.id;
              const hasImages = (item.imageUrls || []).length > 0;

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "border-b border-slate-100/80 transition-colors duration-150 group/row",
                    isEditing ? "bg-slate-50/70" : "hover:bg-slate-50/40"
                  )}
                >
                  {/* Column 1: Checkbox */}
                  <TableCell
                    className="text-center py-3 cursor-pointer hover:bg-slate-150/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(item);
                    }}
                  >
                    <span className="inline-flex justify-center items-center pointer-events-none">
                      {item.isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square
                          className={cn(
                            "w-5 h-5 shrink-0 transition-colors",
                            isLate ? "text-rose-400" : "text-slate-300 group-hover/row:text-slate-400"
                          )}
                        />
                      )}
                    </span>
                  </TableCell>

                  {/* Column 2: Hour limit */}
                  <TableCell className="py-3 font-semibold text-xs tabular-nums text-left">
                    {isEditing ? (
                      <div className="w-24 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <DatePicker
                          value={parseTimeToDate(editState.editItemTimeLimit)}
                          onChange={handleDatePickerChange}
                          timeOnly={true}
                          clearable={false}
                          size="sm"
                        />
                      </div>
                    ) : (
                      item.timeLimit && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border",
                            isLate
                              ? "bg-rose-50 text-rose-600 border-rose-100/50"
                              : item.isCompleted
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                                : "bg-slate-50 text-slate-500 border-slate-100"
                          )}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{item.timeLimit}</span>
                        </span>
                      )
                    )}
                  </TableCell>

                  {/* Column 3: Task Title */}
                  <TableCell
                    className="py-3 text-left cursor-pointer max-w-[450px] min-w-[200px] whitespace-normal break-words"
                    onClick={(e) => {
                      if (!isEditing) {
                        e.stopPropagation();
                        handleRowClick(item);
                      }
                    }}
                  >
                    {isEditing ? (
                      <div className="flex items-start gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                        <Textarea
                          rows={1}
                          value={editState.editItemTitle}
                          onChange={handleTitleChange}
                          ref={(el) => {
                            if (el) {
                              el.style.height = '34px';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          placeholder="Nhập tên đầu việc..."
                          className="font-sans flex-1 min-w-0 h-[34px] min-h-[34px] py-1.5 resize-none overflow-hidden text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 focus:outline-none focus:border-slate-500 leading-normal"
                        />
                        <div className="flex gap-1 shrink-0 items-center">
                          <Button
                            type="button"
                            onClick={(e) => handleSaveClick(item.id, item.dateKey, e)}
                            className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 border-none"
                            title="Lưu"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </Button>
                          <Button
                            type="button"
                            onClick={handleCancelClick}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95 border-none"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap max-w-full">
                        <span
                          className={cn(
                            "text-xs leading-normal break-words font-semibold",
                            item.isCompleted ? "text-slate-400 line-through" : "text-slate-700"
                          )}
                        >
                          {item.title}
                        </span>
                        {/* Category badge tag */}
                        {item.categoryTitle && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded border font-extrabold  shrink-0 transition-opacity"
                            style={{
                              borderColor: item.categoryAccentHex ? `${item.categoryAccentHex}30` : '#e2e8f0',
                              color: item.categoryAccentHex || '#64748b',
                              backgroundColor: item.categoryAccentHex ? `${item.categoryAccentHex}08` : '#f8fafc',
                            }}
                          >
                            {item.categoryTitle}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Column 4: Performer */}
                  <TableCell className="py-3 text-left">
                    {item.isCompleted && item.checkedByName ? (
                      <div className="inline-flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-100/80 px-2 py-0.5 rounded-lg select-none">
                        <span className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center text-[9px] font-black  shrink-0">
                          {item.checkedByName.trim().charAt(0)}
                        </span>
                        <span className="text-sm font-extrabold text-slate-500 truncate max-w-[110px]" title={item.checkedByName}>
                          {item.checkedByName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-300 select-none">--</span>
                    )}
                  </TableCell>

                  {/* Column 5: Evidence attachment */}
                  <TableCell className="py-3 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(item);
                      }}
                      className={cn(
                        "inline-flex h-7 items-center justify-center transition-all duration-200 cursor-pointer border rounded-lg gap-1 px-2 w-auto shadow-2xs select-none active:scale-95",
                        hasImages
                          ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100/70"
                          : "bg-slate-50 border-slate-200/60 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                      tooltip="Bằng chứng & Chi tiết"
                    >
                      <Paperclip className="w-3 h-3 stroke-[2.5]" />
                      <span className="text-[9px] font-black">{(item.imageUrls || []).length}</span>
                    </Button>
                  </TableCell>

                  {/* Column 6: Status Badge */}
                  <TableCell className="py-3 text-center">
                    <span
                      className={cn(
                        "text-[9px] font-black  tracking-wider px-2 py-0.5 rounded-lg text-center inline-block min-w-[65px] select-none border",
                        item.isCompleted
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                          : isLate
                            ? "bg-rose-50 text-rose-600 border-rose-100/50 animate-pulse"
                            : "bg-slate-50 text-slate-400 border-slate-200/30"
                      )}
                    >
                      {item.isCompleted ? 'Đã xong' : isLate ? 'Quá hạn' : 'Chưa làm'}
                    </span>
                  </TableCell>

                  {/* Column 7: Action Menu 3-dots */}
                  <TableCell className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-7 h-7 p-0 hover:bg-slate-100 rounded-lg flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 font-sans">
                        <DropdownMenuItem
                          onClick={() => onOpenDetail(item)}
                          className="text-slate-600 cursor-pointer gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Bằng chứng & Chi tiết</span>
                        </DropdownMenuItem>

                        {!item.isCompleted && (
                          <DropdownMenuItem
                            onClick={(e) => triggerInlineEdit(item, e)}
                            className="text-slate-600 cursor-pointer gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Chỉnh sửa</span>
                          </DropdownMenuItem>
                        )}

                        {permissions.canDelete && (
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(item.id, item.dateKey, e)}
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Xóa đầu việc</span>
                          </DropdownMenuItem>
                        )}

                        {item.isCompleted && (
                          <>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <div className="p-2 text-sm text-slate-400 text-left space-y-0.5">
                              <div className="font-extrabold text-slate-500  flex items-center gap-1 text-[9px]">
                                <Award className="w-3 h-3 text-emerald-500" />
                                <span>Hoàn thành</span>
                              </div>
                              <p className="truncate">Bởi: {item.checkedByName || 'Hệ thống'}</p>
                              {item.checkedAt && (
                                <p className="truncate">Lúc: {formatCheckedAt(item.checkedAt)}</p>
                              )}
                            </div>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Confirmation for unchecking late items */}
      <ActionConfirmDialog
        open={uncheckTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUncheckTarget(null);
        }}
        title="Bỏ hoàn thành công việc trễ hạn"
        description={`Bỏ hoàn thành công việc "${uncheckTarget?.title || ''}" lúc này sẽ làm nó bị TRỄ HẠN do thời gian hiện tại đã quá giờ quy định (${uncheckTarget?.timeLimit || ''}). Bạn có chắc chắn muốn bỏ hoàn thành?`}
        onConfirm={() => {
          if (uncheckTarget) {
            onToggleItem(uncheckTarget.id, uncheckTarget.dateKey);
          }
          setUncheckTarget(null);
        }}
        variant="confirm"
      />
    </div>
  );
});
