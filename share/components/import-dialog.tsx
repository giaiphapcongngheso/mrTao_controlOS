import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Skeleton,
} from '../ui';
import { cn } from '../lib';
import { AlertCircle, Download, FileUp, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onImport: (file: File) => Promise<any>;
  isImporting: boolean;
  templateQuery?: {
    data?: string;
    isFetching: boolean;
  };
  onExportTemplate?: () => Promise<void>;
  isExportingTemplate?: boolean;
  /** Called when the user selects an invalid file type */
  onFileTypeError?: () => void;
  /** Called when the user selects a file that is too large */
  onFileSizeError?: () => void;
};

export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  onImport,
  isImporting,
  templateQuery,
  onExportTemplate,
  isExportingTemplate,
  onFileTypeError,
  onFileSizeError,
}: ImportDialogProps) {
  const { t } = useTranslation(['message', 'action']);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTemplateFile = () => {
    if (templateQuery?.data) {
      const url = templateQuery.data;
      const name = `Template ${title.toLowerCase()}.xlsx`;
      return { name: decodeURIComponent(name), url };
    }
    return null;
  };

  const validateFile = (selectedFile: File): boolean => {
    const isExcel =
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      selectedFile.type === 'application/vnd.ms-excel';

    if (!isExcel) {
      onFileTypeError?.();
      return false;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      onFileSizeError?.();
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!validateFile(selectedFile)) return;
      setFile(selectedFile);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (!validateFile(selectedFile)) return;
      setFile(selectedFile);
      setIsDragging(false);
      setErrorMessage(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setErrorMessage(null);

    try {
      await onImport(file);
      onOpenChange(false);
      setFile(null);
      setErrorMessage(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.errorMessage ||
        error?.response?.data?.message ||
        error?.message ||
        'Import failed';
      setErrorMessage(message);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (isImporting) return;
    if (!value) {
      setErrorMessage(null);
      setFile(null);
    }
    onOpenChange(value);
  };

  const handleDownloadTemplate = async () => {
    if (onExportTemplate) {
      await onExportTemplate();
      return;
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors relative',
              isDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
            />
            {file ? (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full pr-10">
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full absolute right-2 hover:bg-transparent"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <FileUp className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('message:dragDrop') || 'Drag and drop file here'}
                </p>
              </>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-2"
            onClick={handleDownloadTemplate}
            disabled={templateQuery?.isFetching || isExportingTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            {templateQuery?.isFetching || isExportingTemplate ? (
              <Skeleton className="h-4 w-40 bg-gray-200" />
            ) : (
              <span className="text-blue-500 font-normal truncate">
                {getTemplateFile()?.name || t('action:exportTemplate')}
              </span>
            )}
          </Button>

          {errorMessage && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm font-medium text-destructive">
                  {t('message:importFailed', 'Import failed')}
                </span>
              </div>
              <div className="h-[200px] w-full">
                <ScrollArea className="h-full w-full pr-4">
                  <pre className="text-xs text-destructive/90 whitespace-pre-wrap break-words">
                    {errorMessage}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>
            {t('action:cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('action:import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
