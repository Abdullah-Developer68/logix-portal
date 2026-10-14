# Logix Internship Management Portal

The Logix Internship Management Portal manages the internship lifecycle from
application and selection through task tracking, evaluation, completion, and
certificate verification.

## Routes

- `/` and `/portal`: role-scoped Admin, Mentor, and Intern workspaces
- `/login`: registration, email verification, login, and password reset
- `/apply`: internship application form
- `/verify`: public certificate verification

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run test:security
```

Database commands:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
```
