import { join } from 'path';

export const appConfig = () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  frontendUrls: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/tenmiye?replicaSet=rs0',
  uploads: {
    // Filesystem directory where uploaded files are stored on the VPS.
    dir: process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads-data'),
    // Public origin used to build download URLs, e.g. https://host -> https://host/uploads/<path>
    publicBaseUrl: (
      process.env.UPLOADS_PUBLIC_BASE_URL ??
      `http://localhost:${process.env.PORT ?? '8080'}`
    ).replace(/\/+$/, ''),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    webApiKey: process.env.FIREBASE_WEB_API_KEY ?? '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
  },
});

export type AppConfig = ReturnType<typeof appConfig>;
