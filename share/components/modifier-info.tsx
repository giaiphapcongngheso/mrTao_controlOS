import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui';

type ModifierInfoLabels = {
  createdDateLabel?: string;
  createdByLabel?: string;
  modifiedDateLabel?: string;
  modifiedByLabel?: string;
};

type Props = {
  createdDate: Date;
  lastModifiedDate: Date | undefined;
  createdByUser: string;
  modifiedByUser: string | undefined;
  dateFormat?: string;
  labels?: ModifierInfoLabels;
};

export default function ModifierInfo({
  createdDate,
  lastModifiedDate,
  createdByUser,
  modifiedByUser,
  dateFormat = 'dd/MM/yyyy HH:mm',
  labels = {},
}: Props) {
  const {
    createdDateLabel = 'Created:',
    createdByLabel = 'Created by:',
    modifiedDateLabel = 'Modified:',
    modifiedByLabel = 'Modified by:',
  } = labels;

  return (
    <div>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-0.5">
            {(lastModifiedDate || createdDate) && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {format(lastModifiedDate || createdDate, dateFormat)}
                </span>
              </div>
            )}
            {(modifiedByUser || createdByUser) && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{modifiedByUser || createdByUser}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="">
          <div className="flex flex-col gap-0.5">
            {createdDate && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {createdDateLabel} {format(createdDate, dateFormat)}
                </span>
              </div>
            )}
            {createdByUser && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {createdByLabel} {createdByUser}
                </span>
              </div>
            )}
            {(createdByUser || createdDate) && (modifiedByUser || lastModifiedDate) && (
              <div className="border-t border-border my-1"></div>
            )}
            {lastModifiedDate && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {modifiedDateLabel} {format(lastModifiedDate, dateFormat)}
                </span>
              </div>
            )}
            {modifiedByUser && (
              <div className="grid grid-cols-[20px_auto] items-center-safe">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {modifiedByLabel} {modifiedByUser}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
