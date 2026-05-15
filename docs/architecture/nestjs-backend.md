# NestJS Backend Design

**Date:** 2026-05-13  
**Status:** Approved  
**Scope:** Introduce a standalone NestJS backend at `/backend/` into the existing Next.js monorepo without modifying any frontend code.

---

## 1. Architecture & Runtime

### Monorepo Layout

```
/                        ← existing Next.js app (port 3000) — untouched
/backend/                ← new NestJS app (port 3001)
/backend/src/
  main.ts
  app.module.ts
  common/
    enums/permission.enum.ts
    decorators/permissions.decorator.ts
    guards/jwt-auth.guard.ts
    guards/permissions.guard.ts
    firebase/
      firebase.module.ts
      firebase.service.ts
  modules/
    auth/
    users/
    boards/
    elections/
    finance/
    blog/
```

Root `package.json` receives one new script only:
```json
"backend": "cd backend && npm run start:dev"
```

### NestJS Bootstrap (`main.ts`)

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- CORS enabled for `http://localhost:3000` (configurable via `FRONTEND_URL` env var)
- Listens on `PORT` env var (default `3001`)

### Firebase Admin Initialization

`FirebaseService` constructor checks `admin.apps.length`. If zero, calls `admin.initializeApp()` using env vars from `/backend/.env`. The backend runs as a completely separate Node.js process from Next.js — no shared state, no collision risk. This mirrors the pattern in `src/lib/firebase/admin.ts` but is independent.

---

## 2. Packages

```
@nestjs/core @nestjs/common @nestjs/platform-express
@nestjs/config @nestjs/jwt @nestjs/passport @nestjs/schedule
passport passport-jwt passport-google-oauth20
firebase-admin
class-validator class-transformer
rxjs
reflect-metadata
```

Dev: `@nestjs/cli @nestjs/schematics ts-node tsconfig-paths @types/node @types/express @types/passport-jwt @types/passport-google-oauth20`

---

## 3. Permission Enum

```typescript
export enum Permission {
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_REGISTRATIONS = 'MANAGE_REGISTRATIONS',
  MANAGE_BOARDS = 'MANAGE_BOARDS',
  MANAGE_ACCESS = 'MANAGE_ACCESS',
  MANAGE_ELECTIONS = 'MANAGE_ELECTIONS',
  MANAGE_PAYMENT_CHANNELS = 'MANAGE_PAYMENT_CHANNELS',
  RECORD_CONTRIBUTIONS = 'RECORD_CONTRIBUTIONS',
  VERIFY_CONTRIBUTIONS = 'VERIFY_CONTRIBUTIONS',
  RECORD_EXPENSES = 'RECORD_EXPENSES',
  WRITE_BLOG = 'WRITE_BLOG',
  MODERATE_BLOG = 'MODERATE_BLOG',
  READ_FINANCE = 'READ_FINANCE',
  READ_ALL = 'READ_ALL',
}
```

---

## 4. Firestore Collections

New collection names (old names preserved in frontend, never renamed):

| New Name | Old Name / Notes |
|---|---|
| `users` | was `users-simple` + `public-members` |
| `adminAccounts` | was `admins-simple` |
| `whatsappOtps` | new |
| `boards` | new |
| `roles` | new |
| `userBoardRoles` | new |
| `registrationRequests` | was `join-requests-simple` |
| `paymentChannels` | new |
| `contributions` | new |
| `expenses` | new |
| `electionProcesses` | new (replaces `elections-simple`) |
| `electionStages` | new |
| `electionOptions` | new |
| `nominationBallots` | was `nominations-simple` |
| `withdrawals` | new |
| `votes` | was `votes-simple` |
| `blogPosts` | new |

### `adminAccounts` document schema

```
adminAccounts/{userId}:
  googleEmail:   string
  userId:        string
  permissions:   Permission[]
  createdAt:     Timestamp
```

Doc ID = `userId`. Google OAuth strategy queries by `where('googleEmail', '==', email)`.

---

## 5. Auth Layer

### WhatsApp OTP

**`POST /auth/whatsapp/request-otp`** — public, no JWT

1. Validate `{ phone: string }` via DTO
2. Query `users` where `whatsappNumber == phone`; if not found → `NotFoundException`
3. Generate 6-digit OTP via `crypto.randomInt(100000, 999999).toString()`
4. Write `whatsappOtps/{phone}` with `{ code, used: false, expiresAt: Timestamp(now + 10min) }`
5. `console.log('TODO: Send WhatsApp OTP', phone, code)` — stub; real call goes to `WHATSAPP_API_URL`
6. Return `{ message: 'OTP sent' }`

**`POST /auth/whatsapp/verify-otp`** — public, no JWT

1. Validate `{ phone: string, code: string }` via DTO
2. Get `whatsappOtps/{phone}`; if missing, or `used === true`, or `expiresAt <= now` → `UnauthorizedException`
3. `update({ used: true })`
4. Look up user by phone again; sign JWT
5. Return `{ access_token }`

### Google OAuth

**`GET /auth/google`** — `@UseGuards(AuthGuard('google'))` — redirects to Google consent

**`GET /auth/google/callback`** — `@UseGuards(AuthGuard('google'))`

`GoogleStrategy.validate(accessToken, refreshToken, profile)`:
1. Extract `profile.emails[0].value`
2. Query `adminAccounts where googleEmail == email`; if empty → `ForbiddenException('Not an authorized admin')`
3. Fetch `users/{adminAccount.userId}`
4. Return `{ userId, adminAccountId: adminAccount.id, type: 'admin', permissions: adminAccount.permissions }`

Controller calls `authService.signJwt(req.user)` → returns `{ access_token }`.

### JWT Strategy

- `ExtractJwt.fromAuthHeaderAsBearerToken()`
- Decodes and attaches `{ userId, type: 'member'|'admin', permissions: string[], adminAccountId?: string }` to `request.user`
- Secret from `JWT_SECRET` env var

### JWT Payload Shape

```typescript
interface JwtPayload {
  userId: string;
  type: 'member' | 'admin';
  permissions: string[];      // [] for members
  adminAccountId?: string;    // only for admin tokens
}
```

---

## 6. Guards

### `JwtAuthGuard`

Thin wrapper around `AuthGuard('jwt')`. Applied via `@UseGuards(JwtAuthGuard)` at controller or route level.

### `PermissionsGuard`

Applied alongside `JwtAuthGuard`. Reads `@RequirePermissions(...perms)` metadata from handler/class.

Logic:
- No `@RequirePermissions` on route → passes for any authenticated user (members included)
- `@RequirePermissions` present + `user.type === 'member'` → `ForbiddenException`
- `@RequirePermissions` present + `user.type === 'admin'` → checks every required permission exists in `user.permissions`

### `@RequirePermissions` Decorator

```typescript
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

---

## 7. Module Details

### Auth Module

Routes: `POST /auth/whatsapp/request-otp`, `POST /auth/whatsapp/verify-otp`, `GET /auth/google`, `GET /auth/google/callback`

No `JwtAuthGuard` on auth routes. `AuthGuard('google')` on Google routes only.

### Users Module

| Route | Guard | Permission |
|---|---|---|
| `GET /users` | JWT + Permissions | `MANAGE_USERS` |
| `GET /users/:id` | JWT + Permissions | `MANAGE_USERS` |
| `POST /users` | JWT + Permissions | `MANAGE_USERS` |
| `PATCH /users/:id` | JWT + Permissions | `MANAGE_USERS` |
| `DELETE /users/:id` | JWT + Permissions | `MANAGE_USERS` |

Collection: `users`

### Boards Module

| Route | Guard | Permission |
|---|---|---|
| `GET /boards` | JWT | none required |
| `GET /boards/:id` | JWT | none required |
| `POST /boards` | JWT + Permissions | `MANAGE_BOARDS` |
| `PATCH /boards/:id` | JWT + Permissions | `MANAGE_BOARDS` |
| `DELETE /boards/:id` | JWT + Permissions | `MANAGE_BOARDS` |
| `POST /boards/:boardId/roles` | JWT + Permissions | `MANAGE_BOARDS` |

Collections: `boards`, `roles`, `userBoardRoles`

### Elections Module

| Route | Guard | Permission |
|---|---|---|
| `GET /elections` | JWT | none |
| `GET /elections/:id` | JWT | none |
| `POST /elections` | JWT + Permissions | `MANAGE_ELECTIONS` |
| `PATCH /elections/:id` | JWT + Permissions | `MANAGE_ELECTIONS` |
| `DELETE /elections/:id` | JWT + Permissions | `MANAGE_ELECTIONS` |
| `POST /elections/:id/nominations` | JWT | none (any member) |
| `POST /elections/:id/votes` | JWT | none (any member) |

Collections: `electionProcesses`, `electionStages`, `electionOptions`, `nominationBallots`, `votes`

### Finance Module

| Route | Guard | Permission |
|---|---|---|
| `GET /finance/payment-channels` | JWT | none |
| `POST /finance/payment-channels` | JWT + Permissions | `MANAGE_PAYMENT_CHANNELS` |
| `GET /finance/contributions` | JWT + Permissions | `READ_FINANCE` |
| `POST /finance/contributions` | JWT + Permissions | `RECORD_CONTRIBUTIONS` |
| `PATCH /finance/contributions/:id/verify` | JWT + Permissions | `VERIFY_CONTRIBUTIONS` |
| `GET /finance/expenses` | JWT + Permissions | `READ_FINANCE` |
| `POST /finance/expenses` | JWT + Permissions | `RECORD_EXPENSES` |

Collections: `paymentChannels`, `contributions`, `expenses`

**`createContribution` business logic:**
1. Fetch `paymentChannels/{dto.paymentChannelId}`; if not found → `NotFoundException`
2. If `requiresCollector === true` and `dto.collectedByUserId !== req.user.userId` → `ForbiddenException`
3. If `requiresCollector === false` and `!dto.screenshotUrl` → `BadRequestException`
4. Write contribution document with `status: 'pending'`, `recordedBy: req.user.userId`

### Blog Module

| Route | Guard | Permission |
|---|---|---|
| `GET /blog/posts` | none (public) | — |
| `GET /blog/posts/:id` | none (public) | — |
| `POST /blog/posts` | JWT + Permissions | `WRITE_BLOG` |
| `PATCH /blog/posts/:id/content` | JWT + Permissions | `WRITE_BLOG` |
| `PATCH /blog/posts/:id/status` | JWT + Permissions | `MODERATE_BLOG` |
| `DELETE /blog/posts/:id` | JWT + Permissions | `MODERATE_BLOG` |

Collection: `blogPosts`

---

## 8. Elections Scheduler

`ElectionsScheduler` — cron `*/5 * * * *`

```
handleWithdrawalWindowClose():
  query electionStages where stageType=WITHDRAWAL AND status=ACTIVE AND closesAt <= now
  for each stage:
    count = electionOptions where stageId=stage.id AND outcome=PENDING AND tier=SHORTLIST
    TARGET = 5
    if count === 5:
      batch: mark all SHORTLIST options outcome=ELECTED
      batch: mark stage status=CLOSED
      batch: mark electionProcess status=COMPLETED
    if count > 5:
      transaction: close withdrawal stage, create new electionStages doc {stageType: FINAL_VOTE, status: ACTIVE, processId}
    if count < 5:
      needed = 5 - count
      query RESERVE options ordered by rank ASC limit needed
      if shortlist + reserve >= 5:
        promote reserve docs (tier=SHORTLIST, outcome=ELECTED), mark existing shortlist ELECTED
        mark process COMPLETED
      else:
        mark all options outcome=CANCELLED
        mark process status=CANCELLED
```

---

## 9. Environment Variables (`/backend/.env`)

```
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
PORT=3001
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FRONTEND_URL=http://localhost:3000
```

---

## 10. DTOs (class-validator decorated)

### Auth
- `RequestOtpDto`: `phone: @IsString @IsNotEmpty`
- `VerifyOtpDto`: `phone: @IsString @IsNotEmpty`, `code: @IsString @Length(6,6)`

### Users
- `CreateUserDto`: `fullName`, `whatsappNumber`, `nationalId?`, `city?`, `region?`, `status?: 'active'|'pending'|'blocked'`
- `UpdateUserDto`: `PartialType(CreateUserDto)`

### Boards
- `CreateBoardDto`: `name`, `boardType`, `description?`, `term?`
- `CreateRoleDto`: `boardId`, `title`, `permissions?: string[]`

### Elections
- `CreateElectionDto`: `title`, `description?`, `type: ElectionType`, `startTime: @IsDateString`, `endTime: @IsDateString`
- `SubmitNominationDto`: `nomineeUids: @IsArray @ArrayMinSize(1)`
- `CastVoteDto`: `selections: @IsArray @ArrayMinSize(1)`

### Finance
- `CreatePaymentChannelDto`: `name`, `requiresCollector: @IsBoolean`, `instructions?`
- `CreateContributionDto`: `paymentChannelId`, `amount: @IsNumber @IsPositive`, `collectedByUserId?`, `screenshotUrl?`, `notes?`
- `CreateExpenseDto`: `description`, `amount: @IsNumber @IsPositive`, `category`, `date: @IsDateString`

### Blog
- `CreatePostDto`: `title`, `content`, `tags?: string[]`, `status?: 'draft'|'published'`
