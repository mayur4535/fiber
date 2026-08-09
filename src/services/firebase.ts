import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, dbId);

export interface FirebaseTestLog {
  id?: string;
  timestamp: string;
  cableId: string;
  fiberIndex: number;
  lossDb: number;
  status: string;
  distanceMeters?: number;
  wavelengthNm?: number;
  operator?: string;
  notes?: string;
}

/**
 * Save test log record to online Firebase Firestore database
 */
export async function saveTestLogToCloud(logData: Omit<FirebaseTestLog, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'test_logs'), {
      ...logData,
      createdAt: serverTimestamp()
    });
    console.log("Successfully saved test log to Firebase Cloud Firestore with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving test log to Firebase Cloud Firestore:", error);
    throw error;
  }
}

/**
 * Fetch latest test logs from online Firebase Firestore database
 */
export async function fetchCloudTestLogs(maxResults = 50): Promise<FirebaseTestLog[]> {
  try {
    const q = query(collection(db, 'test_logs'), orderBy('createdAt', 'desc'), limit(maxResults));
    const querySnapshot = await getDocs(q);
    const logs: FirebaseTestLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() } as FirebaseTestLog);
    });
    return logs;
  } catch (error) {
    console.error("Error fetching test logs from Firebase Cloud Firestore:", error);
    return [];
  }
}

/**
 * Save application settings to online Firebase Firestore database
 */
export async function saveSettingsToCloud(settingsData: any) {
  try {
    await setDoc(doc(db, 'settings', 'global_config'), {
      ...settingsData,
      updatedAt: new Date().toISOString()
    });
    console.log("Saved global settings to Cloud Firestore");
  } catch (error) {
    console.error("Error saving settings to Cloud Firestore:", error);
  }
}

/**
 * Get application settings from online Firebase Firestore database
 */
export async function fetchCloudSettings() {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'global_config'));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching settings from Cloud Firestore:", error);
    return null;
  }
}
