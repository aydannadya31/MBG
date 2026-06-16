import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import allConfigs from '../../firebase-applet-config.json';

const EXHAUSTED_PREFIX = 'firestore_exhausted_';
const QUOTA_RESET_MS = 24 * 60 * 60 * 1000;

const apps: FirebaseApp[] = [];
const instances: Firestore[] = [];

allConfigs.forEach((config, i) => {
  const app = initializeApp(config, i === 0 ? undefined : `fb-${i}`);
  apps.push(app);
  instances.push(getFirestore(app, config.firestoreDatabaseId));
});

function getActiveDbIndex(): number {
  for (let i = 0; i < instances.length; i++) {
    try {
      const exhaustedAt = parseInt(localStorage.getItem(`${EXHAUSTED_PREFIX}${i}`) || '0', 10);
      if (Date.now() - exhaustedAt > QUOTA_RESET_MS) {
        return i;
      }
    } catch (_) {
    }
  }
  return 0;
}

function getActiveDbInstance(): Firestore {
  return instances[getActiveDbIndex()];
}

export function markCurrentDbExhausted(): void {
  try {
    const idx = getActiveDbIndex();
    localStorage.setItem(`${EXHAUSTED_PREFIX}${idx}`, Date.now().toString());
    window.dispatchEvent(new CustomEvent('firestore-db-switched'));
  } catch (_) {
  }
}

export function getActiveDb(): Firestore {
  return getActiveDbInstance();
}

export const db: Firestore = getActiveDbInstance();

export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (error instanceof Error && (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'))) {
    markCurrentDbExhausted();
  }

  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connected");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
