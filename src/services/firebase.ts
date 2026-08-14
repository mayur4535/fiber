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
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, dbId);
export const auth = getAuth(app);

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

// AUTHENTICATION HELPERS
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const userCred = await signInWithEmailAndPassword(auth, email, pass);
  return userCred.user;
}

export async function signUpWithEmail(email: string, pass: string): Promise<User> {
  const userCred = await createUserWithEmailAndPassword(auth, email, pass);
  return userCred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// USER-ISOLATED CLOUD FIRESTORE STORAGE HELPERS (/users/{uid}/app_data/{key})
export async function saveUserDataToCloud(uid: string, key: string, payload: any): Promise<void> {
  if (!uid) return;
  const docRef = doc(db, 'users', uid, 'app_data', key);
  await setDoc(docRef, {
    data: payload,
    updatedAt: new Date().toISOString()
  });
}

export async function fetchUserDataFromCloud(uid: string, key: string): Promise<any | null> {
  if (!uid) return null;
  const docRef = doc(db, 'users', uid, 'app_data', key);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data()?.data || null;
  }
  return null;
}

export async function fetchAllUserDataFromCloud(uid: string): Promise<Record<string, any>> {
  if (!uid) return {};
  const keys = ['models', 'reports', 'settings', 'calibration', 'pendingTests'];
  const results: Record<string, any> = {};

  for (const key of keys) {
    try {
      const data = await fetchUserDataFromCloud(uid, key);
      if (data) {
        results[key] = data;
      }
    } catch (e) {
      console.warn(`Failed to fetch cloud key ${key}:`, e);
    }
  }

  return results;
}

/**
 * Save test log record to online Firebase Firestore database
 */
export async function saveTestLogToCloud(logData: any) {
  try {
    const user = auth.currentUser;
    if (user) {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'test_logs'), {
        ...logData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } else {
      const docRef = await addDoc(collection(db, 'test_logs'), {
        ...logData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
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
    const user = auth.currentUser;
    const colRef = user ? collection(db, 'users', user.uid, 'test_logs') : collection(db, 'test_logs');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(maxResults));
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
    const user = auth.currentUser;
    if (user) {
      await saveUserDataToCloud(user.uid, 'settings', settingsData);
    } else {
      await setDoc(doc(db, 'settings', 'global_config'), {
        ...settingsData,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error saving settings to Cloud Firestore:", error);
  }
}

/**
 * Get application settings from online Firebase Firestore database
 */
export async function fetchCloudSettings() {
  try {
    const user = auth.currentUser;
    if (user) {
      return await fetchUserDataFromCloud(user.uid, 'settings');
    }
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
