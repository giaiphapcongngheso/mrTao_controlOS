import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables from .env
dotenv.config();

// Polyfill import.meta.env for Node.js environment
const env = {
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
  VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '',
  VITE_DATA_PROVIDER: process.env.VITE_DATA_PROVIDER || 'firebase',
};

(import.meta as any).env = env;

// Dynamic imports to prevent hoisting evaluation issues
const { ensureFirebasePasswordUser } = await import('../services/firebase-auth-service.js');
const { staffService } = await import('../services/admin/staff-service.js');

const DEFAULT_STORE_ID = 'store-mr-tao-q1';

async function seedAdmin() {
  const username = 'akadmin';
  const password = 'admin123';
  const email = 'dinhnguyen.306py@gmail.com';

  console.log(`Starting seed admin with username: ${username}, email: ${email}...`);

  try {
    // 1. Ensure user account in Firebase Auth
    console.log('Ensuring user in Firebase Auth...');
    const authResult = await ensureFirebasePasswordUser(email, password);
    console.log(`Firebase Auth user status: ${authResult.status}, UID: ${authResult.uid}`);

    // 2. Generate SHA-256 hash for internal offline/fallback password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // 3. Check for existing document in Firestore
    console.log('Checking for existing staff in Firestore...');
    const existingStaff = await staffService.findByUsername(username);

    const staffData = {
      id: existingStaff?.id || `NV-ADMIN-${Date.now()}`,
      storeId: DEFAULT_STORE_ID,
      fullName: 'Quản trị viên',
      role: 'QUAN_TRI_VIEN',
      username: username,
      authEmail: email,
      email: email,
      phone: '0900000000',
      status: 'active' as const,
      joinedDate: new Date().toISOString().split('T')[0],
      employeeCode: 'MNS-ADMIN',
      password: hashedPassword,
      firebaseUid: authResult.uid,
    };

    if (existingStaff) {
      console.log(`Staff ${username} already exists. Updating...`);
      await staffService.update(existingStaff.id, staffData);
      console.log('Update completed successfully.');
    } else {
      console.log(`Creating new staff ${username}...`);
      await staffService.create(staffData);
      console.log('Creation completed successfully.');
    }

    console.log('Seed admin script finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
