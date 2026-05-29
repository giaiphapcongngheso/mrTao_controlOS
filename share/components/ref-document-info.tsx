import { cn } from '../lib';
import { Label } from '../ui';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Configuration for a reference document type.
 * Maps a category code to its display metadata and routing info.
 */
export interface RefDocumentConfig {
  /** Display label for the reference type, e.g. "Yêu cầu báo giá (SQ)" */
  refTypeLabel: string;
  /** Short label for badge, e.g. "SQ", "SO" */
  refTypeBadge: string;
  /** Permission module key used to check View access */
  permissionModule: string;
  /**
   * Build the full URL path for the referenced document.
   * Return null if no routing is available yet.
   */
  buildDetailUrl: (refDocNum: string, refDocId?: string | null) => string | null;
  /** Badge color variant */
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'warning' | 'success';
}

export interface RefDocumentInfoProps {
  /** The selection component (Combobox, Select, etc.) provided by the user */
  children: React.ReactNode;

  // Ref document config
  /** Category code used to resolve the reference config */
  categoryCode: string;
  /** The reference type label (overrides config if provided) */
  refTypeLabel?: string | null;
  /** Registry of category code → ref document configuration */
  configMap?: Record<string, RefDocumentConfig>;
  /** The currently selected document ID (required to show View Detail button) */
  value?: string | null;
  /** The selected document number (required for URL routing in View Detail button) */
  selectedDocNum?: string | null;

  /** Additional CSS class */
  className?: string;
  refTypeHeight?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * RefDocumentInfo acts as a standardized layout wrapper for reference document selection.
 * It displays a fixed "Ref Type" label on the left and an optional "View Detail" button on the right.
 * The actual selection component (e.g., Combobox) is passed as a child.
 */
export function RefDocumentInfo({
  children,
  categoryCode,
  refTypeLabel,
  configMap,
  // value,
  // selectedDocNum,
  className,
  refTypeHeight = 'h-10',
}: Readonly<RefDocumentInfoProps>) {
  // const { t } = useTranslation('common');

  const config = configMap?.[categoryCode];
  // const canViewRef = useHasPermission(config?.permissionModule ?? '', PermissionAction.View);

  const displayLabel = refTypeLabel ?? config?.refTypeLabel ?? categoryCode;
  // const detailUrl =
  //   value && selectedDocNum && config ? config.buildDetailUrl(selectedDocNum, value) : null;
  // const hasUrl = !!detailUrl;

  // const handleOpenDetail = () => {
  //   if (!canViewRef) return;
  //   if (detailUrl) {
  //     window.open(detailUrl, '_blank', 'noopener,noreferrer');
  //   }
  // };

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start gap-2', className)}>
      {/* 1. Static Display: Ref Type Label */}
      <div className="w-full sm:w-fit sm:min-w-[160px] shrink-0 flex flex-col gap-1.5">
        <Label className="text-sm">RefType</Label>
        <div
          className={cn(
            'px-3 py-2 rounded-md border border-input bg-muted/50 text-muted-foreground font-medium text-sm flex items-center whitespace-nowrap',
            'cursor-not-allowed select-none',
            refTypeHeight,
          )}
          title={displayLabel}
        >
          {displayLabel}
        </div>
      </div>

      {/* 2. Custom Selection Component + Action Button */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <Label className="text-sm">RefDocNum</Label>
        <div className="flex items-center gap-2 min-w-0">
          {/* Render the selection component (Combobox, Select, etc.) */}
          <div className="flex-1 min-w-0">{children}</div>

          {/* Action Button: View details (External Link) - Temporarily hidden for customization */}
          {/* {value &&
          selectedDocNum &&
          config &&
          (canViewRef ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className={cn(
                    'h-10 w-10 shrink-0 text-muted-foreground transition-all duration-200',
                    hasUrl
                      ? 'hover:text-primary hover:border-primary/50'
                      : 'cursor-not-allowed opacity-50',
                  )}
                  onClick={handleOpenDetail}
                  disabled={!hasUrl}
                  aria-label={t('refDocument.viewDetail', {
                    defaultValue: 'Xem chi tiết {{typeLabel}}',
                    typeLabel: displayLabel,
                  })}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {hasUrl
                  ? t('refDocument.openInNewTab', {
                      defaultValue: 'Mở {{typeLabel}} trong tab mới',
                      typeLabel: displayLabel,
                    })
                  : t('refDocument.detailNotReady', {
                      defaultValue: 'Chức năng xem chi tiết chưa sẵn sàng',
                    })}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-md border border-border bg-destructive/5 text-destructive/60 cursor-not-allowed',
                    'opacity-70 hover:opacity-100 transition-opacity duration-200',
                  )}
                  aria-label={t('refDocument.noPermission', {
                    defaultValue: 'Phân quyền của bạn không được xem phiếu tham chiếu này',
                  })}
                >
                  <ShieldAlert className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[240px] text-center">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>
                    {t('refDocument.noPermission', {
                      defaultValue: 'Phân quyền của bạn không được xem phiếu tham chiếu này',
                    })}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))} */}
        </div>
      </div>
    </div>
  );
}

export default RefDocumentInfo;
