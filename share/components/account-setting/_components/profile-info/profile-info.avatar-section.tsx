import { Avatar, AvatarFallback, AvatarImage } from '@shared/ui';
import { Dialog, DialogContent } from '@shared/ui';
import { SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface AvatarSectionProps {
  avatarPreview: string | null;
  isUploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onUploadClick: () => void;
  firstName?: string;
  lastName?: string;
  position?: string;
}

export function AvatarSection({
  avatarPreview,
  isUploadingAvatar,
  fileInputRef,
  onFileSelect,
  onUploadClick,
  firstName,
  lastName,
  position,
}: AvatarSectionProps) {
  const { t } = useTranslation(['accountSetting']);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const initials =
    firstName && lastName
      ? `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase().slice(0, 2)
      : 'U';

  const handleAvatarClick = () => {
    if (avatarPreview && !isUploadingAvatar) {
      setIsImageViewerOpen(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUploadingAvatar) {
      onUploadClick();
    }
  };

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';

  return (
    <div className="flex items-end gap-4">
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
          onChange={onFileSelect}
          className="hidden"
        />
        <div className="rounded-full border-4 border-border p-0.5 inline-block">
          <Avatar
            className={`h-41 w-41 ${
              isUploadingAvatar
                ? 'cursor-wait opacity-50'
                : avatarPreview
                  ? 'cursor-pointer hover:opacity-80 transition-opacity'
                  : ''
            }`}
            onClick={handleAvatarClick}
          >
            <AvatarImage
              src={avatarPreview || undefined}
              alt="Avatar"
              className="object-cover object-center"
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
        {!isUploadingAvatar && (
          <button
            type="button"
            onClick={handleEditClick}
            className="absolute bottom-1 right-5 bg-muted text-muted-foreground rounded-full p-1 hover:bg-muted/80 transition-colors shadow-sm hover:cursor-pointer"
            aria-label={t('accountSetting:profileInfo.changeAvatar')}
          >
            <SquarePen className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        {isUploadingAvatar && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {avatarPreview && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl p-0">
            <img src={avatarPreview} alt="Avatar preview" className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col gap-1 pb-2">
        {fullName && <h3 className="text-[22px] font-semibold">{fullName}</h3>}
        {position && <span className="text-[14px] text-muted-foreground">{position}</span>}
      </div>
    </div>
  );
}
