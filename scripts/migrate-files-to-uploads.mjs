import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

const CATEGORY_TO_PURPOSE = {
  'user-profile': 'profile-picture',
  'blog-feature': 'blog-feature-image',
  'board-logo': 'board-logo',
  'election-image': 'election-image',
  'payment-screenshot': 'payment-screenshot',
};

function extensionFromName(originalName) {
  return originalName?.split('.').pop()?.toLowerCase() ?? 'bin';
}

async function migrate() {
  const snapshot = await db.collection('files').get();

  if (snapshot.empty) {
    console.log('No documents in files collection. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Migrating ${snapshot.size} document(s) from files → uploads...\n`);

  for (const sourceDoc of snapshot.docs) {
    const old = sourceDoc.data();

    const purpose = CATEGORY_TO_PURPOSE[old.category] ?? old.category ?? 'unknown';
    const validationStatus = old.status === 'validated' ? 'passed' : 'pending';
    const status = old.deleted ? 'deleted' : (old.status === 'validated' ? 'active' : 'pending');
    const ext = extensionFromName(old.originalName ?? '');

    const newDoc = {
      originalName: old.originalName ?? '',
      mimeType: old.mimeType ?? '',
      extension: ext,
      sizeBytes: old.sizeBytes ?? 0,
      storagePath: old.storagePath ?? '',
      downloadUrl: old.downloadUrl ?? null,
      urlExpiresAt: null,
      storageDeleted: old.deleted ?? false,
      storageDeletedAt: old.deletedAt ?? null,
      ownerType: old.ownerType ?? 'unknown',
      ownerId: old.ownerRef ?? '',
      purpose,
      status,
      validationStatus,
      validationErrors: old.validationErrors ?? null,
      uploadedBy: old.uploadedBy ?? '',
      uploadedAt: old.uploadedAt ?? old.createdAt,
      deleted: old.deleted ?? false,
      deletedAt: old.deletedAt ?? null,
      deletedBy: null,
      deletionReason: old.deleted ? 'manual' : null,
      deletionNote: null,
      replacedBy: null,
      replacedAt: null,
      dimensions: old.dimensions ?? null,
      thumbnailPath: old.thumbnailPath ?? null,
      thumbnailUrl: old.thumbnailUrl ?? null,
      referenceCount: old.referenceCount ?? 0,
      history: [
        {
          action: 'uploaded',
          by: old.uploadedBy ?? 'unknown',
          at: old.uploadedAt ?? old.createdAt,
          note: 'migrated from files collection',
        },
      ],
      createdAt: old.createdAt,
      updatedAt: old.updatedAt ?? old.createdAt,
      updatedBy: null,
    };

    await db.collection('uploads').doc(sourceDoc.id).set(newDoc);
    console.log(`  ✓ ${sourceDoc.id} (${old.originalName ?? 'unnamed'} — ${purpose})`);
  }

  console.log(`\nMigration complete. Verify uploads collection, then delete files collection from Firebase console.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
