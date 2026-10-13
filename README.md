# Logix — Internship Management Portal (v1.0)

A full-lifecycle **Internship Management Web Portal** built with the exact **Logix Design System v1.0** and tech stack (**Next.js 16.4 App Router**, **React 19**, **Tailwind CSS v4**, **TypeScript 5**, **Framer Motion**, **Lucide React**, and **Nodemailer**).

---

## 🔑 Quick Demo Credentials (1-Click Sign In Available at `/login`)

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Admin** | `admin@logix.dev` | `Admin@123` | Full control: Intern records, applications, fields/durations/batches, tasks, attendance, evaluations, certificates, CSV bulk import, PDF/Excel reports, announcements, audit logs, backups |
| **Supervisor / Mentor** | `mentor@logix.dev` | `Mentor@123` | Assign tasks, review deliverables (`Approved`, `Needs Revision`, `Rejected`), submit 4-pillar performance evaluations |
| **Intern (Completed)** | `hamza.ahmed@student.edu.pk` | `Intern@123` | Completed Summer 2026 cohort with issued QR-verified Certificate (`LGX-CERT-2026-8401`) and letters |
| **Intern (Active)** | `ayesha.khan@nust.edu.pk` | `Intern@123` | Active Autumn 2026 AI/ML intern with tasks, attendance, and leave requests |

---

## 🚀 Key Portal Routes

- **`/`**: Portal Overview, Role Launchpad, Live Internship Departments & Seats, and Instant Certificate Lookup.
- **`/login`**: Role-separated login (`Intern`, `Mentor`, `Admin`), Intern Registration with **6-digit Email Verification**, **Forgot Password Reset**, and 1-Click Demo Access.
- **`/apply`**: Full Intern Application Form (Personal details, Father's name, CNIC/Student ID, Photo, Education details, Field, Duration `1/2/3/6 months` with auto-calculated End Date, CV upload, Cover letter, Skills, GitHub/LinkedIn/Portfolio).
- **`/portal`**: Unified Role-Based Workspace with Session Timeout Monitor, Notification Center, and Role Dashboards (**Admin**, **Mentor**, **Intern**).
- **`/verify`**: Public Certificate Verification Registry (`/verify?cert=LGX-CERT-2026-8401`) with SVG QR Code & PDF print.

