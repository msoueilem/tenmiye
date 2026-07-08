import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from './client';

// Constructs a fresh verifier per call — reCAPTCHA tokens are single-use,
// so retries (e.g. after a failed OTP request) need a new widget instance.
export async function getRecaptchaToken(containerId: string): Promise<string> {
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
  try {
    return await verifier.verify();
  } finally {
    verifier.clear();
  }
}
