// Export Firestore + Storage -> import into MongoDB (remap IDs to ObjectIds).
// Runs inside the backend container network (reaches mongo + the uploads volume).
//   docker run --rm --network tenmiye_default \
//     -v tenmiye_uploads-data:/data/uploads -v <scripts>:/scripts \
//     --env-file deploy/backend.env \
//     -e MONGODB_URI=mongodb://mongo:27017/tenmiye?replicaSet=rs0 \
//     -e UPLOADS_DIR=/data/uploads -e UPLOADS_PUBLIC_BASE_URL=http://HOST:8095 \
//     tenmiye-backend node /scripts/import-firestore.mjs
import admin from 'firebase-admin';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

const { Types } = mongoose;
const PUBLIC_BASE = (process.env.UPLOADS_PUBLIC_BASE_URL ?? 'http://localhost:8095').replace(/\/+$/, '');
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/data/uploads';

const projectId = process.env.FIREBASE_PROJECT_ID;
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
});
const fdb = admin.firestore();
const bucket = admin.storage().bucket();

// ---- helpers ----
const Timestamp = admin.firestore.Timestamp;
function deepConvert(v) {
  if (v instanceof Timestamp) return v.toDate();
  if (Array.isArray(v)) return v.map(deepConvert);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = deepConvert(val);
    return o;
  }
  return v;
}

async function loadAll(col) {
  const snap = await fdb.collection(col).get();
  return snap.docs.map((d) => ({ fid: d.id, data: deepConvert(d.data()) }));
}

// ---- connect Mongo ----
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
console.log('connected to mongo');

// ---- PASS 1: load source + assign ObjectIds, build maps ----
const src = {};
for (const c of ['roles', 'tiers', 'users', 'files', 'uploads', 'adminAccounts', 'messages', 'announcements']) {
  src[c] = await loadAll(c);
  console.log(`loaded ${c}: ${src[c].length}`);
}
const settingsPublic = deepConvert((await fdb.collection('settings').doc('public').get()).data() ?? {});

const oid = {}; // collection -> Map(fid -> ObjectId)
for (const c of Object.keys(src)) {
  oid[c] = new Map();
  for (const { fid } of src[c]) oid[c].set(fid, new Types.ObjectId());
}
// uploads map spans BOTH `files` and legacy `uploads` (both land in Mongo `uploads`)
const uploadMap = new Map();
for (const { fid } of src.files) uploadMap.set(fid, oid.files.get(fid));
for (const { fid } of src.uploads) uploadMap.set(fid, oid.uploads.get(fid));

const ref = (map, id) => (id && map.has(id) ? map.get(id) : null);
const userRef = (id) => ref(oid.users, id);

// ---- Storage download (best-effort) ----
async function pullFile(storagePath) {
  if (!storagePath) return { ok: false };
  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) return { ok: false, reason: 'missing' };
    const [buf] = await file.download();
    const dest = join(UPLOADS_DIR, storagePath);
    await fs.mkdir(dirname(dest), { recursive: true });
    await fs.writeFile(dest, buf);
    return { ok: true, size: buf.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
const localUrl = (storagePath) =>
  `${PUBLIC_BASE}/uploads/${storagePath.split('/').map(encodeURIComponent).join('/')}`;

// ---- PASS 2: transform + insert ----
async function replaceColl(name, docs) {
  await db.collection(name).deleteMany({});
  if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
  console.log(`  ${name}: inserted ${docs.length}`);
}

const stats = { storageOk: 0, storageFail: 0 };

// roles
await replaceColl(
  'roles',
  src.roles.map(({ fid, data: d }) => ({
    _id: oid.roles.get(fid),
    name: d.name, slug: d.slug, description: d.description ?? undefined,
    responsibilities: d.responsibilities ?? [], permissions: d.permissions ?? [],
    isActive: d.isActive ?? true, createdBy: d.createdBy ?? 'import',
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  })),
);

// tiers
await replaceColl(
  'tiers',
  src.tiers.map(({ fid, data: d }) => ({
    _id: oid.tiers.get(fid),
    name: d.name, slug: d.slug, description: d.description ?? undefined,
    monthlyAmount: d.monthlyAmount ?? 0, isActive: d.isActive ?? true,
    createdBy: d.createdBy ?? 'import',
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  })),
);

// uploads (files + legacy) with storage download
const uploadDocs = [];
for (const { fid, data: d } of src.files) {
  const storagePath = d.storagePath;
  const dl = await pullFile(storagePath);
  dl.ok ? stats.storageOk++ : stats.storageFail++;
  uploadDocs.push({
    _id: oid.files.get(fid),
    originalName: d.originalName ?? 'file',
    mimeType: d.mimeType ?? 'application/octet-stream',
    extension: (d.originalName?.split('.').pop() ?? 'bin').toLowerCase(),
    sizeBytes: d.sizeBytes ?? 0,
    storagePath: storagePath ?? '',
    downloadUrl: dl.ok ? localUrl(storagePath) : (d.downloadUrl ?? null),
    ownerType: d.ownerType ?? 'user',
    ownerId: (d.ownerType === 'user' && userRef(d.ownerRef)) ? String(userRef(d.ownerRef)) : (d.ownerRef ?? ''),
    purpose: d.category ?? 'file',
    status: d.status ?? 'active', validationStatus: 'passed', validationErrors: d.validationErrors ?? null,
    uploadedBy: d.uploadedBy ? String(userRef(d.uploadedBy) ?? d.uploadedBy) : 'import',
    uploadedAt: d.uploadedAt ?? d.createdAt ?? new Date(),
    deleted: d.deleted ?? false, deletedAt: d.deletedAt ?? null,
    storageDeleted: false, storageDeletedAt: null,
    dimensions: d.dimensions ?? null, thumbnailPath: d.thumbnailPath ?? null, thumbnailUrl: d.thumbnailUrl ?? null,
    referenceCount: d.referenceCount ?? 0, history: [], updatedBy: null,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  });
}
for (const { fid, data: d } of src.uploads) {
  const storagePath = d.path;
  const dl = await pullFile(storagePath);
  dl.ok ? stats.storageOk++ : stats.storageFail++;
  uploadDocs.push({
    _id: oid.uploads.get(fid),
    originalName: d.originalName ?? 'file',
    mimeType: 'application/octet-stream',
    extension: (d.originalName?.split('.').pop() ?? 'bin').toLowerCase(),
    sizeBytes: 0, storagePath: storagePath ?? '',
    downloadUrl: dl.ok ? localUrl(storagePath) : (d.url ?? null),
    ownerType: 'legacy', ownerId: '', purpose: 'legacy',
    status: 'active', validationStatus: 'passed', validationErrors: null,
    uploadedBy: 'import', uploadedAt: d.createdAt ?? new Date(),
    deleted: false, deletedAt: null, storageDeleted: false, storageDeletedAt: null,
    dimensions: null, thumbnailPath: null, thumbnailUrl: null,
    referenceCount: 0, history: [], updatedBy: null,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.createdAt ?? new Date(),
  });
}
await replaceColl('uploads', uploadDocs);

// users
await replaceColl(
  'users',
  src.users.map(({ fid, data: d }) => ({
    _id: oid.users.get(fid),
    fullName: d.fullName ?? '', fullNameAr: d.fullNameAr ?? null, fullNameFr: d.fullNameFr ?? null,
    whatsappNumber: d.whatsappNumber ?? null, phoneNumber: d.phoneNumber ?? null,
    nationalId: d.nationalId ?? null, city: d.city ?? null,
    regionId: d.regionId ?? d.region ?? null,
    roleId: ref(oid.roles, d.roleId) ? String(ref(oid.roles, d.roleId)) : null,
    tierId: ref(oid.tiers, d.tierId) ? String(ref(oid.tiers, d.tierId)) : null,
    profilePictureId: ref(uploadMap, d.profilePictureId) ? String(ref(uploadMap, d.profilePictureId)) : null,
    joinRequestId: d.joinRequestId ?? null,
    outsidePlatform: d.outsidePlatform ?? false, isBlocked: d.isBlocked ?? false, outsideWhatsapp: d.outsideWhatsapp ?? false,
    status: d.status ?? 'pending',
    approvedBy: d.approvedBy ? String(userRef(d.approvedBy) ?? d.approvedBy) : null,
    approvedAt: d.approvedAt ?? null, lastLoginAt: d.lastLoginAt ?? null,
    passwordHash: d.passwordHash ?? null,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  })),
);

// adminAccounts
await replaceColl(
  'adminAccounts',
  src.adminAccounts.map(({ fid, data: d }) => ({
    _id: oid.adminAccounts.get(fid),
    googleEmail: d.googleEmail, userId: d.userId ? String(userRef(d.userId) ?? d.userId) : null,
    permissions: d.permissions ?? [], status: d.status ?? 'active',
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  })),
);

// messages
await replaceColl(
  'messages',
  src.messages.map(({ fid, data: d }) => ({
    _id: oid.messages.get(fid),
    name: d.name ?? '', body: d.body ?? '', email: d.email ?? undefined, phone: d.phone ?? undefined,
    read: d.read ?? false, readAt: d.readAt ?? null,
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? d.createdAt ?? new Date(),
  })),
);

// announcements (best-effort mapping from the drifted Firestore schema)
await replaceColl(
  'announcements',
  src.announcements.map(({ fid, data: d }) => ({
    _id: oid.announcements.get(fid),
    message: d.content ?? d.title ?? '', type: 'info',
    isActive: !(d.deleted || d.deletedAt),
    startDate: null, endDate: d.expiresAt ?? null,
    ctaLabel: null, ctaUrl: null,
    createdBy: d.author ? String(userRef(d.author) ?? d.author) : 'import',
    createdAt: d.createdAt ?? new Date(), updatedAt: d.updatedAt ?? new Date(),
  })),
);

// settings/public (singleton, keep _id 'public')
await db.collection('settings').deleteMany({});
await db.collection('settings').insertOne({ _id: 'public', ...settingsPublic, updatedAt: settingsPublic.updatedAt ?? new Date() });
console.log('  settings: inserted public');

// persist id maps for later module migrations (elections/finance/... reference these)
await db.collection('_idmap').deleteMany({});
const mapDocs = [];
for (const c of Object.keys(oid)) for (const [fid, o] of oid[c]) mapDocs.push({ collection: c, firestoreId: fid, objectId: o });
if (mapDocs.length) await db.collection('_idmap').insertMany(mapDocs, { ordered: false });

console.log('\nStorage:', JSON.stringify(stats));
console.log('ID maps persisted to _idmap:', mapDocs.length);
console.log('DONE');
await mongoose.disconnect();
process.exit(0);
