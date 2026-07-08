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
  return compressAndConvertToBase64(file, 1000, 1000, 0.7);

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

  // Tải ảnh chứng cứ của checklist với độ nén cao (khoảng 30KB-50KB) để tránh tràn bộ nhớ Firestore
  return compressAndConvertToBase64(file, 800, 800, 0.6);

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

// Maximum file size for task attachments (500KB to stay safely under Firestore 1MB doc limit)
const MAX_TASK_ATTACHMENT_SIZE = 500 * 1024;

/**
 * Upload a task attachment file.
 * - Images: Compressed to base64 JPEG
 * - Other files: Raw base64 (with size limit enforcement)
 * @throws Error if file exceeds MAX_TASK_ATTACHMENT_SIZE (for non-image files)
 */
export async function uploadTaskAttachment(file: File): Promise<string> {
  // Images get compressed automatically
  if (file.type.startsWith('image/')) {
    return compressAndConvertToBase64(file);
  }

  // Non-image files: enforce size limit to protect Firestore
  if (file.size > MAX_TASK_ATTACHMENT_SIZE) {
    throw new Error(`FILE_TOO_LARGE: Tệp ${file.name} vượt quá ${Math.round(MAX_TASK_ATTACHMENT_SIZE / 1024)}KB. Vui lòng chọn tệp nhỏ hơn.`);
  }

  // Read non-image file as base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
