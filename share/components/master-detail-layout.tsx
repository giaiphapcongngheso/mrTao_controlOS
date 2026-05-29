import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { cn } from '../lib';
import { Button } from '../ui';

export interface MasterDetailLayoutProps {
  readonly className?: string;
  /** Phần header phía trên (thanh search / filter / actions ...) */
  readonly header: React.ReactNode;
  /** Bảng danh sách (ở giữa) */
  readonly main: React.ReactNode;
  /** Bảng chi tiết (phía dưới) */
  readonly detail?: React.ReactNode;
  /** Tỷ lệ chiều cao phần giữa so với vùng bảng (0 – 1) */
  readonly initialMainRatio?: number;
  /** Tối thiểu chiều cao px cho mỗi bảng */
  readonly minPanelHeight?: number;
}

const DIVIDER_HEIGHT = 10;
const DEFAULT_MIN_PANEL_HEIGHT = 140;

export function MasterDetailLayout({
  className,
  header,
  main,
  detail,
  initialMainRatio = 0.6,
  minPanelHeight = DEFAULT_MIN_PANEL_HEIGHT,
}: MasterDetailLayoutProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<{
    startY: number;
    totalHeight: number;
    startMainHeight: number;
  } | null>(null);

  const [containerHeight, setContainerHeight] = React.useState<number | null>(null);
  const [mainHeight, setMainHeight] = React.useState<number | null>(null);
  const [isDetailVisible, setIsDetailVisible] = React.useState(!!detail);

  // Tính chiều cao khả dụng theo viewport và khởi tạo mainHeight theo tỷ lệ
  React.useLayoutEffect(() => {
    if (globalThis.window === undefined) return;

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const available = globalThis.window.innerHeight - rect.top;
    if (available <= 0) {
      return;
    }

    setContainerHeight(available);
    if (mainHeight !== null) {
      return;
    }

    const initialMain = Math.max(
      minPanelHeight,
      Math.min(available - minPanelHeight - DIVIDER_HEIGHT, available * initialMainRatio),
    );
    setMainHeight(initialMain);
  }, [initialMainRatio, minPanelHeight, mainHeight]);

  // Cập nhật lại khi resize cửa sổ
  React.useLayoutEffect(() => {
    if (globalThis.window === undefined) return;
    const handleResize = () => {
      setMainHeight(null);
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const available = globalThis.window.innerHeight - rect.top;
      if (available > 0) {
        setContainerHeight(available);
      }
    };

    globalThis.window.addEventListener('resize', handleResize);
    return () => globalThis.window.removeEventListener('resize', handleResize);
  }, []);

  const handleDividerMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const totalHeight = el.clientHeight;
    if (!totalHeight) return;

    const currentMainHeight =
      mainHeight ??
      Math.max(
        minPanelHeight,
        Math.min(totalHeight - minPanelHeight - DIVIDER_HEIGHT, totalHeight * initialMainRatio),
      );

    dragStateRef.current = {
      startY: e.clientY,
      totalHeight,
      startMainHeight: currentMainHeight,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const delta = moveEvent.clientY - state.startY;
      let nextMain = state.startMainHeight + delta;

      const maxMain = state.totalHeight - minPanelHeight - DIVIDER_HEIGHT;
      const minMain = minPanelHeight;

      if (maxMain <= minMain) return;

      nextMain = Math.max(minMain, Math.min(maxMain, nextMain));
      setMainHeight(nextMain);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleDetail = () => {
    setIsDetailVisible((prev) => !prev);
  };

  return (
    <div className={cn('flex h-full min-h-0 min-w-0 flex-col gap-3', className)}>
      {/* Header */}
      <div className="shrink-0">{header}</div>

      {/* Khu vực bảng (giữa + dưới) */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 flex-col rounded-xl  bg-transparent "
        style={containerHeight === null ? undefined : { height: containerHeight }}
      >
        {/* Bảng chính */}
        <div
          className="min-h-[120px] min-w-0 flex flex-col overflow-hidden"
          style={
            mainHeight != null && isDetailVisible ? { height: mainHeight } : { flex: '1 1 0%' }
          }
        >
          {main}
        </div>

        {/* Divider (ẩn border, chỉ hiện khi hover) */}
        {detail && (
          <div className="relative flex h-[10px] items-center justify-center  group">
            <button
              type="button"
              aria-label="Điều chỉnh chiều cao bảng chi tiết"
              className="absolute inset-0 w-full cursor-row-resize border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onMouseDown={isDetailVisible ? handleDividerMouseDown : undefined}
            >
              <span className="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="relative z-10 h-5 w-fit p-1  rounded-xs bg-background shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleDetail();
              }}
            >
              {isDetailVisible ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
              <span className="text-xs">{isDetailVisible ? 'Ẩn chi tiết' : 'Hiện chi tiết'}</span>
            </Button>
          </div>
        )}

        {/* Bảng chi tiết */}
        {isDetailVisible && detail && (
          <div className="flex-1 min-h-[120px] overflow-auto">{detail}</div>
        )}
      </div>
    </div>
  );
}

export default MasterDetailLayout;
