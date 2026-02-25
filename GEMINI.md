# GEMINI.md - Will Group for Development (Simple Landing Page)

This document provides context for Gemini to handle the "Will Group" project. The project is a simple Next.js application representing an Arabic landing page.

## Project Overview

- **Purpose**: A landing page for a developmental initiative in Mauritania, including information about the group, initiatives, organizational structure, and contact forms.
- **Technologies Used**:
  - **Framework**: Next.js 15 (App Router)
  - **Language**: TypeScript
  - **Styling**: Tailwind CSS 4.0
  - **Backend**: Firebase Firestore (Client SDK)
  - **Formatting/Linting**: Prettier, ESLint

## Architecture & Data

- The project relies entirely on **Firebase Firestore** for dynamic data fetching.
- **Naming Convention**: All Firestore collections must end with the `-simple` suffix.
- **Main Collections**:
  - `settings-simple/public`: Contains the landing page content, members counter, initiatives list, and team structure.
  - `join-requests-simple`: Stores membership requests sent via the form.
  - `messages-simple`: Stores messages sent via the contact form.

## Building & Running

- **Install Dependencies**: `npm install`
- **Local Development**: `npm run dev`
- **Build Project**: `npm run build`
- **Format Code**: `npm run format` (Prettier)
- **Quality Check**: `npm run lint` (ESLint)
- **Data Initialization**: `node --env-file=.env scripts/bootstrap.mjs` (to upload initial data to Firestore).

## Development Conventions

- **Language and Direction**: The UI is entirely in Arabic (Arabic-only) and uses `dir="rtl"`.
- **Components**:
  - `TeamHierarchy`: Custom component to display organizational structure as a tree, based on JSON.
  - `JoinForm` & `ContactForm`: Client-side components that interact directly with Firestore.
- **Styles**: Uses Tailwind CSS with custom variables in `app/globals.css` (e.g., `--color-primary` for the gold color).
- **Images**: Images currently rely on external links from Google and Picsum as fallbacks.

## Important AI Notes

- When adding any new field to the page, update `lib/firebase/queries.ts` to define the interface and `scripts/bootstrap.mjs` to include the new data.
- Always escape quotes in Arabic text within JSX (use `&quot;`) to avoid ESLint errors.
- Adhere to the `-simple` suffix for any new Firestore collection created.
