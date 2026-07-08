# MongoDB Migration & Self-Hosted VPS Deployment

Status: **In progress** — Phase 1
Owner: Lebjawi Tech

This spec describes migrating the Tenmiye backend off Firebase-managed data
services onto a fully self-hosted VPS, and the working process we use to get
there. It is the source of truth for the "get it up and running" effort.

---

## 1. Goal

Run the entire application on a single VPS with the data layer **local**, so we
stop paying Google for hosted data. We keep two Google/Firebase services because
they are free/cheap and hard to replace well:

| Concern            | Before (managed)                     | After (self-hosted)              |
| ------------------ | ------------------------------------ | -------------------------------- |
| Database           | Firestore                            | **MongoDB on the VPS**           |
| File storage       | Firebase Cloud Storage               | **Local disk on the VPS**        |
| SMS OTP            | Firebase Phone Auth (Identity Toolkit) | **Keep** (Firebase, SMS only)  |
| Admin sign-in      | Google OAuth 2.0                     | **Keep** (Google OAuth)          |
| Frontend           | Next.js REST client                  | Unchanged                        |

### Why this is backend-only

- The **frontend has zero Firebase imports** — it is a pure REST client
  (`src/lib/api.ts` → `NEXT_PUBLIC_API_URL`). No frontend changes are required
  for the data migration.
- There are **no live counters** (`FieldValue.increment` is unused); vote and
  nomination results are computed by aggregating raw documents.
- `firebase-admin` stays installed, but only for phone auth (SMS) and, if kept,
  auth-user records. `FirebaseService` shrinks from `{ db, auth, storage }` to
  effectively `{ auth }`.

---

## 2. Working process

Two working copies with distinct roles:

| Location          | Role                                                  | Tracks                    |
| ----------------- | ---------------------------------------------------- | ------------------------- |
| dev workspace     | Write code, branch, push, open PRs                   | feature branches → `dev`  |
| `/opt/tenmiye`    | Runtime on the VPS — pull merged code, run & verify  | `dev`                     |

Canonical repo: `git@github.com:Lebjawi-Tech/tenmiye.git` (default branch `dev`).

**The loop:**

1. Branch off `dev`, do the work, push, open a PR into `dev`.
2. Reviewer merges + approves.
3. On the VPS: `cd /opt/tenmiye && git pull` the new `dev`, then verify it runs.
4. Repeat until the app is up and running.

Branch naming: `feature/*`, `fix/*`, `docs/*`, `chore/*`. Never commit to `main`
or `dev` directly.

---

## 3. Migration design

### 3.1 Database: Firestore → MongoDB (Mongoose)

Scope: **~163 Firestore call sites across 17 backend services.** Approach:
**idiomatic Mongoose** — one model per collection, each service rewritten to
native queries.

Translation reference:

| Firestore                                | MongoDB / Mongoose                          |
| ---------------------------------------- | ------------------------------------------- |
| `collection('x').doc(id).get()`          | `Model.findById(id).lean()`                 |
| `.doc(id).set(data)` / `.update(data)`   | `updateOne({ _id }, { $set }, { upsert })`  |
| `.where('a','==',v).where(...)`          | `find({ a: v, ... })`                       |
| Composite IDs `electionId_userId`        | Use as `_id` (uniqueness enforced for free) |
| `FieldValue.serverTimestamp()`           | `new Date()` (or Mongoose timestamps)       |
| `FieldValue.arrayUnion(...)`             | `$addToSet: { field: { $each } }`           |
| `Timestamp` fields                       | native `Date`                               |
| `.batch()`                               | `bulkWrite()`                               |
| `runTransaction`                         | `session.withTransaction()` — **needs replica set** |

`serializeDoc()` (Timestamp → ISO string) simplifies, since Mongo returns `Date`.

### 3.2 The one sharp edge: transactions require a replica set

`elections.service.ts` has **two `runTransaction` calls** (vote casting,
nomination submission) — the integrity-critical spots. MongoDB multi-document
transactions require a **replica set**, not a standalone `mongod`. We run Mongo
as a **single-node replica set** on the VPS (one config flag + `rs.initiate()`),
which makes `session.withTransaction()` map cleanly onto the existing logic.

### 3.3 File storage: Cloud Storage → local disk

Only **5 call sites**, all in `uploads.service.ts`. Store uploads under a data
directory, serve them via a static route, and replace signed-URL logic with
plain (or short-lived-token) URLs.

### 3.4 Keep: SMS OTP + Google OAuth

- SMS OTP continues via Firebase Identity Toolkit REST
  (`sendVerificationCode` / `signInWithPhoneNumber`) using `FIREBASE_WEB_API_KEY`.
- Admin Google sign-in continues via Passport Google OAuth.
- Firebase Admin `.auth` uses (`verifyIdToken`, `createUser`,
  `getUserByPhoneNumber`) are retained.

### 3.5 Seed & indexes

- Port `scripts/bootstrap.mjs` (seeds `settings/public`) to write to MongoDB.
- Recreate the indexes declared in `firestore.indexes.json` as MongoDB indexes
  (e.g. `users.phoneNumber`, election status filters) to avoid collection scans.

---

## 4. Environment variables

Backend `.env`:

- `JWT_SECRET`
- `MONGODB_URI` (e.g. `mongodb://127.0.0.1:27017/tenmiye?replicaSet=rs0`)
- `FIREBASE_WEB_API_KEY` (SMS OTP) — provided by owner
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` — provided by owner
- `FRONTEND_URL`, `PORT`
- Local storage dir + public base URL for uploads

Frontend `.env`:

- `NEXT_PUBLIC_API_URL`

---

## 5. VPS runtime

- Node ≥ 18 (VPS has v24), nginx installed.
- Install MongoDB (single-node replica set) and pm2.
- Run backend (`:8080`) and frontend (`:3000`) under pm2.
- nginx reverse-proxy + TLS.

Verify checklist:

- [ ] Landing page loads
- [ ] Admin Google sign-in works
- [ ] Member SMS OTP works
- [ ] A vote can be cast (transaction path)

---

## 6. Phased checklist

**Phase 0 — Repo & workspace wiring** *(done)*

- [x] Add `Lebjawi-Tech/tenmiye` as `upstream` in the dev workspace
- [x] Clone `Lebjawi-Tech/tenmiye` into `/opt/tenmiye` on `dev`
- [ ] Prove the PR loop with this doc PR

**Phase 1 — Get it running on the VPS (Mongo/local)**

- [ ] Install MongoDB (single-node replica set) + pm2
- [ ] Firestore → Mongoose models (17 services)
- [ ] Cloud Storage → local disk (uploads)
- [ ] Port seed script; create indexes
- [ ] Wire `.env`; run under pm2 behind nginx + TLS
- [ ] Verify landing, Google sign-in, SMS OTP, cast a vote

**Phase 2 — Deploy workflow**

- [ ] Add `.github/workflows/deploy.yml` (build/push + VPS pull), modeled on
      `Lebjawi-Tech/8amet`

---

## 7. Risks

- **No automated tests** in the repo — every migrated module (especially voting
  and nominations) needs careful manual verification.
- Transaction semantics differ between Firestore and MongoDB; the replica-set
  requirement is mandatory, not optional.
- Query-shape parity: Firestore composite queries must map to indexed Mongo
  queries, or performance regresses silently.
