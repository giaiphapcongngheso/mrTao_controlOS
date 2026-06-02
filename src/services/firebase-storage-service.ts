import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from './firebase-config';

function sanitizeFileName(name: string): string {
  const baseName = name.trim().toLowerCase();
  if (!baseName) {
    return 'image';
  }
  return baseName.replace(/[^a-z0-9._-]/g, '-');
}

export async function uploadHandbookImage(file: File, editingDocId?: string | null): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }

  const storage = getFirebaseStorage();
  const fileName = sanitizeFileName(file.name);
  const folderName = editingDocId || 'draft';
  const objectPath = `handbook-images/${folderName}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;

  const imageRef = ref(storage, objectPath);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  return getDownloadURL(snapshot.ref);
}
