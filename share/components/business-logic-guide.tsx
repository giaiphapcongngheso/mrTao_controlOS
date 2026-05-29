import { Button, Popover, PopoverContent, PopoverTrigger } from '../ui';
import { Info } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../lib';

interface BusinessLogicGuideProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A reusable component to display business logic guides and constraints in a popover.
 */
export function BusinessLogicGuide({
  title = 'Quy tắc & Logic nghiệp vụ',
  children,
  className,
}: BusinessLogicGuideProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20 rounded-full',
            className,
          )}
          title="Xem quy tắc nghiệp vụ"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] text-sm shadow-xl" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-base flex items-center gap-2 text-primary">
            <Info className="h-5 w-5" />
            {title}
          </h4>
          <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
