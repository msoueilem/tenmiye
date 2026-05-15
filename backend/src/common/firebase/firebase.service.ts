import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { AppConfig } from '../config/app.config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  db!: admin.firestore.Firestore;
  auth!: admin.auth.Auth;
  storage!: admin.storage.Storage;

  constructor(private config: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    const { projectId, clientEmail, privateKey, storageBucket } = this.config.get('firebase', { infer: true });

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing required Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
      });
    }

    this.db = admin.firestore();
    this.auth = admin.auth();
    this.storage = admin.storage();
  }
}
