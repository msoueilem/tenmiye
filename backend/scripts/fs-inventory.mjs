// Read-only inventory of Firestore + Storage. Run:
//   node --env-file=.env scripts/fs-inventory.mjs
import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  storageBucket,
});

const db = admin.firestore();

console.log('=== Firestore collections ===');
const cols = await db.listCollections();
const summary = [];
for (const c of cols) {
  const snap = await c.limit(3).get();
  const total = (await c.count().get()).data().count;
  const sampleFields = snap.docs[0] ? Object.keys(snap.docs[0].data()) : [];
  const sampleIds = snap.docs.map((d) => d.id);
  summary.push({ collection: c.id, count: total });
  console.log(`\n• ${c.id}  (${total} docs)`);
  console.log(`    sample ids: ${sampleIds.join(', ')}`);
  console.log(`    fields: ${sampleFields.join(', ')}`);
}

console.log('\n=== Storage ===');
try {
  const [files] = await admin.storage().bucket().getFiles();
  let bytes = 0;
  for (const f of files) bytes += Number(f.metadata.size ?? 0);
  console.log(`files: ${files.length}, total: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('sample paths:', files.slice(0, 5).map((f) => f.name).join(', '));
} catch (e) {
  console.log('storage error:', e.message);
}

console.log('\n=== TOTAL ===');
console.table(summary);
process.exit(0);
