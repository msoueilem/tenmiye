# System Architecture & Documentation

## 1. Executive Summary

- **What the application does:** It serves as a digital landing page and administrative platform for the "Will Group for Development" (مجموعة الإرادة لتنمية الغدية) in Mauritania. It showcases the group's initiatives, organizational structure, and allows users to apply for membership or contact the group. It also includes an authenticated dashboard for administrators to manage content, users, and a secure election/voting system for members.
- **Target users:** 
  - **General Public:** Visitors wanting to learn about the group, contact them, or join.
  - **Members:** Registered users who can log in, view their profiles, and participate in internal elections.
  - **Administrators:** Platform managers who handle landing page content, approve join requests, manage the user directory, and orchestrate elections.
- **Core features:**
  - Dynamic Arabic-first landing page driven by a CMS-like Firestore backend.
  - Contact and Membership application forms.
  - Secure, real-time Voting and Elections system (Nomination, Member Picking, Yes/No votes).
  - Admin Dashboard for CMS management, User/Member management, and Election oversight.
- **Current development maturity level:** Functional MVP (Minimum Viable Product). Core features are implemented, utilizing Next.js 15 App Router and Firebase, but lacks automated testing and CI/CD pipelines.

---

## 2. Architecture Overview

- **High-level system design:**
  - **Frontend:** Next.js 15 using the App Router architecture. It utilizes a mix of React Server Components (RSC) for initial fast, SEO-friendly page loads (e.g., `src/app/page.tsx`) and Client Components for interactivity (e.g., forms, voting UI). 
  - **Backend:** Serverless backend heavily reliant on Firebase. Next.js Server Actions (`src/features/*/actions.ts`) are used for secure operations that require Admin privileges.
  - **Database:** Firebase Firestore (NoSQL) with strict Security Rules (`firebase/firestore.rules`).
  - **Authentication:** Firebase Auth (using Google Authentication SMS / Phone Auth) is used for managing user sessions and verifying members, combined with a custom `admins-simple` collection for role-based access control (RBAC).
- **Folder and module structure explanation:**
  - `src/app/`: The routing layer. Contains public routes (`/`, `/elections`, `/signin`) and protected routes (`/dashboard`).
  - `src/components/`: Reusable, generic UI components like `Header.tsx`, `Footer.tsx`, `JoinForm.tsx`, and `ui/` primitive components.
  - `src/features/`: Domain-driven design structure. Groups logic by business domain (e.g., `elections`, `landing`, `users`). Inside each feature, you'll find `api.client.ts` (Firebase client calls), `actions.ts` (Server Actions), and specialized `components/` and `hooks/`.
  - `src/lib/`: Shared utilities, including `firebase/client.ts` and `firebase/admin.ts` for database connections.
  - `src/types/`: TypeScript interface definitions ensuring type safety across the stack.
- **Key architectural patterns used:**
  - **Domain-Driven Module Structure:** Code is grouped by feature (`src/features/*`) rather than by technical type, improving maintainability.
  - **Server Actions for Mutations:** Next.js Server Actions are used for secure DB writes (like casting a vote) to prevent client-side manipulation.
  - **Firebase Client for Reads:** Client-side Firebase SDK is used alongside React hooks (`useElection`, `useMyVote`) for real-time reactivity where security rules allow public or self-read access.
- **Data flow explanation:**
  1. **Public Reads:** Server Components fetch data using Admin SDK or Client API (e.g., `getPublicLandingData` in `page.tsx`) and render HTML.
  2. **Public Writes:** Forms (Contact, Join) write directly to Firestore using the Client SDK, protected by append-only security rules.
  3. **Protected Actions:** Voting or Admin changes trigger a Next.js Server Action (`actions.ts`). The server verifies the user's Auth token and Admin status via Firebase Admin SDK, executes the write, and revalidates the cache.

---

## 3. Tech Stack

- **Languages:** TypeScript, HTML, CSS.
- **Frameworks:** Next.js 15 (React 19).
- **Libraries:**
  - **Styling:** Tailwind CSS 4.0, PostCSS, `lucide-react` (icons), `clsx` & `tailwind-merge` (class utility).
  - **Animation:** `motion` (Framer Motion), `tw-animate-css`.
  - **Backend/DB:** `firebase` (Client SDK), `firebase-admin` (Server SDK).
  - **AI Integration:** `@google/genai` (Present in package.json, potentially for text generation or data processing).
- **Infrastructure and deployment setup:** Optimized for Vercel or any Node.js compatible serverless environment. Uses Next.js standard build process.
- **Environment variables:**
  - `NEXT_PUBLIC_FIREBASE_API_KEY`: Client-facing API key to initialize Firebase app.
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Domain for Firebase authentication endpoints.
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Uniquely identifies the Firebase project (e.g., `tenmiye-gdy`).
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: URL for Firebase Cloud Storage bucket.
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Used for Firebase Cloud Messaging.
  - `NEXT_PUBLIC_FIREBASE_APP_ID`: Unique identifier for the specific web app within the Firebase project.

---

## 4. Feature Documentation

### Landing Page & CMS
- **Purpose:** Display dynamic information about the Will Group.
- **Related files:** `src/app/page.tsx`, `src/features/landing/api.client.ts`.
- **How it works:** `src/app/page.tsx` is a Server Component that fetches data from the `settings-simple/public` Firestore document on page load. It dynamically renders the hero section, stats, initiatives carousel, and team hierarchy.
- **Dependencies:** Firebase Firestore.
- **Known issues:** It uses `export const dynamic = 'force-dynamic'; export const revalidate = 0;`, meaning the page renders dynamically on *every* request. This bypassed Next.js caching, which may impact scalability under high traffic.

### Elections & Voting System
- **Purpose:** Allow group members to securely vote on various decisions.
- **Related files:** `src/app/elections/`, `src/features/elections/actions.ts`, `src/features/elections/hooks/`.
- **How it works:** Users navigate to an election, authenticate, and cast their vote. Votes are recorded in `votes-simple` using a composite ID (`electionId_userId`) to prevent double voting. The transaction is handled securely via Server Actions (`actions.ts`).
- **Dependencies:** Firebase Auth, Server Actions.

### Admin Dashboard
- **Purpose:** Manage the platform.
- **Related files:** `src/app/dashboard/`, `src/context/DashboardContext.tsx`.
- **How it works:** Protected route accessible only to users whose email exists and is active in the `admins-simple` Firestore collection. Uses React Context to maintain admin session state.
- **Dependencies:** Firebase Auth, strict Firestore security rules.

---

## 5. API Documentation

Instead of a traditional REST API, this application utilizes Next.js Server Actions acting as RPC (Remote Procedure Call) endpoints.

### Server Actions (`src/features/*/actions.ts`)

- **`castVote(electionId: string, payload: any)`**
  - **Purpose:** Records a user's vote.
  - **Authentication:** Validates Firebase Auth session token.
  - **Validation:** Checks if the election is active and if the user has already voted by checking the `votes-simple` collection.
  - **Error Handling:** Throws standard JavaScript errors caught by the React front-end (e.g., "Already voted", "Election closed").

### Direct Client Integrations
Forms like the Contact and Join forms write directly to Firestore collections (`messages-simple`, `join-requests-simple`). 
- **Security:** Allowed by Firestore rules (`allow create: if true;`), but heavily restricted for reading/updating.

---

## 6. Database Documentation

Firestore Schema uses a `-simple` suffix convention for collections.

- **`settings-simple`**: 
  - **`public` (Document)**: Holds all landing page text, arrays for initiatives, and nested maps for `teamHierarchy`.
- **`users-simple`**:
  - Contains private user data (phone, email, registration info).
- **`public-members`**:
  - Public-facing directory data for members.
- **`admins-simple`**:
  - Keys are user emails. Documents contain `{ status: 'active' }`. Used by Security Rules to determine admin privileges.
- **`elections-simple`**:
  - Defines election metadata (title, type, status, options).
- **`votes-simple`**:
  - Document IDs are formatted as `electionId_userId`. This inherently prevents duplicate votes at the database level.
- **`nominations-simple` / `nomination-counts`**:
  - Stores open-ended nomination entries and aggregated counts.
- **`join-requests-simple` / `messages-simple`**:
  - Append-only collections for public form submissions.

**Security Rules (`firebase/firestore.rules`):**
- Strictly enforced. Admins (checked via `admins-simple` collection) have read/write access to most collections. Users can only read/update their specific document in `users-simple`, and public writes are restricted to `create` only for forms.

---

## 7. State Management

- **Global state structure:** Minimal global state. Admin auth and basic dashboard UI state is managed via React Context (`src/context/DashboardContext.tsx`).
- **Data fetching strategy:** 
  - **Public Data:** Fetched server-side in Next.js Page components.
  - **Client Data/Real-time:** Uses custom React Hooks (e.g., `useElection.ts`) wrapping Firebase Client SDK for real-time `onSnapshot` listeners to keep UI synchronized with database changes (especially useful for election results).
- **Caching logic:** Next.js native caching is largely disabled on the homepage (`revalidate = 0`) to ensure fresh CMS data. Dashboard components rely on real-time Firebase listeners which handle their own local caching.

---

## 8. Testing Coverage

- **Test structure:** No testing framework (Jest, Cypress, Playwright) is currently configured in `package.json`.
- **What is covered:** Zero automated test coverage.
- **What is missing:** 
  - Unit tests for Server Actions and Firebase utility functions.
  - Component tests for complex UI like Voting forms and Dashboard settings.
  - E2E tests for critical user flows (Joining the group, Logging in, Casting a vote).

---

## 9. DevOps & Deployment

- **CI/CD:** No continuous integration or deployment pipelines (like GitHub Actions) are defined in the repository.
- **Hosting:** The project is a Next.js application, making it highly suitable for deployment on **Vercel**. Alternatively, it could be deployed using Firebase Hosting with Next.js web framework support.
- **Environment separation:** Relies on `.env` files. To separate Dev/Staging/Prod, different Firebase projects must be created, and their respective keys loaded into different environments on the hosting provider.

---

## 10. Technical Debt & Risk Areas

- **Code smells:** 
  - Heavy reliance on `dynamic = 'force-dynamic'` in `page.tsx` nullifies Next.js Static Site Generation (SSG) and Incremental Static Regeneration (ISR) benefits, potentially slowing down load times and increasing database read costs.
- **Scalability concerns:** 
  - High traffic to the homepage will result in 1:1 read operations on Firestore.
  - Election voting might hit Firestore write limits if hundreds of users vote in the exact same second (though unlikely for a simple app, it's a structural note).
- **Security risks:** 
  - Firebase rules are robust, but Client-side DB reads always expose the schema. Ensure no sensitive keys are ever placed in `settings-simple/public`.
- **Performance bottlenecks:** Loading heavy images on the landing page without Next.js `<Image />` optimization (currently relying on standard `url()` in CSS or `<img>`).

---

## 11. Roadmap Suggestions

1. **Refactoring Priorities:**
   - **Implement ISR:** Change `export const revalidate = 0` to a reasonable time (e.g., `revalidate = 60`) in `src/app/page.tsx` or use Next.js `revalidatePath` inside the Admin Dashboard Server Actions when saving settings. This will drastically improve performance and lower Firebase read costs.
   - **Next.js Image Component:** Refactor hero background and team hierarchy photos to use `next/image` for automatic WebP conversion and lazy loading.
2. **Stabilization Recommendations:**
   - **Implement Google Authentication SMS:** Replace the temporary PIN bypass (`VOTER_BYPASS_CODE`) in `actions.ts` with a full integration of Firebase Phone Authentication for secure, SMS-based member verification during elections.
   - **Add Automated Testing:** Install `Vitest` for logic/action testing and `Playwright` for E2E testing of the Voting and Form submission flows.
3. **Logical next steps:**
   - Setup a GitHub Action workflow to lint, type-check, and run tests on Pull Requests.
   - Create a staging environment (Staging Firebase Project) to safely test database rule changes before production.
