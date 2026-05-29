import * as React from 'react';
import { cn } from '../lib/utils';
import { ImageViewer, type ImageViewerItem } from './image-viewer';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ImageGalleryItem {
  /** Unique key for the item */
  readonly id?: string;
  /** Display name / alt text */
  readonly name: string;
  /** URL for thumbnail & full-size display */
  readonly url: string;
}

export interface ImageGalleryProps {
  /** Title shown above the gallery */
  readonly title?: string;
  /** Images to display */
  readonly images: ImageGalleryItem[];
  /** Resolved blob/preview URLs keyed by original url */
  readonly previewUrls: Record<string, string>;
  /** Max number of thumbnails to show before collapsing with "+N" */
  readonly visibleCount?: number;
  /** Extra toolbar content passed to ImageViewer */
  readonly viewerToolbar?: React.ReactNode;
  /** Custom class for the root container */
  readonly className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ImageGallery({
  title,
  images,
  previewUrls,
  visibleCount,
  viewerToolbar,
  className,
}: ImageGalleryProps) {
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  if (!images || images.length === 0) return null;

  const hasOverflow = visibleCount != null && images.length > visibleCount;
  const displayImages = hasOverflow ? images.slice(0, visibleCount - 1) : images;
  const remainingCount = hasOverflow ? images.length - (visibleCount - 1) : 0;

  const viewerImages: ImageViewerItem[] = images
    .map((img) => ({
      thumbnailUrl: previewUrls[img.url] ?? '',
      alt: img.name,
    }))
    .filter((img) => img.thumbnailUrl);

  return (
    <div className={cn('rounded-lg', className)}>
      {title && (
        <h6 className="text-sm font-semibold mb-2">
          {title} ({images.length})
        </h6>
      )}

      <div className="flex flex-wrap gap-3 p-1">
        {displayImages.map((img, index) => {
          const previewUrl = previewUrls[img.url];
          return (
            <div
              key={img.id ?? index}
              className="relative w-24 h-24 rounded-lg border bg-muted cursor-pointer hover:outline hover:outline-2 hover:outline-primary/50 hover:outline-offset-1"
              onClick={() => {
                if (previewUrl) {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={img.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-1 text-center break-all">
                  {img.name}
                </div>
              )}
            </div>
          );
        })}

        {/* "+N" overflow card */}
        {hasOverflow && (
          <div
            className="relative w-24 h-24 rounded-lg border bg-muted cursor-pointer hover:outline hover:outline-2 hover:outline-primary/50 hover:outline-offset-1 flex items-center justify-center"
            onClick={() => {
              setViewerIndex(visibleCount - 1);
              setViewerOpen(true);
            }}
          >
            <span className="text-lg font-semibold text-muted-foreground">+{remainingCount}</span>
          </div>
        )}
      </div>

      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        defaultIndex={viewerIndex}
        images={viewerImages}
        toolbarContent={viewerToolbar}
      />
    </div>
  );
}
