import { X, RefreshCw, History, User } from 'lucide-react';
import { Button } from '@shared/ui';
import type { CustomerSyncLog } from '../../../types/customer.types';
import { useEffect } from 'react';

interface CustomerSyncHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: CustomerSyncLog[];
  isLoading: boolean;
  onRefresh: () => void;
}

function formatTimestamp(isoString: string) {
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch (e) {
    return isoString;
  }
}

export default function CustomerSyncHistoryDrawer({
  isOpen,
  onClose,
  logs,
  isLoading,
  onRefresh,
}: CustomerSyncHistoryDrawerProps) {
  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 font-sans ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Dark Overlay with Blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div
        className={`relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-slate-100 transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Decorative Top Gradient Line */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-800 tracking-tight leading-none">
                Lịch sử đồng bộ Khách hàng
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-1.5">
                Nhật ký lưu trữ các đợt đồng bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Body - Scrollable Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-6 bg-slate-50/30">
          {isLoading && logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
              <span className="text-sm font-semibold">Đang tải lịch sử...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3.5 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-slate-100/80 border border-slate-200/40 flex items-center justify-center text-slate-350 shadow-inner">
                <History className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700">Chưa có lịch sử đồng bộ</h4>
                <p className="text-xs font-medium text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Hệ thống chưa ghi nhận lần đồng bộ khách hàng nào thành công trước đó.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Vertical line indicator */}
              <div className="absolute left-[33px] top-1.5 bottom-1.5 w-0.5 bg-slate-100" />

              <div className="space-y-6">
                {logs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <div key={log.id} className="relative group">
                      {/* Bullet marker */}
                      <div
                        className={`absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ring-4 transition-transform group-hover:scale-110 ${
                          isSuccess
                            ? 'bg-emerald-500 ring-emerald-50'
                            : 'bg-rose-500 ring-rose-50'
                        }`}
                      />

                      {/* Timestamp */}
                      <span className="text-xs font-extrabold text-slate-400 mb-1.5 block tracking-wide">
                        {formatTimestamp(log.timestamp)}
                      </span>

                      {/* Content Box */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-6xs transition-all duration-200 hover:border-slate-300 hover:shadow-5xs">
                        <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-3">
                          {log.errorDetails ? `Lỗi: ${log.errorDetails}` : log.summary || `Đã đồng bộ thành công ${log.totalSynced} khách hàng.`}
                        </p>

                        {/* Detail Statistics Badges */}
                        {isSuccess && (
                          <div className="grid grid-cols-1 gap-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none mb-1">
                                  Khách hàng (KiotViet → Local)
                                </span>
                                <div className="flex gap-1.5 text-xs font-extrabold justify-between">
                                  <span className="text-slate-655">Tổng cộng: {log.totalSynced}</span>
                                  <div className="flex gap-2">
                                    <span className="text-emerald-700">+{log.addedCount} mới</span>
                                    <span className="text-blue-700">~{log.updatedCount} sửa</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button
            variant="outline"
            className="rounded-xl h-9 text-sm font-bold border-slate-200/80 bg-white"
            onClick={onClose}
          >
            Đóng lại
          </Button>
        </div>
      </div>
    </div>
  );
}
