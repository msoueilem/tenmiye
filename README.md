# Will Group for Development - Landing Page

This project is a landing page for the "Will Group for Development" (مجموعة الإرادة لتنمية الغدية), built with Next.js (App Router), TypeScript, and Tailwind CSS. Data is fetched dynamically from Firebase Firestore.

## Prerequisites

- Node.js (Version 18 or later)
- Firebase account with Firestore enabled

## Environment Setup

1. Install required dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory and add your Firebase keys (see `.env.example`):

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tenmiye-gdy.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=tenmiye-gdy
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tenmiye-gdy.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=414092387059
   NEXT_PUBLIC_FIREBASE_APP_ID=1:414092387059:web:...
   ```

3. Run the project in development mode:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the project for production.
- `npm run start`: Starts the production server after building.
- `npm run lint`: Checks for code quality using ESLint.
- `npm run format`: Formats code using Prettier.
- `npm run type-check`: Runs TypeScript type checks.
- `npm run clean`: Removes the `.next` build directory.

## Database Setup (Firestore)

A single document must be created in Firestore for the landing page to work:

- **Collection:** `settings-simple`
- **Document:** `public`

### Required Fields:

- `aboutText` (string): "About Us" section text.
- `membersCount` (number): Number of members.
- `contact` (map):
  - `whatsapp` (string)
  - `phone` (string)
  - `email` (string)
  - `address` (string)
- `initiatives` (array of maps):
  - `title` (string)
  - `description` (string)
- `teamHierarchy` (map): Team structure (see example below).

### Team Hierarchy JSON Example (teamHierarchy):

```json
{
  "teams": [
    {
      "team_name": "Senior Management",
      "head": {
        "name": "John Doe",
        "title": "Group President",
        "photo": "IMAGE_URL"
      },
      "members": [
        {
          "name": "Jane Smith",
          "title": "Vice President",
          "photo": "IMAGE_URL"
        }
      ]
    }
  ]
}
```

## Important Notes

- Ensure Firestore security rules allow public read access for the `settings-simple/public` document.
- The page supports Dark Mode and uses Noto Sans Arabic fonts.
