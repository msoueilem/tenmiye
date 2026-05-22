# RBAC Permissions — v2 Design & Gap Analysis

> **Status:** Design finalized. Not yet implemented. This document is the authoritative target state.
> Every gap listed below maps to a concrete code change required before the new permission model is live.

---

## Design Philosophy

```
Public readers  →  see announcements, blog posts, boards list (no login)
Any member JWT  →  see elections, tiers, finance summary+transactions, member directory
Permission-gated  →  management operations (create, update) and sensitive reads
Admin only  →  all DELETE endpoints + admin-accounts CRUD
```

Members manage day-to-day operations. Admins bootstrap and hard-delete. No member can delete anything.

---

## New Permission Enum (12 permissions)

Replaces the current 14-permission enum.

```typescript
export enum Permission {
  // ── Default baseline ───────────────────────────────────────────────
  READ_ALL = 'READ_ALL',
  // Non-removable. Every role gets this. Grants read access to:
  // elections, tiers, finance summary + transactions, member directory,
  // boards (also public), own profile. Does NOT include messages or join requests.

  // ── Sensitive reads ────────────────────────────────────────────────
  READ_MESSAGES = 'READ_MESSAGES',
  // Read contact form submissions and mark them as read.
  // (Was: READ_ALL — name reused for the wrong scope)

  // ── Management permissions ─────────────────────────────────────────
  MANAGE_REGISTRATIONS = 'MANAGE_REGISTRATIONS',  // read + approve/reject join requests
  MANAGE_USERS = 'MANAGE_USERS',                  // update/block/deactivate users
  MANAGE_BOARDS = 'MANAGE_BOARDS',                // create + update boards
  MANAGE_ELECTIONS = 'MANAGE_ELECTIONS',          // create + update + advance + finalize elections
  MANAGE_FINANCE = 'MANAGE_FINANCE',              // all finance writes + payment channel management
  MANAGE_ANNOUNCEMENTS = 'MANAGE_ANNOUNCEMENTS',  // create + update + toggle announcements
  MANAGE_TIERS = 'MANAGE_TIERS',                  // create + update + toggle tiers
  MANAGE_ROLES = 'MANAGE_ROLES',                  // create + update + toggle roles
  MODERATE_BLOG = 'MODERATE_BLOG',               // full blog: create, edit, publish/archive
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',            // reserved — future system-wide config
}
```

### What was removed and why

| Old permission | Reason removed |
|---|---|
| `MANAGE_ACCESS` | Renamed → `MANAGE_ROLES` (clearer scope) |
| `MANAGE_PAYMENT_CHANNELS` | Merged → `MANAGE_FINANCE` (finance is one domain) |
| `RECORD_CONTRIBUTIONS` | Merged → `MANAGE_FINANCE` |
| `VERIFY_CONTRIBUTIONS` | Merged → `MANAGE_FINANCE` |
| `RECORD_EXPENSES` | Merged → `MANAGE_FINANCE` |
| `WRITE_BLOG` | Merged → `MODERATE_BLOG` (no reason to split write from publish) |
| `READ_FINANCE` | Finance read is default for all members (READ_ALL baseline) |

---

## Target Endpoint Access Matrix

### Public (no JWT required)

| Endpoint | Method |
|---|---|
| /announcements | GET (active only) |
| /blog/posts | GET (published only) |
| /blog/posts/:id | GET |
| /boards | GET |
| /boards/:id | GET |
| /elections | GET |
| /elections/:id | GET |
| /elections/:id/results | GET |
| /elections/:id/nominations/top | GET |
| /tiers | GET (list, for registration form) |
| /registrations | POST (join form) |
| /messages | POST (contact form) |
| /auth/* | various |

### Any valid JWT (READ_ALL baseline — all members)

| Endpoint | Method | Notes |
|---|---|---|
| /me | GET + PATCH | own profile |
| /users | GET | member directory |
| /users/:id | GET | single member |
| /finance/transactions | GET | |
| /finance/summary | GET | requires ?year= |
| /elections/:id/my-vote | GET | |
| /elections/:id/nominations | POST | member type only |
| /elections/:id/nominations/me | DELETE | own nomination only |
| /elections/:id/votes | POST | member type only |

### Permission-gated (member + permission)

| Endpoint | Method | Permission |
|---|---|---|
| /messages | GET | READ_MESSAGES |
| /messages/:id/read | PATCH | READ_MESSAGES |
| /registrations | GET | MANAGE_REGISTRATIONS |
| /registrations/:id/status | PATCH | MANAGE_REGISTRATIONS |
| /users | POST | MANAGE_USERS |
| /users/:id | PATCH | MANAGE_USERS |
| /boards | POST | MANAGE_BOARDS |
| /boards/:id | PATCH | MANAGE_BOARDS |
| /elections | POST | MANAGE_ELECTIONS |
| /elections/:id | PATCH | MANAGE_ELECTIONS |
| /elections/:id/advance | POST | MANAGE_ELECTIONS |
| /elections/:id/finalize | POST | MANAGE_ELECTIONS |
| /finance/payment-channels | GET | MANAGE_FINANCE |
| /finance/payment-channels | POST | MANAGE_FINANCE |
| /finance/payment-channels/:id | PATCH | MANAGE_FINANCE |
| /finance/transactions | POST | MANAGE_FINANCE |
| /finance/transactions/:id/verify | PATCH | MANAGE_FINANCE |
| /finance/transactions/:id/disable | PATCH | MANAGE_FINANCE |
| /announcements/all | GET | MANAGE_ANNOUNCEMENTS |
| /announcements/:id | GET | MANAGE_ANNOUNCEMENTS |
| /announcements | POST | MANAGE_ANNOUNCEMENTS |
| /announcements/:id | PATCH | MANAGE_ANNOUNCEMENTS |
| /tiers/:id | GET | MANAGE_TIERS |
| /tiers | POST | MANAGE_TIERS |
| /tiers/:id | PATCH | MANAGE_TIERS |
| /roles | GET | MANAGE_ROLES |
| /roles/:id | GET | MANAGE_ROLES |
| /roles | POST | MANAGE_ROLES |
| /roles/:id | PATCH | MANAGE_ROLES |
| /blog/posts/all | GET | MODERATE_BLOG |
| /blog/posts | POST | MODERATE_BLOG |
| /blog/posts/:id | PATCH | MODERATE_BLOG |
| /blog/posts/:id/status | PATCH | MODERATE_BLOG |

### Admin only

All DELETE endpoints on every collection, plus:

| Endpoint | Method |
|---|---|
| /admin-accounts | GET, POST, PATCH, DELETE |
| /admin-accounts/:id | GET, PATCH, DELETE |

---

## Gap Analysis — Backend

### 1. Permission Enum (`backend/src/common/enums/permission.enum.ts`)

**Current:** 14 values including `MANAGE_ACCESS`, `MANAGE_PAYMENT_CHANNELS`, `RECORD_CONTRIBUTIONS`, `VERIFY_CONTRIBUTIONS`, `RECORD_EXPENSES`, `WRITE_BLOG`, `READ_FINANCE`

**Required changes:**
- Remove 7 values listed above
- Add `READ_MESSAGES`, `MANAGE_ANNOUNCEMENTS`, `MANAGE_TIERS`, `MANAGE_ROLES`, `MANAGE_FINANCE`
- Keep: `READ_ALL`, `MANAGE_REGISTRATIONS`, `MANAGE_USERS`, `MANAGE_BOARDS`, `MANAGE_ELECTIONS`, `MODERATE_BLOG`, `MANAGE_SETTINGS`

---

### 2. Controller Guard Changes

#### `announcements.controller.ts`
| Current | Fix |
|---|---|
| `MANAGE_SETTINGS` on GET /all, GET /:id, POST, PATCH | Change to `MANAGE_ANNOUNCEMENTS` |
| GET / (active) — already public | ✅ no change |
| DELETE /:id — already admin-only | ✅ no change |

#### `blog.controller.ts`
| Current | Fix |
|---|---|
| `WRITE_BLOG` on GET /all, POST, PATCH | Change to `MODERATE_BLOG` |
| GET /, GET /:id — already public | ✅ no change |
| PATCH /:id/status — already `MODERATE_BLOG` | ✅ no change |
| DELETE /:id — already admin-only | ✅ no change |

#### `boards.controller.ts`
| Current | Fix |
|---|---|
| Class-level `@UseGuards(JwtAuthGuard, PermissionsGuard)` makes GET / and GET /:id require JWT | Override GET methods to be public (remove class-level guard, add per-method guards on POST/PATCH/DELETE) |
| POST, PATCH use `MANAGE_BOARDS` | ✅ no change |
| DELETE — already admin-only | ✅ no change |

#### `finance.controller.ts`
| Current | Fix |
|---|---|
| `READ_FINANCE` on GET /transactions | Remove `@RequirePermissions` → JWT-only (default member access) |
| `READ_FINANCE` on GET /summary | Remove `@RequirePermissions` → JWT-only |
| `MANAGE_PAYMENT_CHANNELS` on POST, PATCH payment-channels | Change to `MANAGE_FINANCE` |
| GET /payment-channels — unclear (class-level only?) | Add `@RequirePermissions(MANAGE_FINANCE)` |
| `RECORD_CONTRIBUTIONS` on POST /transactions | Change to `MANAGE_FINANCE` |
| `VERIFY_CONTRIBUTIONS` on PATCH /transactions/:id/verify | Change to `MANAGE_FINANCE` |
| PATCH /transactions/:id/disable — **does not exist** | Add new endpoint with `MANAGE_FINANCE` |
| DELETE /payment-channels/:id — already admin-only | ✅ no change |

#### `messages.controller.ts`
| Current | Fix |
|---|---|
| `READ_ALL` on GET /, PATCH /:id/read | Change to `READ_MESSAGES` |
| POST / — already public | ✅ no change |

#### `roles.controller.ts`
| Current | Fix |
|---|---|
| Class-level `MANAGE_ACCESS` on all endpoints | Change to `MANAGE_ROLES` |
| DELETE /:id — already admin-only | ✅ no change |

#### `tiers.controller.ts`
| Current | Fix |
|---|---|
| Class-level `MANAGE_SETTINGS` on ALL endpoints including GET / | GET / must be public (registration form). Remove class-level guard. Make GET / public, add `MANAGE_TIERS` on GET /:id, POST, PATCH |
| DELETE /:id — already admin-only | ✅ no change |

#### `users.controller.ts`
| Current | Fix |
|---|---|
| Class-level `MANAGE_USERS` on ALL endpoints including GET / and GET /:id | GET /, GET /:id → JWT-only (any member can read directory). Override at method level. |
| POST, PATCH → already `MANAGE_USERS` | ✅ no change |
| DELETE /:id — already admin-only | ✅ no change |

---

### 3. Missing Endpoint

| Endpoint | Method | Permission | Status |
|---|---|---|---|
| /finance/transactions/:id/disable | PATCH | MANAGE_FINANCE | ❌ Does not exist — must be created |

This endpoint sets `isActive: false` on a transaction. Members use this instead of delete to invalidate incorrect entries.

---

### 4. Missing Model Fields

| Collection | Missing fields | Required for |
|---|---|---|
| `roles` | `isActive: boolean` | Enable/disable role toggle |
| `tiers` | `isActive: boolean` | Enable/disable tier toggle |
| `users` | `isBlocked: boolean` | Block/unblock member |
| `users` | `outsideWhatsapp: boolean` | Flag member as outside WhatsApp group |

These fields must be added to the Firestore documents, DTOs, and update service methods.

---

## Gap Analysis — Frontend

### 1. `src/lib/permissions.ts`

Must be kept in sync with the backend enum. Remove the 7 old values, add the 5 new ones. This file is the source of truth for all frontend permission checks.

### 2. `src/components/dashboard/DashboardShell.tsx` — Sidebar

| Sidebar item | Current permission gate | Target |
|---|---|---|
| Boards | `MANAGE_BOARDS` | None — always visible (boards are public, read by default) |
| Announcements | `MANAGE_SETTINGS` | `MANAGE_ANNOUNCEMENTS` |
| Finance | `READ_FINANCE` \| `RECORD_CONTRIBUTIONS` \| `RECORD_EXPENSES` | None — always visible (finance read is default) |
| Messages | `READ_ALL` | `READ_MESSAGES` |
| Blog | `WRITE_BLOG` \| `MODERATE_BLOG` | `MODERATE_BLOG` only |
| Roles | `MANAGE_ACCESS` | `MANAGE_ROLES` |
| Tiers | `MANAGE_SETTINGS` | `MANAGE_TIERS` |
| Members | `MANAGE_USERS` | None — always visible (directory read is default) |

### 3. Page-level Permission Checks

Each dashboard page checks `user.permissions` to show/hide action buttons. These checks must be updated:

| Page | Current check | Target check |
|---|---|---|
| `/dashboard/announcements` | `MANAGE_SETTINGS` | `MANAGE_ANNOUNCEMENTS` |
| `/dashboard/finance` | `READ_FINANCE` (gate for whole page) | No gate — show read content always; show write actions only with `MANAGE_FINANCE` |
| `/dashboard/finance` | `RECORD_CONTRIBUTIONS` \| `RECORD_EXPENSES` for write | `MANAGE_FINANCE` |
| `/dashboard/blog` | `WRITE_BLOG` | `MODERATE_BLOG` |
| `/dashboard/roles` | `MANAGE_ACCESS` | `MANAGE_ROLES` |
| `/dashboard/tiers` | `MANAGE_SETTINGS` | `MANAGE_TIERS` |
| `/dashboard/members` | `MANAGE_USERS` (gates the whole page) | No gate — always visible; show create/block actions only with `MANAGE_USERS` |
| `/dashboard/boards` | `MANAGE_BOARDS` (gates the whole page?) | No gate — always visible; show create/edit actions only with `MANAGE_BOARDS` |
| `/dashboard/messages` | `READ_ALL` | `READ_MESSAGES` |

### 4. Finance Feature Client (`src/features/finance/api.client.ts`)

The `verifyTransaction` function maps to `VERIFY_CONTRIBUTIONS` in the old design. Under the new model it maps to `MANAGE_FINANCE`. No API URL change needed — only the frontend permission check label changes.

---

## Implementation Order

When building this out, do it in this sequence to avoid breaking running code mid-way:

```
Step 1 — Backend enum update
  Update permission.enum.ts with new values.
  Old string values in existing role documents will no longer match — 
  plan a data migration for any seeded roles in Firestore.

Step 2 — Backend controller updates (8 controllers)
  In order: announcements → blog → boards → finance → messages → roles → tiers → users

Step 3 — New backend endpoint
  Add PATCH /finance/transactions/:id/disable

Step 4 — New model fields
  Add isActive to roles + tiers DTOs and services.
  Add isBlocked + outsideWhatsapp to users DTO and service.

Step 5 — Frontend permissions constant
  Update src/lib/permissions.ts to match new enum.

Step 6 — Sidebar
  Update DashboardShell.tsx nav item permission gates.

Step 7 — Page-level checks
  Update each dashboard page for new permission names and new default-visibility logic.
```

---

## Default Member Role

A standard member account should ship with:

```json
{
  "name": "عضو",
  "permissions": ["READ_ALL"]
}
```

`READ_ALL` cannot be removed from a role. All additional permissions are opt-in, assigned per role. A member managing join requests would have a role with `["READ_ALL", "MANAGE_REGISTRATIONS"]`. A finance manager would have `["READ_ALL", "MANAGE_FINANCE"]`.
