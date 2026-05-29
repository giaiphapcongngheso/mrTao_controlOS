import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ImageViewerItem {
  /** URL for thumbnail display */
  readonly thumbnailUrl: string;
  /** URL for full-size display (falls back to thumbnailUrl if not provided) */
  readonly fullUrl?: string;
  /** Alt text */
  readonly alt?: string;
}

export interface ImageViewerProps {
  /** List of images to display */
  readonly images: ImageViewerItem[];
  /** Initially selected image index */
  readonly defaultIndex?: number;
  /** Whether the viewer is open */
  readonly open: boolean;
  /** Called when the viewer should close */
  readonly onOpenChange: (open: boolean) => void;
  /** Extra toolbar content (rendered in the toolbar area) */
  readonly toolbarContent?: React.ReactNode;
  /** Custom class for the overlay */
  readonly className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ImageViewer({
  images,
  defaultIndex = 0,
  open,
  onOpenChange,
  toolbarContent,
  className,
}: ImageViewerProps) {
  const [activeIndex, setActiveIndex] = React.useState(defaultIndex);
  const thumbnailContainerRef = React.useRef<HTMLDivElement>(null);

  // Sync activeIndex when defaultIndex or open changes
  React.useEffect(() => {
    if (open) setActiveIndex(defaultIndex);
  }, [open, defaultIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case 'ArrowLeft':
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case 'ArrowRight':
          setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, images.length, onOpenChange]);

  // Auto-scroll active thumbnail into view
  React.useEffect(() => {
    if (!open || !thumbnailContainerRef.current) return;
    const container = thumbnailContainerRef.current;
    const activeThumb = container.children[activeIndex] as HTMLElement | undefined;
    activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex, open]);

  if (!open || images.length === 0) return null;

  const activeImage = images[activeIndex];
  const displayUrl = activeImage?.fullUrl || activeImage?.thumbnailUrl;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm', className)}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 text-white/80">
        <span className="text-sm">
          {activeIndex + 1} / {images.length}
        </span>

        {/* Toolbar area — extensible */}
        <div className="flex items-center gap-2">{toolbarContent}</div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Main image area ── */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-12">
        {/* Previous button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
            className="absolute left-2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        {displayUrl && (
          <img
            src={displayUrl}
            alt={activeImage?.alt ?? `Image ${activeIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            draggable={false}
          />
        )}

        {/* Next button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
            className="absolute right-2 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Ảnh tiếp"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {images.length > 1 && (
        <div className="py-4 px-4">
          <div
            ref={thumbnailContainerRef}
            className="flex items-center justify-center gap-3 overflow-x-auto overflow-y-visible py-2 scrollbar-thin"
          >
            {images.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                  index === activeIndex
                    ? 'border-white ring-2 ring-white/30 scale-110'
                    : 'border-transparent opacity-60 hover:opacity-90 hover:border-white/40',
                )}
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.alt ?? `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
