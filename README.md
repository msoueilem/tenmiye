# Will Group for Development — منصة مجموعة الإرادة لتنمية الغدية

A membership, voting/elections, and CMS platform for the "Will Group for
Development" in Mauritania. Public Arabic landing site + member area + admin
dashboard.

## Architecture

Three tiers, fully self-hostable on a single VPS:

| Tier | Stack | Notes |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind 4 | Arabic, RTL. Pure REST client. |
| **Backend** | NestJS 10 REST API | Served under **`/api`**. Swagger at `/api/docs`, OpenAPI at `/api/openapi.json`. |
| **Database** | MongoDB (single-node replica set) | Replica set is required for multi-document transactions (voting). |
| **File storage** | Local disk | Served at `/uploads`. |
| **Auth** | JWT (member + admin). SMS OTP via Firebase Phone Auth; admin sign-in via Google OAuth | Firebase is used **only** for SMS + OAuth — not for data. |

The frontend talks to the backend over REST; the backend owns all data access
(Mongoose) and auth.

## Run with Docker (recommended)

Everything (Mongo + backend + frontend + an nginx gateway) runs via
`docker-compose`, exposed on a single port.

1. **Backend secrets** — copy the template and fill it in:
   ```bash
   cp deploy/backend.env.example deploy/backend.env
   # set JWT_SECRET, FIREBASE_*, GOOGLE_* (and optionally SEED_ADMIN_EMAIL)
   ```

2. **Public URL + port** — create `.env` in the repo root (used by compose):
   ```env
   PUBLIC_URL=http://YOUR_HOST:8095
   GATEWAY_PORT=8095
   ```

3. **Build & start:**
   ```bash
   docker compose up -d --build
   ```

4. **Seed initial data** (settings, roles, tiers, admin account) — idempotent:
   ```bash
   docker compose run --rm backend node scripts/seed.mjs
   ```

The app is then available at `PUBLIC_URL`:

- Site: `PUBLIC_URL/`
- API: `PUBLIC_URL/api` · Swagger: `PUBLIC_URL/api/docs` · OpenAPI: `PUBLIC_URL/api/openapi.json`
- Uploads: `PUBLIC_URL/uploads/<path>`

> **Google admin sign-in** requires a real domain (Google OAuth rejects bare IPs).
> Set `GOOGLE_CALLBACK_URL=https://your-domain/api/auth/google/callback` and add
> the same redirect URI in the Google Cloud console. Member SMS-OTP login and the
> public site work on an IP.

## Local development (without Docker)

Requires Node ≥ 18 and a local MongoDB running as a single-node replica set.

```bash
# backend
cd backend
cp .env.example .env        # fill in secrets; MONGODB_URI defaults to the local rs0
npm install
npm run start:dev           # http://localhost:8080/api  (docs at /api/docs)

# frontend (repo root, separate shell)
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run dev   # http://localhost:3000
```

### Frontend scripts
- `npm run dev` / `build` / `start` — Next.js dev / production build / serve
- `npm run lint` · `npm run format` · `npm run type-check`

### Backend scripts (in `backend/`)
- `npm run start:dev` — watch mode
- `npm run build` · `npm run type-check` · `npm run lint`
- `node scripts/seed.mjs` — seed a fresh database

## Environment variables

**Backend** (`backend/.env` or `deploy/backend.env`): `JWT_SECRET`, `MONGODB_URI`,
`PORT`, `FRONTEND_URL`, `UPLOADS_DIR`, `UPLOADS_PUBLIC_BASE_URL`,
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
`FIREBASE_WEB_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALLBACK_URL`.

**Frontend**: `NEXT_PUBLIC_API_URL` (browser, build-time), `API_INTERNAL_URL`
(server-side, optional — used in Docker to reach the backend internally).

## Notes

- UI is Arabic-only with `dir="rtl"`.
- Migration from Firebase Firestore/Storage to MongoDB + local disk is tracked in
  `docs/specs/mongodb-migration-and-vps-deployment.md`.
