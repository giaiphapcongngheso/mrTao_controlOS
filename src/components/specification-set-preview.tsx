import { Popover, PopoverContent, PopoverTrigger, ScrollArea } from '@shared/ui';
import type { ISpecificationSetDetail } from '@/types/admin/specification-set.type';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type SpecificationSetPreviewProps = Readonly<{
  /** The details array from the selected specification set */
  details?: ISpecificationSetDetail[];
  /** Optional className for the trigger container */
  className?: string;
}>;

/**
 * Reusable component to display a clickable "View specifications" text link
 * that opens a popover showing the list of specifications in the selected set.
 *
 * Usage: Place below a Combobox that selects a SpecificationSet.
 */
export function SpecificationSetPreview({ details, className }: SpecificationSetPreviewProps) {
  const { t } = useTranslation(['specificationSet', 'common']);
  const [open, setOpen] = useState(false);

  if (!details || details.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`
            inline-flex items-center gap-1 text-xs text-primary/80 
            hover:text-primary hover:underline transition-colors duration-150 
            cursor-pointer mt-1 focus:outline-none focus-visible:ring-1 
            focus-visible:ring-primary/50 rounded-sm px-0.5
            ${className ?? ''}
          `}
        >
          <Eye className="h-3 w-3" />
          <span>
            {t('specificationSet:viewSpecifications', {
              defaultValue: 'Xem thông số',
            })}{' '}
            ({details.length})
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-72 p-0 shadow-lg border-border/60">
        <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
          <p className="text-xs font-semibold text-foreground">
            {t('specificationSet:detail.title')}
          </p>
        </div>
        <ScrollArea className="max-h-[240px]">
          <ul className="py-1">
            {details.map((detail, index) => (
              <li
                key={detail.id ?? `${detail.specificationId}-${index}`}
                className="flex items-baseline gap-2 px-3 py-1.5 text-xs hover:bg-muted/20 transition-colors duration-100"
              >
                <span className="shrink-0 text-[10px] text-muted-foreground/60 w-4 text-right">
                  {index + 1}.
                </span>
                <span className="font-sans text-muted-foreground shrink-0">
                  {detail.specification?.code ?? '-'}
                </span>
                <span className="text-foreground truncate">
                  {detail.specification?.name ?? '-'}
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
