# System Overview

Full architecture of the Will Group platform — public site, member dashboard, and admin panel connected through the NestJS backend and Firestore.

```mermaid
graph TB
    subgraph PUBLIC["Public (Unauthenticated)"]
        PL[Landing Page /]
        PBL[Blog /blog]
        PE[Elections /elections]
    end

    subgraph MEMBER["Member Dashboard /dashboard"]
        ML[Login — OTP + Password]
        MD[Dashboard Home]
        MB[Blog — write/edit/publish]
        MBO[Boards — view/create/edit]
        MAN[Announcements — view/create/edit]
        MFI[Finance — view/record]
        MReg[Registrations — view/approve]
        MME[My Profile /me]
        MVotes[Elections — vote/nominate]
    end

    subgraph ADMIN["Admin Panel /admin"]
        AL[Login — Google OAuth]
        AD[Dashboard Home]
        AU[Members CRUD]
        ABO[Boards — full CRUD]
        ABL[Blog — full CRUD + moderate]
        AAN[Announcements — full CRUD]
        AFI[Finance — full CRUD + verify]
        ARO[Roles — full CRUD]
        ATI[Tiers — full CRUD]
        AAC[Admin Accounts — full CRUD]
        ARE[Registrations — review/approve/reject]
        AEL[Elections — full CRUD]
    end

    subgraph BACKEND["NestJS Backend :3001"]
        AUTH[/auth — OTP, Password, Google OAuth, JWT Refresh/]
        USERS[/users — member CRUD/]
        BLOG[/blog/posts — content/]
        BOARDS[/boards — governance/]
        ANNS[/announcements — notices/]
        FIN[/finance — transactions + channels/]
        ROLES[/roles — permissions/]
        TIERS[/tiers — membership levels/]
        ADMIN_ACC[/admin-accounts/]
        REGS[/registrations/]
        ELEC[/elections — voting system/]
        UPL[/uploads — Firebase Storage/]
    end

    subgraph FIRESTORE["Firestore Collections"]
        FS_USERS[(users)]
        FS_ROLES[(roles)]
        FS_TIERS[(tiers)]
        FS_BOARDS[(boards)]
        FS_BLOG[(blogs)]
        FS_ANN[(announcements)]
        FS_FIN_TX[(transactions)]
        FS_FIN_CH[(paymentChannels)]
        FS_ELEC[(elections)]
        FS_VOTES[(votes)]
        FS_NOMS[(nominations — subcollection of elections)]
        FS_REGS[(join-requests)]
        FS_MSG[(messages)]
        FS_ADMIN_ACC[(adminAccounts)]
        FS_TOKENS[(refreshTokens)]
        FS_UPL[(uploads)]
        FS_SETTINGS[(settings — doc: public)]
    end

    PUBLIC --> BACKEND
    MEMBER --> BACKEND
    ADMIN --> BACKEND

    AUTH --> FS_USERS
    AUTH --> FS_ADMINS
    AUTH --> FS_ADMIN_ACC
    AUTH --> FS_TOKENS

    USERS --> FS_USERS
    USERS --> FS_PUB
    BLOG --> FS_BLOG
    BOARDS --> FS_BOARDS
    ANNS --> FS_ANN
    FIN --> FS_FIN_TX
    FIN --> FS_FIN_CH
    ROLES --> FS_ROLES
    TIERS --> FS_TIERS
    ADMIN_ACC --> FS_ADMIN_ACC
    REGS --> FS_REGS
    ELEC --> FS_ELEC
    ELEC --> FS_VOTES
    ELEC --> FS_NOMS
    ELEC --> FS_NOM_CNT
    UPL --> FS_UPL
```

## Token Architecture

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant B as Backend
    participant FS as Firestore
    participant FB as Firebase Auth

    Note over C,FB: Member login flow (OTP)
    C->>B: POST /auth/phone/check
    B->>FS: query users-simple by phone
    B-->>C: { exists, requiresPasswordSetup }

    C->>B: POST /auth/phone/request-otp
    B->>FB: send OTP via Firebase Auth
    C->>B: POST /auth/phone/verify-otp
    B->>FB: verify OTP
    B->>FS: store refreshToken hash
    B-->>C: { access_token (JWT), refresh_token }

    Note over C,FB: Admin login flow (Google)
    C->>B: GET /auth/google
    B->>FB: Google OAuth redirect
    FB-->>B: google callback with email
    B->>FS: check admins-simple/{email}.status == 'active'
    B->>FS: store refreshToken hash
    B-->>C: redirect with { access_token, refresh_token }

    Note over C,B: Token refresh
    C->>B: POST /auth/refresh { refreshToken }
    B->>FS: verify hash exists + not expired
    B->>FS: delete old token, store new token
    B-->>C: { access_token, refresh_token }
```

## JWT Payload

```mermaid
graph LR
    JWT["JWT Payload"] --> UID[userId: string]
    JWT --> TYPE["type: 'member' | 'admin'"]
    JWT --> PERMS["permissions: string[]"]
    JWT --> AID["adminAccountId?: string"]
    JWT --> EMAIL["googleEmail?: string"]

    TYPE -->|member| MEMBER_PERMS["Permissions from role assigned\nto users-simple document"]
    TYPE -->|admin| ADMIN_PERMS["Permissions from adminAccounts\ncollection entry"]
```
