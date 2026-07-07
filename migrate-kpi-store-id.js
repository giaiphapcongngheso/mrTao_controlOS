import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Error: Firebase configuration variables are not loaded. Please make sure .env file exists and is populated.');
  process.exit(1);
}

// Initialize Firebase client
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
  console.log('🚀 Starting KPI storeId migration script...');

  // 1. Fetch all staff members to build staffId -> storeId map
  console.log('Fetching staff members from "staff" collection...');
  const staffSnapshot = await getDocs(collection(db, 'staff'));
  const staffStoreMap = new Map();
  
  staffSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.storeId) {
      staffStoreMap.set(doc.id, data.storeId);
    }
  });
  console.log(`✅ Loaded ${staffStoreMap.size} staff member mapping(s).`);

  // Helper function to update storeId in target collection
  const updateCollectionStoreId = async (collectionName, staffIdFieldName = 'staffId') => {
    console.log(`\nScanning collection "${collectionName}"...`);
    const qSnapshot = await getDocs(collection(db, collectionName));
    
    let updateCount = 0;
    let batch = writeBatch(db);
    let opCount = 0;
    
    for (const d of qSnapshot.docs) {
      const data = d.data();
      const staffId = data[staffIdFieldName];
      
      // If storeId is empty/missing and we have a valid staffId mapping
      if ((!data.storeId || data.storeId === '') && staffId) {
        const correctStoreId = staffStoreMap.get(staffId);
        if (correctStoreId) {
          batch.update(doc(db, collectionName, d.id), { storeId: correctStoreId });
          updateCount++;
          opCount++;
          console.log(`  - Preparing update for ${collectionName}/${d.id}: setting storeId = "${correctStoreId}" for staffId = "${staffId}"`);
          
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        } else {
          console.warn(`  - ⚠️ Warning: No storeId mapping found for staffId = "${staffId}" in document ${d.id}`);
        }
      }
    }
    
    if (opCount > 0) {
      await batch.commit();
    }
    
    if (updateCount > 0) {
      console.log(`✅ Successfully updated ${updateCount} record(s) in "${collectionName}".`);
    } else {
      console.log(`ℹ️ No records needed update in "${collectionName}".`);
    }
    return updateCount;
  };

  // 2. Update kpi_configs
  const configsUpdated = await updateCollectionStoreId('kpi_configs');

  // 3. Update kpi_daily_values (Firestore collection is kpi_daily-values with hyphen)
  const dailyValuesUpdated = await updateCollectionStoreId('kpi_daily-values');

  // 4. Update kpi_staff_monthly_configs (Firestore collection is kpi_staff_monthly_configs with underscore)
  const monthlyConfigsUpdated = await updateCollectionStoreId('kpi_staff_monthly_configs');

  console.log('\n🎉 KPI storeId migration completed successfully!');
  console.log(`Summary of updates:`);
  console.log(`- kpi_configs: ${configsUpdated} updated`);
  console.log(`- kpi_daily-values: ${dailyValuesUpdated} updated`);
  console.log(`- kpi_staff_monthly_configs: ${monthlyConfigsUpdated} updated`);
}

runMigration().catch((err) => {
  console.error('❌ Migration failed with error:', err);
});
