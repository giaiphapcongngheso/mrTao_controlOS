import { getFirebaseStorage } from './firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

export async function uploadChecklistItemImage(file: File, itemId: string): Promise<string> {
  return compressAndConvertToBase64(file, 800, 800, 0.6);
}

/**
 * Upload a task attachment file (Report Image) as a compressed Base64 string.
 */
export async function uploadTaskAttachment(file: File): Promise<string> {
  return compressAndConvertToBase64(file, 800, 800, 0.6);
}
