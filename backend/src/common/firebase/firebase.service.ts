import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { AppConfig } from '../config/app.config';

/**
 * Firebase is retained ONLY for authentication: SMS OTP (Identity Toolkit) and
 * verifying the ID token returned by the phone-auth exchange. All application
 * data lives in MongoDB and all files on local disk — there is intentionally no
 * Firestore (`db`) or Cloud Storage (`storage`) handle here anymore.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  auth!: admin.auth.Auth;

  constructor(private config: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    const { projectId, clientEmail, privateKey } = this.config.get('firebase', { infer: true });

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing required Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }

    this.auth = admin.auth();
  }
}
