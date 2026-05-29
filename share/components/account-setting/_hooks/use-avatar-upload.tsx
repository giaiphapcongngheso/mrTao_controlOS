import { useFile } from '../deps';
import { EUploadType } from '../deps';
import { useRef, useState, useCallback, type ChangeEvent } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import type { ProfileFormValues } from '../_components/profile-info/profile-info.constants';
import {
  VALID_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '../_components/profile-info/profile-info.constants';

interface UseAvatarUploadOptions {
  setValue: UseFormSetValue<ProfileFormValues>;
}

export function useAvatarUpload({ setValue }: UseAvatarUploadOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { uploadMutation, getFileUrl } = useFile();

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!VALID_IMAGE_TYPES.includes(file.type)) {
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const uploadResult = await uploadMutation.mutateAsync({
          file,
          folderName: 'avatars',
          uploadType: EUploadType.Sftp,
        });

        if (uploadResult.filePath) {
          setValue('avatarUrl', uploadResult.filePath);
        }

        // Set preview từ base64
        if (uploadResult.base64 && uploadResult.contentType) {
          const previewUrl = `data:${uploadResult.contentType};base64,${uploadResult.base64}`;
          setAvatarPreview(previewUrl);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setAvatarPreview(null);
        setValue('avatarUrl', '');
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [setValue, uploadMutation],
  );

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setValue('avatarUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const setAvatarPreviewUrl = useCallback(
    async (url: string | null) => {
      if (!url) {
        setAvatarPreview(null);
        return;
      }

      // Nếu là data URL hoặc blob URL thì dùng trực tiếp
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        setAvatarPreview(url);
        return;
      }

      // Nếu là đường dẫn file thì download và tạo blob URL
      try {
        const blobUrl = await getFileUrl({
          filePath: url,
          uploadType: EUploadType.Sftp,
        });
        setAvatarPreview(blobUrl);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setAvatarPreview(null);
      }
    },
    [getFileUrl],
  );

  return {
    fileInputRef,
    avatarPreview,
    isUploadingAvatar,
    handleFileSelect,
    handleRemoveAvatar,
    handleUploadClick,
    setAvatarPreviewUrl,
  };
}
