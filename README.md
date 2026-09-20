# EduNets Admin

Independent Next.js administration console for EduNets Class assignments. It connects to the same PostgreSQL database as EduNets, but does not require changes to or calls through the main application.

## Setup

1. Apply the current EduNets database migrations so `school_class`, `student_class_assignment`, and `teaching_scope.class_id` exist.
2. Copy `.env.example` to `.env.local` and provide the same runtime `DATABASE_URL` used by EduNets.
3. Set `BETTER_AUTH_URL`, use a strong `BETTER_AUTH_SECRET`, list administrator emails in `ADMIN_EMAILS`, and set one strong `ADMIN_PASSWORD` shared by those emails.
4. Optional: set both Google OAuth variables and add `/api/auth/callback/google` to the client's authorized redirect URIs.

```bash
npm install
npm run db:check
npm run dev
```

The console runs at `http://localhost:3001`. The fixed credentials work in development and production. Existing EduNets email/password login remains available, and Google login appears only when both Google OAuth variables are configured. Sign-up remains disabled.

## Checks

```bash
npm run check
```

Class creation, renaming, and assignments are handled by server-only route handlers using parameterized SQL and transactions. The database URL and allowlist are never exposed to browser code.
