import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type Auth, type User } from "firebase/auth";

/**
 * Firebase Web SDK, used only in live mode (VITE_USE_DEMO=false). Auth is the only Firebase service the browser talks to:
 * the data goes through the C# API, which verifies the ID token with the Firebase Admin SDK and reads/writes Firestore
 * with its own service account (so the Firestore rules can stay closed to clients; see firebase/firestore.rules).
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function ensure(): Auth {
  if (auth) return auth;
  const env = import.meta.env;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) throw new Error("FIREBASE_NOT_CONFIGURED");
  app = getApps()[0] ?? initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  auth = getAuth(app);
  return auth;
}

export async function firebaseSignIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(ensure(), email, password);
  return cred.user;
}

export async function firebaseSignUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(ensure(), email, password);
  return cred.user;
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(ensure());
}

export async function getIdToken(): Promise<string | null> {
  try {
    const a = ensure();
    const u = a.currentUser ?? (await new Promise<User | null>((res) => { const off = onAuthStateChanged(a, (x) => { off(); res(x); }); }));
    return u ? await u.getIdToken() : null;
  } catch {
    return null;
  }
}

export function onFirebaseUser(cb: (u: User | null) => void): () => void {
  try { return onAuthStateChanged(ensure(), cb); } catch { cb(null); return () => undefined; }
}
