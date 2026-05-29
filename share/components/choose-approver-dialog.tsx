import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WorkItemProcessStep } from '../types';

export type ChooseApproverDialogProps = {
  readonly open: {
    open: boolean;
    steps?: WorkItemProcessStep[];
  };
  readonly loading: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (assignees: { workItemProcessStepId: string; employeeId: string }[]) => void;
  /** Employee options for the combobox — each app provides this from their own employee query */
  readonly employeeOptions?: { value: string; label: string }[];
  readonly employeeLoading?: boolean;
};

export function ChooseApproverDialog({
  open,
  loading,
  onOpenChange,
  onConfirm,
  employeeOptions = [],
  employeeLoading = false,
}: ChooseApproverDialogProps) {
  const { t } = useTranslation(['action', 'common']);
  const [selectedApprovers, setSelectedApprovers] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    onConfirm(
      Object.entries(selectedApprovers).map(([stepId, employeeId]) => ({
        workItemProcessStepId: stepId,
        employeeId,
      })),
    );
  };

  return (
    <Dialog open={open.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Chọn người thực hiện cho các bước sau</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {open.steps?.map((step) => (
            <div
              key={step.id}
              className="p-5 rounded-lg border border-primary/15 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{step.name}</h3>
                </div>
                <div className="flex-1 min-w-0">
                  <Combobox
                    options={employeeOptions}
                    value={selectedApprovers[step.id] || ''}
                    onValueChange={(val) =>
                      setSelectedApprovers((prev) => ({ ...prev, [step.id]: val || '' }))
                    }
                    placeholder="Tìm và chọn nhân viên"
                    loading={employeeLoading}
                    buttonProps={{ className: 'w-full' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('action:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('action:confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
