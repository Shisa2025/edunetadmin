# EduNets Admin

Independent Next.js administration console for EduNets Class assignments. It connects to the same PostgreSQL database as EduNets, but does not require changes to or calls through the main application.

## Setup

1. Apply the current EduNets database migrations so `school_class`, `student_class_assignment`, and `teaching_scope.class_id` exist.
2. Copy `.env.example` to `.env.local` and provide the same runtime `DATABASE_URL` and Google OAuth credentials used by EduNets.
3. Set `BETTER_AUTH_URL=http://localhost:3001`, use a strong `BETTER_AUTH_SECRET`, and list one or more existing EduNets account emails in `ADMIN_EMAILS` separated by commas.
4. Add `http://localhost:3001/api/auth/callback/google` (and the equivalent production URL) to the Google OAuth client's authorized redirect URIs.

```bash
npm install
npm run db:check
npm run dev
```

The console runs at `http://localhost:3001`. Email and Google sign-up are disabled; administrators must already have an EduNets account. The admin app uses its own cookie prefix, so it can run alongside EduNets on localhost without replacing the user's main-app session.

For local UI verification, `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD` provide a development-only login. They are ignored by production builds. The included local values are `admin@local.test` and `edunets-local-admin`; change them freely in the ignored `.env.local` file.

## Checks

```bash
npm run check
```

Class creation, renaming, and assignments are handled by server-only route handlers using parameterized SQL and transactions. The database URL and allowlist are never exposed to browser code.
