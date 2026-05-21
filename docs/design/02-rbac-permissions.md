# RBAC — Roles, Permissions & Access Control

## Operating Philosophy

```mermaid
graph LR
    ADMIN(["Admin\n(Google OAuth)"])
    MEMBER(["Member\n(OTP / Password)"])

    ADMIN -->|"Initial setup\nHighest-level access\nHard delete authority"| SYS["System"]
    MEMBER -->|"Day-to-day management\nFull CRUD minus DELETE\non all collections"| SYS
```

> **Rule**: Members run the platform. Admins bootstrap it and are the only ones who can permanently destroy data.
> Every collection supports Create + Read + Update for members. DELETE is admin-only, always.

---

## Permission Enum

```mermaid
graph TD
    subgraph PERMS["Permission Enum — backend/src/common/enums/permission.enum.ts"]
        P1[MANAGE_USERS\nCreate, read, update members\nblock, set whatsapp status]
        P2[MANAGE_REGISTRATIONS\nRead and review join requests\napprove or reject]
        P3[MANAGE_BOARDS\nCreate, read, update boards\nassign roles, toggle status]
        P4[MANAGE_ACCESS\nCreate, read, update roles\nand their permission sets]
        P5[MANAGE_ELECTIONS\nCreate, read, update elections\nadvance status, change timing]
        P6[MANAGE_PAYMENT_CHANNELS\nCreate, read, update payment channels\nenable or disable]
        P7[RECORD_CONTRIBUTIONS\nRecord contribution and donation transactions]
        P8[VERIFY_CONTRIBUTIONS\nMark a transaction as verified]
        P9[RECORD_EXPENSES\nRecord expense transactions]
        P10[WRITE_BLOG\nCreate and edit blog posts\nread all including drafts]
        P11[MODERATE_BLOG\nChange post status\npublish, draft, archive]
        P12[READ_FINANCE\nView transactions and financial summary]
        P13[READ_ALL\nRead messages from contact form]
        P14[MANAGE_SETTINGS\nCreate, read, update announcements\nCreate, read, update tiers\nenable or disable both]
    end
```

---

## What a Member CAN Do

```mermaid
graph TD
    MEMBER(["Member (type=member)"])

    MEMBER --> AUTH_M
    subgraph AUTH_M["Authentication — no permission required"]
        A1[OTP login / password login]
        A2[Set or reset password]
        A3[Refresh token / logout]
    end

    MEMBER --> SELF_M
    subgraph SELF_M["Own Profile /me — no permission required"]
        S1[View own profile and vote history]
        S2[Update own name and profile photo]
    end

    MEMBER --> VOTE_M
    subgraph VOTE_M["Elections — Participation — no permission required"]
        V1[View all elections and results]
        V2[Submit or retract a nomination]
        V3[Cast a vote]
    end

    MEMBER --> PERM_M
    subgraph PERM_M["Managed Collections — requires assigned permission"]

        subgraph U_M["MANAGE_USERS"]
            U1[List and search all members]
            U2[View a member profile]
            U3[Create a new member manually]
            U4[Block or unblock a member]
            U5[Mark member as outside WhatsApp group]
            U6[Change member status active or inactive]
        end

        subgraph R_M["MANAGE_REGISTRATIONS"]
            R1[List all join requests]
            R2[Approve a request — creates member account]
            R3[Reject a request with a reason]
        end

        subgraph B_M["MANAGE_BOARDS"]
            B1[List and view boards]
            B2[Create a new board]
            B3[Update name, description, dates]
            B4[Assign or remove roles on a board]
            B5[Toggle board status active or archived]
        end

        subgraph E_M["MANAGE_ELECTIONS"]
            E1[List and view all elections]
            E2[Create a new election]
            E3[Update election settings and timing]
            E4[Advance election phase]
            E5[Finalize election results]
            E6[Disable or close an election]
        end

        subgraph MSG_M["READ_ALL"]
            MSG1[Read contact form submissions]
            MSG2[Mark a message as read]
        end

        subgraph FIN_M["Finance permissions"]
            F1[READ_FINANCE → view transactions and summary]
            F2[RECORD_CONTRIBUTIONS → record contributions and donations]
            F3[RECORD_EXPENSES → record expenses]
            F4[VERIFY_CONTRIBUTIONS → verify a transaction]
            F5[RECORD_CONTRIBUTIONS → disable an incorrect transaction]
            F6[MANAGE_PAYMENT_CHANNELS → create and update channels]
            F7[MANAGE_PAYMENT_CHANNELS → enable or disable a channel]
        end

        subgraph BLOG_M["Blog permissions"]
            BL1[WRITE_BLOG → create and edit posts]
            BL2[WRITE_BLOG → view all posts including drafts]
            BL3[MODERATE_BLOG → publish, unpublish, or archive a post]
        end

        subgraph ANN_M["MANAGE_SETTINGS — Announcements"]
            AN1[List and view all announcements]
            AN2[Create an announcement]
            AN3[Update message, dates, type]
            AN4[Enable or disable an announcement]
        end

        subgraph TIER_M["MANAGE_SETTINGS — Tiers"]
            T1[List and view all tiers]
            T2[Create a new tier]
            T3[Update tier name, amount, description]
            T4[Enable or disable a tier]
        end

        subgraph ROLE_M["MANAGE_ACCESS — Roles"]
            RL1[List and view all roles]
            RL2[Create a new role]
            RL3[Update role name, permissions, responsibilities]
            RL4[Enable or disable a role]
        end
    end
```

---

## What a Member CAN NEVER Do

```mermaid
graph LR
    NEVER(["Member — Hard Limits"])

    NEVER --> D1["❌ DELETE a member\n✅ Can set status to blocked or inactive"]
    NEVER --> D2["❌ DELETE a board\n✅ Can set status to archived"]
    NEVER --> D3["❌ DELETE a blog post\n✅ Can set status to archived"]
    NEVER --> D4["❌ DELETE an announcement\n✅ Can set isActive to false"]
    NEVER --> D5["❌ DELETE an election\n✅ Can close or disable it"]
    NEVER --> D6["❌ DELETE a transaction\n✅ Can disable it and create a corrected one"]
    NEVER --> D7["❌ DELETE a payment channel\n✅ Can set isActive to false"]
    NEVER --> D8["❌ DELETE a role\n✅ Can set isActive to false"]
    NEVER --> D9["❌ DELETE a tier\n✅ Can set isActive to false"]
    NEVER --> D10["❌ Touch admin accounts\n✅ Not accessible at all"]
```

---

## What an Admin CAN Do

```mermaid
graph LR
    ADMIN(["Admin (type=admin, Google OAuth)"])

    ADMIN --> FULL

    subgraph FULL["Full System Access — everything a member can do, plus:"]
        DEL["DELETE on all collections\nPermanent hard delete"]
        ADM["Manage admin accounts\nCreate, update, delete other admins"]
        BOOT["Bootstrap initial data\nFirst roles, tiers, payment channels"]
    end
```

> Admins hold all the same permissions as members. The difference is the `type=admin` JWT field, which is the only way to reach DELETE endpoints and admin-account management.

---

## Guard Chain

```mermaid
graph TD
    REQ[Incoming Request]
    REQ --> JW{JWT valid?}

    JW -->|No token| PUB[🟢 Public endpoint — allow]
    JW -->|Invalid token| E401[401 Unauthorized]
    JW -->|Valid| UT{UserTypeGuard\nrequired?}

    UT -->|No type requirement| PG
    UT -->|type=admin required\nbut user is member| E403A[403 Forbidden]
    UT -->|type=member required\nbut user is admin| E403B[403 Forbidden]
    UT -->|type matches| PG

    PG{PermissionsGuard\nrequired?}
    PG -->|No permission needed| ALLOW[🟢 Allow]
    PG -->|Has all required permissions| ALLOW
    PG -->|Missing permission| E403C[403 Forbidden]

    style PUB fill:#22c55e,color:#fff
    style ALLOW fill:#22c55e,color:#fff
    style E401 fill:#ef4444,color:#fff
    style E403A fill:#ef4444,color:#fff
    style E403B fill:#ef4444,color:#fff
    style E403C fill:#ef4444,color:#fff
```

---

## Permission → Capability Map

| Permission | Member Can | Admin Also |
|---|---|---|
| MANAGE_USERS | GET, POST, PATCH /users — block, whatsapp flag, status | DELETE /users/:id |
| MANAGE_REGISTRATIONS | GET /registrations, PATCH status (approve/reject) | — |
| MANAGE_BOARDS | GET, POST, PATCH /boards — roles, status, description | DELETE /boards/:id |
| MANAGE_ACCESS | GET, POST, PATCH /roles — enable/disable | DELETE /roles/:id |
| MANAGE_ELECTIONS | GET all, POST, PATCH /elections — status, timing, advance, finalize | DELETE /elections/:id |
| MANAGE_PAYMENT_CHANNELS | GET, POST, PATCH /finance/payment-channels — enable/disable | DELETE /finance/payment-channels/:id |
| READ_FINANCE | GET /finance/transactions, GET /finance/summary | — |
| RECORD_CONTRIBUTIONS | POST /finance/transactions (type=contribution or donation), PATCH disable | — |
| RECORD_EXPENSES | POST /finance/transactions (type=expense) | — |
| VERIFY_CONTRIBUTIONS | PATCH /finance/transactions/:id/verify | — |
| WRITE_BLOG | GET all, POST, PATCH /blog/posts | — |
| MODERATE_BLOG | PATCH /blog/posts/:id/status | DELETE /blog/posts/:id |
| MANAGE_SETTINGS | GET, POST, PATCH /announcements and /tiers — enable/disable | DELETE both |
| READ_ALL | GET /messages, PATCH /messages/:id/read | — |
| *(admin-accounts)* | ❌ No access | GET, POST, PATCH, DELETE /admin-accounts |

---

## Missing Backend Fields (Design Gaps)

```mermaid
graph TD
    subgraph GAPS["Fields that must be added to support member update-as-deactivate"]
        G1["roles collection\nMissing: isActive boolean\nNeeded for enable/disable toggle"]
        G2["tiers collection\nMissing: isActive boolean\nNeeded for enable/disable toggle"]
        G3["transactions collection\nMissing: isActive boolean\nNeeded for member to disable incorrect entries"]
        G4["users collection\nMissing: isBlocked boolean\nMissing: outsideWhatsapp boolean\nNeeded for member user management"]
        G5["PATCH /finance/transactions/:id/disable\nEndpoint does not exist\nNeeded for members to invalidate wrong transactions"]
    end
```
