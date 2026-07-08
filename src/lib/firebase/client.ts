import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Skips real reCAPTCHA challenges outside production; pair with a Firebase
// Console test phone number for deterministic local/dev OTP flows.
if (process.env.NODE_ENV !== 'production') {
  auth.settings.appVerificationDisabledForTesting = true;
}
