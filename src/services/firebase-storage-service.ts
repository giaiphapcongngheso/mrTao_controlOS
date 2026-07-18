import { getFirebaseStorage } from './firebase-config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

function sanitizeFileName(name: string): string {
  const baseName = name.trim().toLowerCase();
  if (!baseName) {
    return 'image';
  }
  return baseName.replace(/[^a-z0-9._-]/g, '-');
}

let heic2anyModule: any = null;

async function loadHeic2Any(): Promise<any> {
  if (heic2anyModule) return heic2anyModule;
  if (typeof window !== 'undefined' && (window as any).heic2any) {
    heic2anyModule = (window as any).heic2any;
    return heic2anyModule;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.js';
    script.onload = () => {
      heic2anyModule = (window as any).heic2any;
      resolve(heic2anyModule);
    };
    script.onerror = (err) => {
      reject(new Error('Failed to load heic2any library from CDN'));
    };
    document.head.appendChild(script);
  });
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' || 
                 file.name.toLowerCase().endsWith('.heic') || 
                 file.name.toLowerCase().endsWith('.heif');
                 
  if (!isHeic) return file;

  try {
    const heic2any = await loadHeic2Any();
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } catch (err) {
    console.error('Lỗi chuyển đổi HEIC sang JPEG:', err);
    return file;
  }
}

export async function compressAndConvertToBase64(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6,
): Promise<string> {
  // 1. Convert HEIC/HEIF if needed
  const processedFile = await convertHeicToJpeg(file);

  // 2. Guess mime type if empty
  let type = processedFile.type;
  if (!type && processedFile.name) {
    const ext = processedFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
    else if (ext === 'png') type = 'image/png';
    else if (ext === 'webp') type = 'image/webp';
    else if (ext === 'gif') type = 'image/gif';
  }

  // 3. Fallback direct base64 reader
  const readRawBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  };

  // If not an image (e.g. PDF, Document), just read it directly as raw Base64
  if (!type || !type.startsWith('image/')) {
    return readRawBase64(processedFile);
  }

  // 4. Try compressing using canvas
  return new Promise((resolve) => {
    if (!processedFile.type.startsWith('image/')) {
      readRawBase64(processedFile).then(resolve).catch(() => resolve(''));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn('Canvas compression failed, falling back to raw Base64:', err);
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => {
        console.warn('Image load failed in canvas, falling back to raw Base64:', err);
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      readRawBase64(processedFile).then(resolve).catch(() => {
        resolve('');
      });
    };
  });
}

export async function uploadHandbookImage(file: File, editingDocId?: string | null): Promise<string> {
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
}

export async function compressImageToBlob(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6,
): Promise<Blob> {
  const processedFile = await convertHeicToJpeg(file);

  let type = processedFile.type;
  if (!type && processedFile.name) {
    const ext = processedFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
    else if (ext === 'png') type = 'image/png';
    else if (ext === 'webp') type = 'image/webp';
    else if (ext === 'gif') type = 'image/gif';
  }

  if (!type || !type.startsWith('image/')) {
    return processedFile;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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
            resolve(processedFile);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || processedFile);
            },
            'image/jpeg',
            quality,
          );
        } catch (err) {
          console.warn('Canvas compression failed, falling back to original file:', err);
          resolve(processedFile);
        }
      };
      img.onerror = (err) => {
        console.warn('Image load failed in canvas, falling back to original file:', err);
        resolve(processedFile);
      };
    };
    reader.onerror = () => {
      resolve(processedFile);
    };
  });
}

export async function uploadBlobToStorage(
  blob: Blob,
  fileName: string,
  folder: string,
): Promise<string> {
  const storage = getFirebaseStorage();
  const sanitized = sanitizeFileName(fileName);
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const objectPath = `${folder}/${uniqueId}-${sanitized}`;

  const imageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(imageRef, blob, {
    contentType: blob.type || 'application/octet-stream',
  });

  return getDownloadURL(snapshot.ref);
}

export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  try {
    const compressedBlob = await compressImageToBlob(file, 800, 800, 0.6);
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    
    // 1. Loại bỏ tiền tố 'handbook-images/' nếu có để xử lý đồng nhất
    let cleanFolder = folder;
    if (cleanFolder.startsWith('handbook-images/')) {
      cleanFolder = cleanFolder.substring('handbook-images/'.length);
    }
    
    // 2. Thay thế tất cả dấu gạch chéo '/' bằng dấu gạch ngang '-' để nén đường dẫn thành 1 segment duy nhất.
    // Việc này đảm bảo đường dẫn lưu trữ luôn có dạng đúng 3 segments: handbook-images/{folderName}/{fileName}
    // và không bị chặn bởi Firebase Storage Rules (vốn giới hạn chỉ cho phép 3 segments).
    cleanFolder = cleanFolder.replace(/\//g, '-');
    
    // 3. Ghép tiền tố 'handbook-images/' vào trước
    const targetFolder = `handbook-images/${cleanFolder}`;
    
    return await uploadBlobToStorage(compressedBlob, fileName, targetFolder);
  } catch (err) {
    console.error(`Lỗi upload ảnh lên thư mục ${folder}:`, err);
    throw err;
  }
}

export async function uploadChecklistItemImage(file: File, itemId: string): Promise<string> {
  return uploadImageToStorage(file, `checklist-images/${itemId}`);
}

/**
 * Upload a task attachment file (Report Image) as a compressed file to Firebase Storage.
 */
export async function uploadTaskAttachment(file: File): Promise<string> {
  return uploadImageToStorage(file, 'task-attachments');
}

/**
 * Delete an image from Firebase Storage using its download URL.
 */
export async function deleteImageFromStorage(url: string): Promise<void> {
  if (!url || !url.startsWith('http')) return;
  try {
    const storage = getFirebaseStorage();
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Lỗi khi xóa ảnh khỏi Firebase Storage:', err);
  }
}


