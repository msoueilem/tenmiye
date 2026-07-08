# Phone OTP reCAPTCHA

## Problem

Member login via phone number (`/dashboard/login`) failed for any real phone number with:

```
CAPTCHA_CHECK_FAILED : Recaptcha verification failed - MALFORMED
```

`backend/src/modules/auth/auth.service.ts` called Identity Toolkit's `sendVerificationCode` REST API directly from the server with a hardcoded `recaptchaToken: 'ignored-for-test-numbers'`. That literal string is only accepted for phone numbers pre-registered as Firebase Console "test numbers" — any real member was rejected by Google's reCAPTCHA verification.

## Approach

Added the Firebase JS SDK client-side, Auth module only, to run Google's invisible reCAPTCHA widget (`RecaptchaVerifier`) and produce a genuine token:

- `src/lib/firebase/client.ts` — initializes the Firebase app and exports `auth`, using `NEXT_PUBLIC_FIREBASE_*` env vars. Disables app verification outside production (`auth.settings.appVerificationDisabledForTesting`) for friction-free local dev.
- `src/lib/firebase/recaptcha.ts` — `getRecaptchaToken()` constructs a fresh invisible `RecaptchaVerifier` per call (tokens are single-use) and returns the resolved token.
- `src/components/dashboard/LoginForm.tsx` — mounts a `recaptcha-container` div in the `phone` and `password` steps (the only steps that can trigger an OTP request) and fetches a real token before calling `/auth/phone/request-otp`.
- Backend `RequestOtpDto` now requires `recaptchaToken`; `auth.service.ts` forwards it to Identity Toolkit instead of the hardcoded string.

Everything else — the custom JWT session model (`issueTokenPair`), `verify-otp`/`exchangeOtp`, `checkPhone` — is unchanged.

### Rejected alternative

Moving the entire OTP exchange to client-side `signInWithPhoneNumber` (full Firebase Auth on the client) was considered but rejected: it would also move the JWT-issuance trust boundary and require reworking `verify-otp` to accept a Firebase ID token instead of `sessionInfo` + `code`. Unnecessary scope just to fix reCAPTCHA verification.

## Manual Firebase Console steps (not automatable)

- Authentication → Sign-in method → confirm **Phone** is enabled.
- Authentication → Settings → Authorized domains → confirm `tenmiye.elghidiya.com` and `localhost` are listed.
- (Dev convenience) Authentication → Sign-in method → Phone numbers for testing → register a test number + fixed code, to pair with `appVerificationDisabledForTesting`.
- Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in the production frontend hosting environment.
