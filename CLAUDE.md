# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Project: Will Group for Development — Simple Landing Page

A Next.js 15 (App Router) + Firebase application for the "Will Group for Development" (مجموعة الإرادة لتنمية الغدية) in Mauritania. Combines a public Arabic landing page with an admin dashboard and a member voting/elections system.

---

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier (writes files)
npm run type-check   # tsc --noEmit (no build artifacts)
npm run clean        # Remove .next/

# Seed Firestore with initial data
node --env-file=.env scripts/bootstrap.mjs
```

No test runner is configured. Zero automated test coverage.

---

## Architecture

### Data flow

1. **Public reads** — Server Components fetch via Firebase Admin SDK (or Client SDK) and render HTML.
2. **Public writes** — Contact/Join forms write directly to Firestore using the Client SDK; append-only security rules guard them.
3. **Authenticated mutations** — Voting and admin operations go through Next.js Server Actions (`src/features/*/actions.ts`). The server verifies the Firebase ID token via Admin SDK, runs a Firestore transaction, then returns a result object.

### Key module boundaries

| Path | Role |
|---|---|
| `src/app/` | Routing layer — public routes (`/`, `/elections/[id]`, `/signin`) and protected admin routes (`/dashboard`) |
| `src/features/*/` | Domain logic. Each feature owns `api.client.ts` (Client SDK reads), `actions.ts` (Server Actions), `components/`, and `hooks/` |
| `src/components/` | Generic, reusable UI components (`Header`, `Footer`, `JoinForm`, UI primitives in `ui/`) |
| `src/lib/firebase/client.ts` | Single place to initialize the Firebase Client SDK (exports `db`, `auth`, `storage`) |
| `src/lib/firebase/admin.ts` | Single place to initialize the Firebase Admin SDK (exports `adminDb`, `adminAuth`) — **only import in Server Actions or Route Handlers** |
| `src/types/` | TypeScript interfaces shared across features |
| `src/context/DashboardContext.tsx` | React Context for admin session state |
| `firebase/firestore.rules` | Security rules — the authoritative source for access control |
| `scripts/bootstrap.mjs` | One-shot script to seed `settings-simple/public` |

### Real-time pattern

Election data uses `onSnapshot` listeners via custom hooks (`useElection`, `useMyVote`) so results update without polling. Only use this for data the user needs to watch live.

---

## Firestore conventions

- **All collection names end in `-simple`** (e.g., `elections-simple`, `votes-simple`).
- Never rename or delete an existing collection without explicit approval.
- Confirm the exact collection name before any new read/write.
- Vote document IDs use composite key: `${electionId}_${userId}` — this enforces uniqueness at the DB level.
- Use `FieldValue.increment()` for all counter updates. Never read-increment-write.
- Never maintain live vote counters — compute results by aggregating raw documents.

### Collections reference

| Collection | Contents |
|---|---|
| `settings-simple/public` | Landing page CMS content, initiatives, team hierarchy |
| `users-simple` | Private user data (phone, email, registration) |
| `public-members` | Public-facing member directory |
| `admins-simple` | Admin RBAC — keys are emails, `{ status: 'active' }` values |
| `elections-simple` | Election metadata (title, type, status, config, stats) |
| `votes-simple` | Cast votes, doc ID `electionId_userId` |
| `nominations-simple` | Private nomination log, doc ID `electionId_voterId_nomineeId` |
| `nomination-counts` | Public nomination tally, doc ID `electionId_nomineeId` |
| `join-requests-simple` | Membership form submissions (append-only) |
| `messages-simple` | Contact form submissions (append-only) |

---

## Code conventions

### UI & localization
- The entire UI is Arabic-only with `dir="rtl"`.
- Escape Arabic quotes in JSX with `&quot;` to avoid ESLint errors.
- Global CSS custom properties live in `src/app/globals.css` (e.g., `--color-primary` is the gold brand color).

### Adding new Firestore fields
When adding a new field to the landing page: update the interface in `src/features/landing/api.client.ts` **and** add the field to `scripts/bootstrap.mjs` so the seed data stays in sync.

### Client vs. Admin SDK
- `src/lib/firebase/client.ts` — Client-side only. Safe to import in Client Components and `api.client.ts` files.
- `src/lib/firebase/admin.ts` — Server-side only. Import only inside `actions.ts` files or Next.js Route Handlers. Never bundle into client code.

### Homepage caching
`src/app/page.tsx` sets `export const dynamic = 'force-dynamic'` and `export const revalidate = 0`, bypassing Next.js caching entirely. This is intentional for CMS freshness but has cost/performance implications at scale.

---

## Git workflow

### Before every commit
1. List every file you intend to stage.
2. Show the exact commit message.
3. Wait for explicit "yes" or "approved" before running `git add` / `git commit`.

### Never auto-push
Never run `git push` unless I explicitly say "push" after approving a commit.

### Branching
- Never work directly on `main`.
- Branch naming: `feature/short-description` or `fix/short-description`.
- Ask which branch to use before starting any task.
- Commit format: imperative mood, max 72 chars. E.g., `Add WhatsApp OTP auth endpoint`.

---

## Docs & specs

All documentation goes under `/docs/`:

| Subfolder | Contents |
|---|---|
| `/docs/architecture/` | System design, data models, diagrams |
| `/docs/specs/` | Feature specs and technical decisions |
| `/docs/api/` | API documentation |
| `/docs/guides/` | Setup and development guides |

Use kebab-case filenames that describe content — never date-prefix them.
If a brainstorm or design skill generates a spec file, save it in the appropriate subfolder.

---

## Before starting any task
1. Re-read this file.
2. Confirm scope if anything is ambiguous.
3. If the task involves a new feature, ask whether a spec/design doc exists before writing code.
4. If the task touches Firestore, confirm the target collection name before writing any read/write.
5. If the task involves new packages, list them and ask before installing.

---

## What not to do
- No `any` in TypeScript — use `unknown` and narrow.
- No bulk Firestore writes or schema changes without explicit approval.
- Do not modify existing working frontend code unless explicitly asked.
- Do not initialize Firebase outside `src/lib/firebase/client.ts` or `src/lib/firebase/admin.ts`.
- No secrets in code — `.env` files only.
