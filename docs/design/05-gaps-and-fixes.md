# Architectural Gaps & Required Fixes

## Priority Map

```mermaid
graph TD
    subgraph CRITICAL["🔴 Critical — Security / Data Loss"]
        G1["DELETE endpoints have no admin-only guard\nAny member with the right permission can permanently\ndelete records — violates the core rule"]
        G2["Admin accounts endpoint has no admin-only guard\nA member with MANAGE_ACCESS could create/delete\nadmin accounts — privilege escalation risk"]
    end

    subgraph HIGH["🟠 High — Broken Features"]
        G3["FinanceSummary type shape mismatch\nFrontend type vs backend response are completely different\n— summary tab shows nothing"]
        G4["CreatePaymentChannelDto missing required type field\nEvery save always returns 400 Bad Request"]
        G5["TransactionType: frontend uses 'payment'\nBackend uses 'donation' — wrong enum value"]
        G6["Member dashboard announcements: same null crash\nnot ported from the admin fix"]
        G7["Blog PATCH status returns empty body\nFrontend must refetch — fragile, wastes a round-trip"]
    end

    subgraph MEDIUM["🟡 Medium — Missing Features"]
        G8["Announcements: no targetAudience field\nCan't target members vs public vs admins"]
        G9["Blog: no author-ownership check on PATCH\nAny member with WRITE_BLOG edits any post"]
        G10["Board type missing advanced fields\nFrontend types don't expose roleIds,\nmandates, obligations, achievements"]
        G11["Blog dead code in member dashboard\nBoth ternary branches call the same function"]
        G12["Dashboard stats hardcoded\n250 users, 1 election, 8 initiatives"]
        G13["Member profile shows generic icon\nName and photo not fetched from backend"]
    end

    subgraph LOW["🟢 Low — UX Polish"]
        G14["Finance: no Add Transaction form on admin page"]
        G15["Members table missing Role, Tier, WhatsApp columns"]
        G16["Boards: advanced config not exposed in form"]
        G17["Blog: plain textarea instead of WYSIWYG"]
        G18["Phone validation missing on frontend for members add"]
    end
```

## Fix 1 — Admin-Only Guard on All DELETE Endpoints

```mermaid
graph LR
    subgraph BEFORE["Before — Broken"]
        D1["DELETE /boards/:id"] --> P1["@RequirePermissions(MANAGE_BOARDS)\nAny member with perm can delete"]
    end

    subgraph AFTER["After — Fixed"]
        D2["DELETE /boards/:id"] --> CHAIN["@UseGuards(JwtAuthGuard, UserTypeGuard, PermissionsGuard)\n@RequireUserType('admin')\n@RequirePermissions(MANAGE_BOARDS)"]
        CHAIN --> SAFE["Only admin JWT tokens allowed"]
    end
```

**Files to change in backend:**
- `boards.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `blog.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `announcements.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `elections.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `users.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `roles.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `tiers.controller.ts` — add `@RequireUserType('admin')` to `remove()`
- `admin-accounts.controller.ts` — add `@RequireUserType('admin')` to all methods

## Fix 2 — Frontend Type Corrections

```mermaid
graph LR
    subgraph WRONG["Current — Wrong Types"]
        T1["FinanceSummary {\n  totalContributions\n  totalExpenses\n  balance\n  currency\n}"]
        T2["CreatePaymentChannelDto {\n  name\n  description?\n  isActive\n}"]
        T3["TransactionType =\n  'contribution' | 'expense' | 'payment'"]
    end

    subgraph CORRECT["Required — Correct Types"]
        T4["FinanceSummary {\n  year: number\n  month: number | null\n  totals: {\n    contribution: number\n    donation: number\n    expense: number\n  }\n  income: number\n  net: number\n  currency: string\n}"]
        T5["CreatePaymentChannelDto {\n  name: string\n  type: 'mobile' | 'cash'\n  walletNumber?: string\n  walletOwner?: string\n  isActive?: boolean\n}"]
        T6["TransactionType =\n  'contribution' | 'donation' | 'expense'"]
    end

    T1 -.->|fix| T4
    T2 -.->|fix| T5
    T3 -.->|fix| T6
```

## Fix 3 — Blog Status Endpoint Response

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend

    Note over FE,BE: Current (Broken)
    FE->>BE: PATCH /blog/posts/:id/status { status: 'published' }
    BE-->>FE: 200 OK (empty body)
    FE->>BE: GET /blog/posts/all  (extra refetch required)
    BE-->>FE: full list

    Note over FE,BE: Fix Option A — Return updated post
    FE->>BE: PATCH /blog/posts/:id/status { status: 'published' }
    BE-->>FE: 200 OK { id, title, status, publishedAt, ... }
    Note over FE: Update local state directly — no refetch needed
```

**File to change:** `backend/src/modules/blog/blog.service.ts` — `updateStatus()` should return the updated document.

## Fix 4 — Null-Safe Dates in Member Announcements

**File:** `src/app/dashboard/announcements/page.tsx`

```mermaid
graph LR
    subgraph CRASH["Line 53-54 — Crashes"]
        C1["item.startDate.slice(0, 10)\nitem.endDate.slice(0, 10)"]
    end
    subgraph FIX["Fixed"]
        F1["item.startDate?.slice(0, 10) ?? '—'\nitem.endDate?.slice(0, 10) ?? '—'"]
    end
    C1 -.->|same fix applied in admin page| F1
```

## Fix 5 — Add Announcement Target Audience

```mermaid
graph LR
    subgraph BACKEND["Backend Change"]
        B1["Add targetAudience field to\ncreate-announcement.dto.ts\ntype: 'public' | 'member' | 'admin'\ndefault: 'public'"]
        B2["Filter in getActive() by audience\nbased on JWT type"]
    end

    subgraph FRONTEND["Frontend Change"]
        F1["Add targetAudience select to\nannouncement create/edit form\n(both admin and member dashboard)"]
        F2["Announcement type in types/announcements.ts\n+ targetAudience field"]
    end
```

## Summary Fix Checklist

```mermaid
graph TD
    START(["Begin Fixes"]) --> FIX1

    FIX1["1. Backend: add @RequireUserType('admin')\nto all DELETE methods + admin-accounts"] --> FIX2

    FIX2["2. Frontend: fix src/types/finance.ts\n— FinanceSummary, CreatePaymentChannelDto,\n  TransactionType"] --> FIX3

    FIX3["3. Frontend: fix admin finance page\n— channelForm initial state + form fields\n  for type/walletNumber/walletOwner"] --> FIX4

    FIX4["4. Frontend: fix dashboard/announcements/page.tsx\n— null-safe date slicing"] --> FIX5

    FIX5["5. Frontend: fix dashboard/blog/page.tsx\n— dead ternary code"] --> FIX6

    FIX6["6. Backend: blog updateStatus() returns\nupdated post instead of void"] --> FIX7

    FIX7["7. Frontend: update admin finance summary tab\nto use correct field names from real shape"] --> DONE

    DONE(["Core bugs fixed"])
```
