// Second-pass import: elections, votes, nominations (subcollections), boards,
// blogs, transactions, paymentChannels, join-requests, refreshTokens.
// Reuses the `_idmap` persisted by import-firestore.mjs to remap user/tier/
// role/upload references, and assigns new ObjectIds to the collections here.
// Run the same way as import-firestore.mjs (one-off container on the network).
import admin from 'firebase-admin';
import mongoose from 'mongoose';

const { Types } = mongoose;
const projectId = process.env.FIREBASE_PROJECT_ID;
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  }),
});
const fdb = admin.firestore();
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

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// ── load existing id maps ──
const maps = {};
for (const m of await db.collection('_idmap').find().toArray()) {
  (maps[m.collection] ??= new Map()).set(m.firestoreId, String(m.objectId));
}
const mapUser = (fid) => (fid && maps.users?.get(fid)) || null;
const mapTier = (fid) => (fid && maps.tiers?.get(fid)) || null;
const mapRole = (fid) => (fid && maps.roles?.get(fid)) || null;
const mapUpload = (fid) => (fid && (maps.files?.get(fid) || maps.uploads?.get(fid))) || null;

// ── load source (top-level) ──
async function loadAll(col) {
  const snap = await fdb.collection(col).get();
  return snap.docs.map((d) => ({ fid: d.id, data: deepConvert(d.data()) }));
}
const src = {};
for (const c of ['elections', 'boards', 'blogs', 'transactions', 'paymentChannels', 'join-requests', 'refreshTokens']) {
  src[c] = await loadAll(c);
  console.log(`loaded ${c}: ${src[c].length}`);
}

// assign new ids
const oid = {};
for (const c of Object.keys(src)) {
  oid[c] = new Map();
  for (const { fid } of src[c]) oid[c].set(fid, new Types.ObjectId());
}
const mapElection = (fid) => (fid && oid.elections.get(fid) && String(oid.elections.get(fid))) || null;
const mapBoard = (fid) => (fid && oid.boards.get(fid) && String(oid.boards.get(fid))) || null;

async function replaceColl(name, docs) {
  await db.collection(name).deleteMany({});
  if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
  console.log(`  ${name}: inserted ${docs.length}`);
}

// ── elections ──
const remapNominee = (n) => ({ ...n, userId: mapUser(n.userId) ?? n.userId });
const remapResults = (res) => {
  if (!res || typeof res !== 'object') return res;
  const out = { ...res };
  if (Array.isArray(res.rankings)) out.rankings = res.rankings.map((r) => ({ ...r, candidateUserId: mapUser(r.candidateUserId) ?? r.candidateUserId }));
  if (Array.isArray(res.winners)) out.winners = res.winners.map((u) => mapUser(u) ?? u);
  if (Array.isArray(res.shortlist)) out.shortlist = res.shortlist.map((u) => mapUser(u) ?? u);
  return out;
};
await replaceColl(
  'elections',
  src.elections.map(({ fid, data: d }) => ({
    _id: oid.elections.get(fid),
    ...d,
    nominees: Array.isArray(d.nominees) ? d.nominees.map(remapNominee) : d.nominees ?? null,
    results: remapResults(d.results ?? null),
    createdBy: mapUser(d.createdBy) ?? d.createdBy ?? 'import',
  })),
);

// ── votes (top-level; composite _id) ──
const votesSrc = await loadAll('votes');
console.log(`loaded votes: ${votesSrc.length}`);
const voteDocs = [];
for (const { data: d } of votesSrc) {
  const el = mapElection(d.electionId);
  const uid = mapUser(d.userId);
  if (!el || !uid) continue; // election/user not imported — skip orphan
  const choices = d.electionType === 'board' && Array.isArray(d.choices)
    ? d.choices.map((c) => mapUser(c) ?? c)
    : d.choices ?? [];
  voteDocs.push({ _id: `${el}_${uid}`, electionId: el, userId: uid, electionType: d.electionType ?? null, choices, castAt: d.castAt ?? null });
}
await replaceColl('votes', voteDocs);

// ── nominations (Firestore subcollections under each election) ──
const nominationDocs = [];
for (const { fid } of src.elections) {
  const el = mapElection(fid);
  const subSnap = await fdb.collection('elections').doc(fid).collection('nominations').get();
  for (const nomDoc of subSnap.docs) {
    const d = deepConvert(nomDoc.data());
    const nominator = mapUser(nomDoc.id) ?? mapUser(d.nominatorUserId);
    if (!el || !nominator) continue;
    nominationDocs.push({
      _id: `${el}_${nominator}`,
      electionId: el,
      nominatorUserId: nominator,
      nominees: Array.isArray(d.nominees) ? d.nominees.map((u) => mapUser(u) ?? u) : [],
      round: d.round ?? 1,
      submittedAt: d.submittedAt ?? null,
    });
  }
}
await replaceColl('nominations', nominationDocs);

// ── boards (best-effort; schema drift) ──
await replaceColl(
  'boards',
  src.boards.map(({ fid, data: d }) => ({
    _id: oid.boards.get(fid),
    ...d,
    roleIds: Array.isArray(d.roleIds) ? d.roleIds.map((r) => mapRole(r) ?? r) : (d.roleIds ?? []),
    logoUploadId: mapUpload(d.logoUploadId ?? d.logoRef) ?? null,
    electionId: mapElection(d.electionId) ?? d.electionId ?? null,
    predecessorBoardId: mapBoard(d.predecessorBoardId) ?? d.predecessorBoardId ?? null,
  })),
);

// ── blogs (strict:false schema preserves extra fields) ──
await replaceColl(
  'blogs',
  src.blogs.map(({ fid, data: d }) => ({
    _id: oid.blogs.get(fid),
    ...d,
    featureImageId: mapUpload(d.featureImageId ?? d.featureImageRef) ?? null,
    authorId: mapUser(d.authorId ?? d.createdBy) ?? null,
    status: d.status ?? 'draft',
  })),
);

// ── transactions (best-effort) ──
await replaceColl(
  'transactions',
  src.transactions.map(({ fid, data: d }) => {
    const date = d.date instanceof Date ? d.date : d.createdAt instanceof Date ? d.createdAt : new Date();
    return {
      _id: oid.transactions.get(fid),
      ...d,
      userId: mapUser(d.userId) ?? d.userId ?? null,
      recordedBy: mapUser(d.recordedBy ?? d.createdBy) ?? d.createdBy ?? 'import',
      date,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      paymentChannelId: d.paymentChannelId ?? null,
    };
  }),
);

// ── paymentChannels (clean) ──
await replaceColl(
  'paymentChannels',
  src.paymentChannels.map(({ fid, data: d }) => ({ _id: oid.paymentChannels.get(fid), ...d })),
);

// ── join-requests ──
await replaceColl(
  'join-requests',
  src['join-requests'].map(({ fid, data: d }) => ({
    _id: oid['join-requests'].get(fid),
    ...d,
    tierId: mapTier(d.tierId) ?? d.tierId ?? null,
    reviewedBy: mapUser(d.reviewedBy) ?? d.reviewedBy ?? null,
    createdUserId: mapUser(d.createdUserId) ?? d.createdUserId ?? null,
  })),
);

// ── refreshTokens (preserve active sessions) ──
await replaceColl(
  'refreshTokens',
  src.refreshTokens
    .map(({ data: d }) => ({ userId: mapUser(d.userId), tokenHash: d.tokenHash, expiresAt: d.expiresAt ?? null }))
    .filter((t) => t.userId && t.tokenHash),
);

// persist new id maps
const mapDocs = [];
for (const c of Object.keys(oid)) for (const [fid, o] of oid[c]) mapDocs.push({ collection: c, firestoreId: fid, objectId: o });
if (mapDocs.length) await db.collection('_idmap').insertMany(mapDocs, { ordered: false });

console.log('id maps added to _idmap:', mapDocs.length);
console.log('DONE');
await mongoose.disconnect();
process.exit(0);
