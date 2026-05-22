# API Endpoint Access Matrix

Legend: 🟢 Public · 🔵 Any valid JWT · 🟡 Member + permission · 🔴 Admin only · ⚠️ Gap — needs to be built

## Auth

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /auth/phone/check | POST | 🟢 Public | checks if phone is registered |
| /auth/phone/request-otp | POST | 🟢 Public | throttled: 3 per 10 min |
| /auth/phone/verify-otp | POST | 🟢 Public | |
| /auth/phone/set-password | POST | 🔵 Any JWT | first-time setup |
| /auth/phone/reset-password | POST | 🟢 Public | |
| /auth/login | POST | 🟢 Public | password login |
| /auth/refresh | POST | 🟢 Public | token rotation |
| /auth/logout | POST | 🟢 Public | |
| /auth/logout-all | POST | 🔵 Any JWT | |
| /auth/google | GET | 🟢 Public | Google OAuth redirect |
| /auth/google/callback | GET | 🟢 Public | issues admin JWT |

---

## Members (Users)

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /users | GET | 🟡 MANAGE_USERS | paginated list |
| /users/:id | GET | 🟡 MANAGE_USERS | single member |
| /users | POST | 🟡 MANAGE_USERS | manual member creation |
| /users/:id | PATCH | 🟡 MANAGE_USERS | update status, block, whatsapp flag ⚠️ isBlocked + outsideWhatsapp fields needed |
| /users/:id | DELETE | 🔴 Admin only | permanent hard delete |

---

## Registrations

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /registrations | POST | 🟢 Public | throttled: 10 per 10 min — landing page form |
| /registrations | GET | 🟡 MANAGE_REGISTRATIONS | members review pending requests |
| /registrations/:id/status | PATCH | 🟡 MANAGE_REGISTRATIONS | approve creates Firebase Auth + user doc · reject requires reason |

> Members do NOT create registrations. They only read and action them.

---

## Messages

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /messages | POST | 🟢 Public | throttled: 10 per 10 min — contact form on landing page |
| /messages | GET | 🟡 READ_ALL | members read contact submissions — paginated |
| /messages/:id/read | PATCH | 🟡 READ_ALL | mark message as read |

> No update beyond marking read. No delete.

---

## Elections

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /elections | GET | 🟢 Public | |
| /elections/:id | GET | 🟢 Public | |
| /elections/:id/results | GET | 🟢 Public | |
| /elections/:id/nominations/top | GET | 🟢 Public | |
| /elections/:id/my-vote | GET | 🔵 Any JWT | |
| /elections | POST | 🟡 MANAGE_ELECTIONS | members create elections |
| /elections/:id | PATCH | 🟡 MANAGE_ELECTIONS | update settings, timing, disable status |
| /elections/:id | DELETE | 🔴 Admin only | permanent delete |
| /elections/:id/advance | POST | 🟡 MANAGE_ELECTIONS | advance phase |
| /elections/:id/finalize | POST | 🟡 MANAGE_ELECTIONS | finalize results |
| /elections/:id/nominations | POST | 🔵 member type only | cast nomination |
| /elections/:id/nominations/me | DELETE | 🔵 member type only | retract own nomination |
| /elections/:id/votes | POST | 🔵 member type only | cast vote |

---

## Boards

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /boards | GET | 🔵 Any JWT | |
| /boards/:id | GET | 🔵 Any JWT | |
| /boards | POST | 🟡 MANAGE_BOARDS | members create boards |
| /boards/:id | PATCH | 🟡 MANAGE_BOARDS | update name, description, dates, roleIds array, status |
| /boards/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Blog

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /blog/posts | GET | 🟢 Public | published only |
| /blog/posts/all | GET | 🟡 WRITE_BLOG | all statuses including drafts |
| /blog/posts/:id | GET | 🟢 Public | |
| /blog/posts | POST | 🟡 WRITE_BLOG | members create posts |
| /blog/posts/:id | PATCH | 🟡 WRITE_BLOG | update content |
| /blog/posts/:id/status | PATCH | 🟡 MODERATE_BLOG | publish, draft, archive |
| /blog/posts/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Announcements

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /announcements | GET | 🟢 Public | active only, respects date window |
| /announcements/all | GET | 🟡 MANAGE_SETTINGS | all including inactive |
| /announcements/:id | GET | 🟡 MANAGE_SETTINGS | single record |
| /announcements | POST | 🟡 MANAGE_SETTINGS | members create announcements |
| /announcements/:id | PATCH | 🟡 MANAGE_SETTINGS | update + toggle isActive |
| /announcements/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Tiers

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /tiers | GET | 🟢 Public | used in registration form |
| /tiers/:id | GET | 🟡 MANAGE_SETTINGS | |
| /tiers | POST | 🟡 MANAGE_SETTINGS | members create tiers |
| /tiers/:id | PATCH | 🟡 MANAGE_SETTINGS | update + enable/disable ⚠️ isActive field needed on Tier |
| /tiers/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Roles

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /roles | GET | 🟡 MANAGE_ACCESS | |
| /roles/:id | GET | 🟡 MANAGE_ACCESS | |
| /roles | POST | 🟡 MANAGE_ACCESS | members create roles |
| /roles/:id | PATCH | 🟡 MANAGE_ACCESS | update permissions, enable/disable ⚠️ isActive field needed on Role |
| /roles/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Finance — Payment Channels

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /finance/payment-channels | GET | 🔵 Any JWT | |
| /finance/payment-channels | POST | 🟡 MANAGE_PAYMENT_CHANNELS | members create channels |
| /finance/payment-channels/:id | PATCH | 🟡 MANAGE_PAYMENT_CHANNELS | update + enable/disable toggle |
| /finance/payment-channels/:id | DELETE | 🔴 Admin only | permanent delete |

---

## Finance — Transactions

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /finance/transactions | GET | 🟡 READ_FINANCE | |
| /finance/transactions | POST | 🟡 RECORD_CONTRIBUTIONS | type=contribution or donation · RECORD_EXPENSES for type=expense |
| /finance/transactions/:id/verify | PATCH | 🟡 VERIFY_CONTRIBUTIONS | mark as verified |
| /finance/transactions/:id/disable | PATCH | 🟡 RECORD_CONTRIBUTIONS | ⚠️ does not exist yet — needed to invalidate wrong entries |
| /finance/summary | GET | 🟡 READ_FINANCE | requires ?year= param |

> Members never delete transactions. If an entry is wrong, they disable it and create a corrected replacement.

---

## Admin Accounts

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /admin-accounts | GET | 🔴 Admin only | |
| /admin-accounts/:id | GET | 🔴 Admin only | |
| /admin-accounts | POST | 🔴 Admin only | |
| /admin-accounts/:id | PATCH | 🔴 Admin only | |
| /admin-accounts/:id | DELETE | 🔴 Admin only | |

> Members have zero access to this resource.

---

## Own Profile

| Endpoint | Method | Access | Notes |
|---|---|---|---|
| /me | GET | 🔵 Any JWT | own profile + vote history |
| /me | PATCH | 🔵 Any JWT | update own name or profile photo |
