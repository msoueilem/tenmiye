# Firestore Collections — Schema & Relationships

## Entity Relationship Overview

```mermaid
erDiagram
    USERS {
        string id
        string fullName
        string fullNameAr
        string whatsappNumber
        string phoneNumber
        string nationalId
        string city
        string regionId
        string roleId
        string tierId
        string profilePictureId
        string joinRequestId
        boolean outsidePlatform
        string status
        string approvedBy
        timestamp approvedAt
        timestamp lastLoginAt
        timestamp createdAt
        timestamp updatedAt
    }

    ROLES {
        string id
        string slug
        string name
        string description
        string_array permissions
        string_array responsibilities
        string createdBy
        timestamp createdAt
        timestamp updatedAt
    }

    TIERS {
        string id
        string slug
        string name
        number monthlyAmount
        string description
        string_array features
        string createdBy
        timestamp createdAt
        timestamp updatedAt
    }

    UPLOADS {
        string id
        string uploaderId
        string purpose
        string storageUrl
        boolean deleted
        timestamp createdAt
    }

    BOARDS {
        string id
        string name
        string description
        string_array roleIds
        string logoUploadId
        string termStartDate
        string termEndDate
        string status
        string_array mandates
        string_array obligations
        achievement_array achievements
        string electionId
        string predecessorBoardId
        timestamp createdAt
        timestamp updatedAt
    }

    BLOG_POSTS {
        string id
        string title
        string slug
        string content
        string_array tags
        string featureImageId
        string status
        timestamp publishedAt
        string authorId
        timestamp createdAt
        timestamp updatedAt
    }

    ANNOUNCEMENTS {
        string id
        string message
        string type
        boolean isActive
        timestamp startDate
        timestamp endDate
        string ctaLabel
        string ctaUrl
        string createdBy
        timestamp createdAt
        timestamp updatedAt
    }

    PAYMENT_CHANNELS {
        string id
        string name
        string type
        string walletNumber
        string walletOwner
        boolean requiresScreenshot
        boolean requiresReceiver
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    TRANSACTIONS {
        string id
        string type
        number amount
        timestamp date
        number year
        number month
        string paymentChannelId
        string receivedBy
        string screenshotUploadId
        string userId
        string period
        string purpose
        string receiptUploadId
        string notes
        string recordedBy
        string verifiedBy
        timestamp verifiedAt
        timestamp createdAt
        timestamp updatedAt
    }

    ELECTIONS {
        string id
        string title
        string type
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    VOTES {
        string id
        string electionId
        string userId
        string choice
        timestamp createdAt
    }

    NOMINATIONS {
        string id
        string electionId
        string voterId
        string nomineeId
        timestamp createdAt
    }

    JOIN_REQUESTS {
        string id
        string fullName
        string phone
        string tierId
        string city
        string message
        string status
        string rejectionReason
        string createdUserId
        string reviewedBy
        timestamp reviewedAt
        timestamp createdAt
        timestamp updatedAt
    }

    ADMINS_SIMPLE {
        string email
        string status
    }

    ADMIN_ACCOUNTS {
        string id
        string googleEmail
        string_array permissions
        timestamp createdAt
        timestamp updatedAt
    }

    REFRESH_TOKENS {
        string id
        string userId
        string tokenHash
        timestamp expiresAt
        timestamp createdAt
    }

    USERS ||--o{ ROLES : "roleId"
    USERS ||--o{ TIERS : "tierId"
    USERS ||--o| UPLOADS : "profilePictureId"
    USERS ||--o| JOIN_REQUESTS : "joinRequestId"
    BLOG_POSTS ||--o| UPLOADS : "featureImageId"
    BLOG_POSTS }o--|| USERS : "authorId"
    BOARDS }o--o{ ROLES : "roleIds[]"
    BOARDS ||--o| UPLOADS : "logoUploadId"
    BOARDS ||--o| ELECTIONS : "electionId"
    BOARDS ||--o| BOARDS : "predecessorBoardId"
    TRANSACTIONS }o--|| PAYMENT_CHANNELS : "paymentChannelId"
    TRANSACTIONS ||--o| UPLOADS : "screenshotUploadId"
    TRANSACTIONS ||--o| USERS : "userId"
    TRANSACTIONS }o--|| USERS : "recordedBy"
    VOTES }o--|| ELECTIONS : "electionId"
    VOTES }o--|| USERS : "userId"
    NOMINATIONS }o--|| ELECTIONS : "electionId"
    NOMINATIONS }o--|| USERS : "voterId"
    NOMINATIONS }o--|| USERS : "nomineeId"
    ADMIN_ACCOUNTS ||--|| ADMINS_SIMPLE : "googleEmail"
    REFRESH_TOKENS }o--|| USERS : "userId"
    ANNOUNCEMENTS }o--|| USERS : "createdBy"
```

## Collection Names Reference (exact names used in backend)

```mermaid
graph TD
    subgraph COLLECTIONS["Firestore Collection Names"]
        C1["users\n— member accounts + profile data"]
        C2["roles\n— role definitions + permission arrays"]
        C3["tiers\n— membership tiers + monthly amounts"]
        C4["boards\n— governance boards"]
        C5["blogs\n— blog posts"]
        C6["announcements\n— platform announcements"]
        C7["transactions\n— financial transactions"]
        C8["paymentChannels\n— payment methods (mobile/cash)"]
        C9["elections\n— election events"]
        C10["elections/{id}/nominations\n— subcollection: nomination records per election"]
        C11["votes\n— cast votes (doc id: electionId_userId)"]
        C12["join-requests\n— membership applications"]
        C13["messages\n— contact form submissions"]
        C14["adminAccounts\n— admin JWT profiles + permissions"]
        C15["refreshTokens\n— JWT refresh token hashes (expire 30d)"]
        C16["uploads\n— Firebase Storage file metadata"]
        C17["settings (doc: public)\n— landing page CMS content"]
    end
```

> **Note:** `admins-simple`, `public-members`, `votes-simple`, `nominations-simple`, `nomination-counts`, `join-requests-simple`, `messages-simple`, `uploads-simple`, `blogs-simple`, `announcements-simple`, `elections-simple`, `roles-simple`, `tiers-simple`, `boards-simple` are **old collection names from a previous version** and are no longer used by the backend. They should be deleted from Firestore if they still exist.

## User Lifecycle

```mermaid
stateDiagram-v2
    [*] --> JoinRequest: Public submits /registrations

    JoinRequest --> Pending: status = pending
    Pending --> Rejected: Admin rejects\nrejectionReason required
    Pending --> Approved: Admin approves

    Approved --> UserCreated: Firebase Auth account created\nusers-simple document created\nstatus = active\ndefault roleId + tierId assigned

    UserCreated --> Active: Can login via OTP/password
    Active --> Inactive: Admin sets status = inactive
    Inactive --> Active: Admin re-activates
    Active --> [*]: Admin hard deletes (admin-only)
```

## Finance Data Flow

```mermaid
graph TD
    subgraph CHANNELS["Payment Channels Setup\n(admin only)"]
        CH_MOBILE["type=mobile\nrequires walletNumber + walletOwner\nrequiresScreenshot=true"]
        CH_CASH["type=cash\nrequiresReceiver=true"]
    end

    subgraph TX["Transaction Recording"]
        TX_CONTRIB["type=contribution\nrequires userId\npaymentChannelId"]
        TX_DONATION["type=donation\npaymentChannelId"]
        TX_EXPENSE["type=expense\npaymentChannelId"]
    end

    subgraph VERIFY["Verification"]
        V1["status=pending → recorded but unverified"]
        V2["status=verified → VERIFY_CONTRIBUTIONS required"]
        V3["status=rejected → admin decision"]
    end

    subgraph SUMMARY["Summary Aggregation\n/finance/summary?year=2026"]
        S1["totals.contribution = sum of contributions"]
        S2["totals.donation = sum of donations"]
        S3["totals.expense = sum of expenses"]
        S4["income = contribution + donation"]
        S5["net = income - expense"]
        S6["currency = MRU"]
    end

    CH_MOBILE --> TX_CONTRIB
    CH_CASH --> TX_EXPENSE
    TX_CONTRIB --> VERIFY
    TX_DONATION --> VERIFY
    TX_EXPENSE --> VERIFY
    VERIFY --> SUMMARY
```

## Election Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: Admin creates election

    Draft --> Nomination: MANAGE_ELECTIONS → advance
    Nomination --> Voting: MANAGE_ELECTIONS → advance\nmembers can nominate during this phase
    Voting --> Closed: MANAGE_ELECTIONS → finalize\nmembers vote during this phase
    Closed --> [*]: Results visible publicly

    note right of Nomination
        Members can:
        POST /elections/:id/nominations
        DELETE /elections/:id/nominations/me
    end note

    note right of Voting
        Members can:
        POST /elections/:id/votes
        (one vote per userId, doc id = electionId_userId)
    end note
```
