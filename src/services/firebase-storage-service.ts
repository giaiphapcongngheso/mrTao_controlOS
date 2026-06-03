import { getFirebaseStorage } from './firebase-config';

function sanitizeFileName(name: string): string {
  const baseName = name.trim().toLowerCase();
  if (!baseName) {
    return 'image';
  }
  return baseName.replace(/[^a-z0-9._-]/g, '-');
}

function compressAndConvertToBase64(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('INVALID_IMAGE_TYPE'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize proportional to maxWidth / maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original read result if context is not available
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export to JPEG with quality to ensure smaller file size (safe for Firestore/API payloads)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

export async function uploadHandbookImage(file: File, editingDocId?: string | null): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  // Tạm thời chuyển sang lưu base64 nén chất lượng cao để tránh quá dung lượng Firestore/REST API
  return compressAndConvertToBase64(file);

  /* Logic Firebase Storage cũ (Giữ lại để khôi phục sau này)
  const storage = getFirebaseStorage();
  const fileName = sanitizeFileName(file.name);
  const folderName = editingDocId || 'draft';
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const objectPath = `handbook-images/${folderName}/${uniqueId}-${fileName}`;

  const imageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  return getDownloadURL(snapshot.ref);
  */
}

export async function uploadChecklistItemImage(file: File, itemId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  // Tạm thời chuyển sang lưu base64 nén chất lượng cao để tránh quá dung lượng Firestore/REST API
  return compressAndConvertToBase64(file);

  /* Logic Firebase Storage cũ (Giữ lại để khôi phục sau này)
  const storage = getFirebaseStorage();
  const fileName = sanitizeFileName(file.name);
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const objectPath = `checklist-images/${itemId}/${uniqueId}-${fileName}`;

  const imageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  return getDownloadURL(snapshot.ref);
  */
}
