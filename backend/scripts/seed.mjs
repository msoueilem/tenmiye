// Idempotent seed for a fresh MongoDB. Run:
//   docker compose run --rm backend node scripts/seed.mjs
// Uses MONGODB_URI from the environment.
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const ALL_PERMISSIONS = [
  'READ_ALL',
  'READ_MESSAGES',
  'MANAGE_REGISTRATIONS',
  'MANAGE_USERS',
  'MANAGE_BOARDS',
  'MANAGE_ELECTIONS',
  'MANAGE_FINANCE',
  'MANAGE_ANNOUNCEMENTS',
  'MANAGE_TIERS',
  'MANAGE_ROLES',
  'MODERATE_BLOG',
  'MANAGE_SETTINGS',
];

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'tenmiye.gdy@gmail.com';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();

  // --- settings/public (landing CMS content) ---
  await db.collection('settings').updateOne(
    { _id: 'public' },
    {
      $setOnInsert: {
        title: 'مجموعة الإرادة لتنمية الغدية',
        logoUrl: null,
        faviconUrl: null,
        aboutText: 'مجموعة الإرادة لتنمية الغدية — منصة الأعضاء والانتخابات.',
        membersCount: 0,
        projectsCount: 0,
        activeProjectsCount: 0,
        contact: { whatsapp: '', phone: '', email: ADMIN_EMAIL, address: '' },
        initiatives: [],
        achievements: [],
        teamHierarchy: { teams: [] },
        currentAspect: null,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  // --- default role (member) + admin role ---
  await db.collection('roles').updateOne(
    { slug: 'member' },
    {
      $setOnInsert: {
        name: 'عضو',
        slug: 'member',
        description: 'عضو في المجموعة',
        responsibilities: [],
        permissions: [],
        isActive: true,
        createdBy: 'seed',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  await db.collection('roles').updateOne(
    { slug: 'admin' },
    {
      $setOnInsert: {
        name: 'مدير',
        slug: 'admin',
        description: 'مدير النظام',
        responsibilities: [],
        permissions: ALL_PERMISSIONS,
        isActive: true,
        createdBy: 'seed',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  // --- default tier (basic) ---
  await db.collection('tiers').updateOne(
    { slug: 'basic' },
    {
      $setOnInsert: {
        name: 'أساسي',
        slug: 'basic',
        description: 'العضوية الأساسية',
        monthlyAmount: 0,
        isActive: true,
        createdBy: 'seed',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  // --- admin account (Google login grants full permissions) ---
  await db.collection('adminAccounts').updateOne(
    { googleEmail: ADMIN_EMAIL },
    {
      $setOnInsert: {
        googleEmail: ADMIN_EMAIL,
        userId: null,
        permissions: ALL_PERMISSIONS,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  const counts = {
    settings: await db.collection('settings').countDocuments(),
    roles: await db.collection('roles').countDocuments(),
    tiers: await db.collection('tiers').countDocuments(),
    adminAccounts: await db.collection('adminAccounts').countDocuments(),
  };
  console.log('Seed complete:', JSON.stringify(counts));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
