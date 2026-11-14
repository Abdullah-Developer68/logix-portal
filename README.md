# Logix Internship Management Portal

The Logix Internship Management Portal manages the internship lifecycle from
application and selection through task tracking, evaluation, completion, and
certificate verification.

## Shared Database Note

This portal shares a Supabase Postgres database with `logixofficial.site`.
Portal-owned tables (`portal_records`, `portal_backups`, `portal_rate_limits`)
are managed via Drizzle using a separate migration history table
(`drizzle.__drizzle_migrations_portal`) and `tablesFilter: ["portal_*"]`.
The website-owned `internship_applications` table is read and updated via a
mirror schema (`src/db/website-schema.ts`) and is never migrated from this repo.

## Setup

1. Copy `.env.example` to `.env.local` and fill in the required values:
   - `DATABASE_URL` (Supabase transaction pooler, port 6543)
   - `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (for `portal-uploads` and `resumes` Storage buckets)
   - `PORTAL_SESSION_SECRET` (32+ characters, required in production)
   - `PORTAL_PUBLIC_URL` (production origin URL for CSRF checks)
   - `CRON_SECRET` (authorizes `/api/cron/deadline-reminders`)
   - Optional SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)

2. Run database migrations:
   ```bash
   npm run db:migrate
   ```

3. Create the initial administrator account:
   ```bash
   ADMIN_EMAIL=admin@logixofficial.site ADMIN_NAME="Portal Admin" ADMIN_PASSWORD="your-strong-password" npm run create-admin
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run create-admin
npm run test:security
```
