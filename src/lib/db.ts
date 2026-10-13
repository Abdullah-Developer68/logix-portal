import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  PortalDatabase,
  InternRecord,
  EvaluationRecord,
  AuditLogEntry,
  UserRole,
} from "./types";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "logix-portal-data")
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "portal-db.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

export function hashPassword(password: string): string {
  const salt = "logix_portal_salt_2026";
  const derived = crypto.scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const computed = hashPassword(password);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(storedHash),
    );
  } catch {
    return false;
  }
}

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›"))
    .trim();
}

export function calculateEndDate(startDate: string, durationMonths: number): string {
  if (!startDate) return "";
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + Number(durationMonths || 3));
  return d.toISOString().split("T")[0];
}

export function calculateGrade(
  totalMarks: number,
): EvaluationRecord["grade"] {
  if (totalMarks >= 90) return "A+";
  if (totalMarks >= 80) return "A";
  if (totalMarks >= 70) return "B+";
  if (totalMarks >= 60) return "B";
  if (totalMarks >= 50) return "C";
  return "F";
}

function createSeedDatabase(): PortalDatabase {
  const adminPasswordHash = hashPassword("Admin@123");
  const mentorPasswordHash = hashPassword("Mentor@123");
  const internPasswordHash = hashPassword("Intern@123");

  return {
    users: [
      {
        id: "usr-admin-1",
        email: "admin@logix.dev",
        passwordHash: adminPasswordHash,
        role: "admin",
        name: "Areeba Siddiqui (Program Director)",
        emailVerified: true,
        createdAt: "2026-01-10T09:00:00Z",
        lastLoginAt: "2026-10-13T05:00:00Z",
      },
      {
        id: "usr-mentor-1",
        email: "mentor@logix.dev",
        passwordHash: mentorPasswordHash,
        role: "mentor",
        name: "Zainab Tariq (Principal Architect)",
        emailVerified: true,
        mentorId: "mnt-1",
        createdAt: "2026-01-15T10:00:00Z",
        lastLoginAt: "2026-10-12T16:30:00Z",
      },
      {
        id: "usr-mentor-2",
        email: "omar.farooq@logix.dev",
        passwordHash: mentorPasswordHash,
        role: "mentor",
        name: "Omar Farooq (Staff AI Engineer)",
        emailVerified: true,
        mentorId: "mnt-2",
        createdAt: "2026-02-01T10:00:00Z",
      },
      {
        id: "usr-mentor-3",
        email: "sana.malik@logix.dev",
        passwordHash: mentorPasswordHash,
        role: "mentor",
        name: "Sana Malik (Design Systems Lead)",
        emailVerified: true,
        mentorId: "mnt-3",
        createdAt: "2026-02-05T10:00:00Z",
      },
      {
        id: "usr-intern-1",
        email: "hamza.ahmed@student.edu.pk",
        passwordHash: internPasswordHash,
        role: "intern",
        name: "Hamza Ahmed",
        emailVerified: true,
        internRecordId: "int-1",
        createdAt: "2026-07-01T08:00:00Z",
        lastLoginAt: "2026-10-13T04:15:00Z",
      },
      {
        id: "usr-intern-2",
        email: "ayesha.khan@nust.edu.pk",
        passwordHash: internPasswordHash,
        role: "intern",
        name: "Ayesha Khan",
        emailVerified: true,
        internRecordId: "int-2",
        createdAt: "2026-08-12T11:20:00Z",
      },
      {
        id: "usr-intern-3",
        email: "bilal.raza@fast.edu.pk",
        passwordHash: internPasswordHash,
        role: "intern",
        name: "Bilal Raza",
        emailVerified: true,
        internRecordId: "int-3",
        createdAt: "2026-06-28T09:00:00Z",
      },
    ],
    fields: [
      {
        id: "fld-web",
        name: "Web Development",
        code: "WEB",
        podName: "Web Platform Pod",
        description:
          "Full-stack modern web engineering using Next.js App Router, React 19, TypeScript, Tailwind CSS, and scalable APIs.",
        totalSeats: 25,
        filledSeats: 14,
        active: true,
        defaultSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Node.js"],
      },
      {
        id: "fld-app",
        name: "App Development",
        code: "APP",
        podName: "Mobile Engineering Pod",
        description:
          "Cross-platform mobile engineering with React Native, Flutter, offline-first storage, and native device integrations.",
        totalSeats: 15,
        filledSeats: 8,
        active: true,
        defaultSkills: ["React Native", "Flutter", "TypeScript", "REST APIs"],
      },
      {
        id: "fld-ai",
        name: "AI / Machine Learning",
        code: "AIML",
        podName: "AI & Automation Pod",
        description:
          "Applied LLM orchestration, RAG pipelines, Python model evaluation, and intelligent workflow automation.",
        totalSeats: 15,
        filledSeats: 9,
        active: true,
        defaultSkills: ["Python", "PyTorch", "RAG / LLMs", "FastAPI"],
      },
      {
        id: "fld-uiux",
        name: "UI/UX Design",
        code: "UIUX",
        podName: "Design Systems Pod",
        description:
          "Tokenized design systems in Figma, interactive prototyping, accessibility (WCAG AA), and user research.",
        totalSeats: 12,
        filledSeats: 6,
        active: true,
        defaultSkills: ["Figma", "Design Systems", "Prototyping", "UX Research"],
      },
      {
        id: "fld-qa",
        name: "Software Testing & QA",
        code: "QA",
        podName: "Quality Engineering Pod",
        description:
          "End-to-end automated testing with Playwright, API contract validation, performance benchmarking, and CI/CD gates.",
        totalSeats: 10,
        filledSeats: 4,
        active: true,
        defaultSkills: ["Playwright", "Cypress", "API Testing", "GitHub Actions"],
      },
      {
        id: "fld-dm",
        name: "Digital Marketing & Growth",
        code: "DM",
        podName: "Growth & Brand Pod",
        description:
          "Technical SEO, product positioning, developer advocacy, conversion analytics, and content campaigns.",
        totalSeats: 10,
        filledSeats: 3,
        active: true,
        defaultSkills: ["Technical SEO", "Analytics", "Content Strategy", "Copywriting"],
      },
      {
        id: "fld-cloud",
        name: "Cloud & DevOps",
        code: "CLOUD",
        podName: "Infrastructure Pod",
        description:
          "Docker containerization, Kubernetes, Terraform IaC, observability stacks, and zero-downtime cloud deployments.",
        totalSeats: 10,
        filledSeats: 5,
        active: true,
        defaultSkills: ["Docker", "AWS / GCP", "CI/CD", "Linux"],
      },
    ],
    durations: [
      {
        id: "dur-1",
        months: 1,
        label: "1 Month (Intensive Bootcamp)",
        weeks: 4,
        active: true,
        description: "Fast-paced 4-week sprint ideal for semester breaks.",
      },
      {
        id: "dur-2",
        months: 2,
        label: "2 Months (Summer/Winter Track)",
        weeks: 8,
        active: true,
        description: "8-week structured project track with mid-term and final evaluations.",
      },
      {
        id: "dur-3",
        months: 3,
        label: "3 Months (Standard Cohort)",
        weeks: 12,
        active: true,
        description: "Core 12-week engineering internship with production pod rotation.",
      },
      {
        id: "dur-6",
        months: 6,
        label: "6 Months (Industrial Placement)",
        weeks: 24,
        active: true,
        description: "Deep 24-week industrial fellowship with pathway to full-time offer.",
      },
    ],
    batches: [
      {
        id: "bat-summer-26",
        name: "Summer 2026 Batch",
        code: "SUM-2026",
        startDate: "2026-07-01",
        endDate: "2026-10-01",
        status: "Completed",
        description: "Summer 2026 remote engineering & design fellowship cohort.",
      },
      {
        id: "bat-autumn-26",
        name: "Autumn 2026 Batch",
        code: "AUT-2026",
        startDate: "2026-09-01",
        endDate: "2026-12-01",
        status: "Active",
        description: "Fall semester cohort focused on Next.js 16, AI agents, and design systems.",
      },
      {
        id: "bat-winter-26",
        name: "Winter 2026 Batch",
        code: "WIN-2026",
        startDate: "2026-11-01",
        endDate: "2027-01-31",
        status: "Upcoming",
        description: "Winter 2026 cohort currently accepting student applications.",
      },
    ],
    mentors: [
      {
        id: "mnt-1",
        userId: "usr-mentor-1",
        name: "Zainab Tariq",
        email: "mentor@logix.dev",
        title: "Principal Full-Stack Architect",
        department: "Web Development",
        avatarInitials: "ZT",
        bio: "11+ years shipping distributed web platforms and design systems at Logix.",
      },
      {
        id: "mnt-2",
        userId: "usr-mentor-2",
        name: "Omar Farooq",
        email: "omar.farooq@logix.dev",
        title: "Staff AI & ML Engineer",
        department: "AI / Machine Learning",
        avatarInitials: "OF",
        bio: "Leads applied LLM pipelines, vector search infrastructure, and evaluation tooling.",
      },
      {
        id: "mnt-3",
        userId: "usr-mentor-3",
        name: "Sana Malik",
        email: "sana.malik@logix.dev",
        title: "Lead Product Designer",
        department: "UI/UX Design",
        avatarInitials: "SM",
        bio: "Creator of Logix Design System v1.0; mentors UI/UX and frontend interns.",
      },
    ],
    interns: [
      {
        id: "int-1",
        internId: "LGX-INT-2026-001",
        userId: "usr-intern-1",
        fullName: "Hamza Ahmed",
        fatherName: "Tariq Ahmed",
        cnicOrStudentId: "42101-8492014-3",
        email: "hamza.ahmed@student.edu.pk",
        phone: "+92 300 4129831",
        city: "Lahore",
        university: "FAST-NUCES Lahore",
        degree: "BS Computer Science",
        semester: "7th Semester",
        cgpa: "3.78",
        fieldId: "fld-web",
        fieldName: "Web Development",
        durationMonths: 3,
        startPreference: "2026-07-01",
        startDate: "2026-07-01",
        endDate: "2026-10-01",
        batchId: "bat-summer-26",
        batchName: "Summer 2026 Batch",
        mentorId: "mnt-1",
        mentorName: "Zainab Tariq",
        cvFileName: "Hamza_Ahmed_FullStack_CV.pdf",
        cvFileSize: 428000,
        coverLetter:
          "Passionate about building tokenized design systems and high-speed Next.js applications.",
        skills: ["Next.js", "React 19", "TypeScript", "Tailwind CSS", "PostgreSQL"],
        githubUrl: "https://github.com/hamza-ahmed-dev",
        linkedinUrl: "https://linkedin.com/in/hamza-ahmed-dev",
        portfolioUrl: "https://hamza.dev",
        applicationStatus: "Approved",
        internshipStatus: "Completed",
        archived: false,
        progressPercentage: 100,
        attendancePercentage: 96,
        appliedAt: "2026-06-18T10:30:00Z",
        updatedAt: "2026-10-05T14:20:00Z",
      },
      {
        id: "int-2",
        internId: "LGX-INT-2026-002",
        userId: "usr-intern-2",
        fullName: "Ayesha Khan",
        fatherName: "Kamran Khan",
        cnicOrStudentId: "37405-5910284-2",
        email: "ayesha.khan@nust.edu.pk",
        phone: "+92 321 9981204",
        city: "Islamabad",
        university: "NUST SEECS",
        degree: "BS Software Engineering",
        semester: "6th Semester",
        cgpa: "3.85",
        fieldId: "fld-ai",
        fieldName: "AI / Machine Learning",
        durationMonths: 3,
        startPreference: "2026-09-01",
        startDate: "2026-09-01",
        endDate: "2026-12-01",
        batchId: "bat-autumn-26",
        batchName: "Autumn 2026 Batch",
        mentorId: "mnt-2",
        mentorName: "Omar Farooq",
        cvFileName: "Ayesha_Khan_AI_Resume.pdf",
        cvFileSize: 512000,
        coverLetter:
          "Researching RAG evaluation pipelines and agentic tool-use benchmarks at NUST.",
        skills: ["Python", "LangChain", "PyTorch", "FastAPI", "TypeScript"],
        githubUrl: "https://github.com/ayesha-ai",
        linkedinUrl: "https://linkedin.com/in/ayesha-khan-seecs",
        portfolioUrl: "https://ayeshakhan.ai",
        applicationStatus: "Approved",
        internshipStatus: "Active",
        archived: false,
        progressPercentage: 67,
        attendancePercentage: 94,
        appliedAt: "2026-08-14T09:15:00Z",
        updatedAt: "2026-10-12T11:00:00Z",
      },
      {
        id: "int-3",
        internId: "LGX-INT-2026-003",
        userId: "usr-intern-3",
        fullName: "Bilal Raza",
        fatherName: "Raza Mehmood",
        cnicOrStudentId: "42201-7731902-1",
        email: "bilal.raza@fast.edu.pk",
        phone: "+92 333 2194810",
        city: "Karachi",
        university: "FAST-NUCES Karachi",
        degree: "BS Computer Science",
        semester: "8th Semester",
        cgpa: "3.64",
        fieldId: "fld-uiux",
        fieldName: "UI/UX Design",
        durationMonths: 3,
        startPreference: "2026-07-01",
        startDate: "2026-07-01",
        endDate: "2026-10-01",
        batchId: "bat-summer-26",
        batchName: "Summer 2026 Batch",
        mentorId: "mnt-3",
        mentorName: "Sana Malik",
        cvFileName: "Bilal_Raza_ProductDesign_CV.pdf",
        cvFileSize: 640000,
        coverLetter:
          "Focused on accessible design tokens, micro-interactions, and high-craft Figma component libraries.",
        skills: ["Figma", "Design Tokens", "Tailwind CSS", "WCAG Accessibility"],
        githubUrl: "https://github.com/bilal-ui",
        linkedinUrl: "https://linkedin.com/in/bilal-raza-design",
        portfolioUrl: "https://bilalraza.design",
        applicationStatus: "Approved",
        internshipStatus: "Completed",
        archived: false,
        progressPercentage: 100,
        attendancePercentage: 92,
        appliedAt: "2026-06-20T13:00:00Z",
        updatedAt: "2026-10-03T17:00:00Z",
      },
      {
        id: "int-4",
        internId: "LGX-INT-2026-004",
        fullName: "Usman Ghani",
        fatherName: "Abdul Ghani",
        cnicOrStudentId: "35202-1193847-5",
        email: "usman.ghani@pucit.edu.pk",
        phone: "+92 312 7845120",
        city: "Lahore",
        university: "PUCIT Lahore",
        degree: "BS Information Technology",
        semester: "6th Semester",
        cgpa: "3.52",
        fieldId: "fld-app",
        fieldName: "App Development",
        durationMonths: 2,
        startPreference: "2026-09-01",
        startDate: "2026-09-01",
        endDate: "2026-11-01",
        batchId: "bat-autumn-26",
        batchName: "Autumn 2026 Batch",
        mentorId: "mnt-1",
        mentorName: "Zainab Tariq",
        cvFileName: "Usman_Ghani_Mobile_CV.pdf",
        cvFileSize: 380000,
        coverLetter: "Built 3 production React Native apps with offline sync.",
        skills: ["React Native", "Expo", "TypeScript", "Redux Toolkit"],
        githubUrl: "https://github.com/usman-mobile",
        linkedinUrl: "https://linkedin.com/in/usman-ghani",
        applicationStatus: "Approved",
        internshipStatus: "Active",
        archived: false,
        progressPercentage: 50,
        attendancePercentage: 89,
        appliedAt: "2026-08-22T15:40:00Z",
        updatedAt: "2026-10-11T09:10:00Z",
      },
      {
        id: "int-5",
        internId: "LGX-INT-2026-005",
        fullName: "Fatima Noor",
        fatherName: "Noor Ul Amin",
        cnicOrStudentId: "61101-9938172-4",
        email: "fatima.noor@comsats.edu.pk",
        phone: "+92 345 8192033",
        city: "Islamabad",
        university: "COMSATS Islamabad",
        degree: "BS Computer Science",
        semester: "5th Semester",
        cgpa: "3.91",
        fieldId: "fld-web",
        fieldName: "Web Development",
        durationMonths: 6,
        startPreference: "2026-11-01",
        startDate: "2026-11-01",
        endDate: "2027-05-01",
        batchId: "bat-winter-26",
        batchName: "Winter 2026 Batch",
        mentorId: "mnt-1",
        mentorName: "Zainab Tariq",
        cvFileName: "Fatima_Noor_CV_2026.pdf",
        cvFileSize: 495000,
        coverLetter:
          "Looking to join the Winter 2026 6-month industrial placement track in Web Development.",
        skills: ["React", "Next.js", "TypeScript", "GraphQL", "Tailwind CSS"],
        githubUrl: "https://github.com/fatimanoor-dev",
        linkedinUrl: "https://linkedin.com/in/fatimanoor-cs",
        portfolioUrl: "https://fatimanoor.dev",
        applicationStatus: "Pending",
        internshipStatus: "Applied",
        archived: false,
        progressPercentage: 0,
        attendancePercentage: 0,
        appliedAt: "2026-10-11T18:20:00Z",
        updatedAt: "2026-10-11T18:20:00Z",
      },
      {
        id: "int-6",
        internId: "LGX-INT-2026-006",
        fullName: "Daniyal Shah",
        fatherName: "Syed Salman Shah",
        cnicOrStudentId: "42301-4481920-9",
        email: "daniyal.shah@iba.edu.pk",
        phone: "+92 301 6628194",
        city: "Karachi",
        university: "IBA Karachi",
        degree: "BS Computer Science",
        semester: "7th Semester",
        cgpa: "3.71",
        fieldId: "fld-qa",
        fieldName: "Software Testing & QA",
        durationMonths: 3,
        startPreference: "2026-11-01",
        startDate: "2026-11-01",
        endDate: "2027-02-01",
        batchId: "bat-winter-26",
        batchName: "Winter 2026 Batch",
        mentorId: "mnt-1",
        mentorName: "Zainab Tariq",
        cvFileName: "Daniyal_Shah_QA_Resume.pdf",
        cvFileSize: 310000,
        coverLetter:
          "Experienced with Playwright E2E test suites and GitHub Actions CI workflows.",
        skills: ["Playwright", "TypeScript", "API Testing", "Jest"],
        githubUrl: "https://github.com/daniyal-qa",
        linkedinUrl: "https://linkedin.com/in/daniyal-shah-iba",
        applicationStatus: "Pending",
        internshipStatus: "Applied",
        archived: false,
        progressPercentage: 0,
        attendancePercentage: 0,
        appliedAt: "2026-10-12T10:05:00Z",
        updatedAt: "2026-10-12T10:05:00Z",
      },
      {
        id: "int-7",
        internId: "LGX-INT-2026-007",
        fullName: "Saad Mansoor",
        fatherName: "Mansoor Ali",
        cnicOrStudentId: "35201-6620193-7",
        email: "saad.mansoor@uet.edu.pk",
        phone: "+92 322 4401928",
        city: "Lahore",
        university: "UET Lahore",
        degree: "BS Computer Engineering",
        semester: "5th Semester",
        cgpa: "3.15",
        fieldId: "fld-dm",
        fieldName: "Digital Marketing & Growth",
        durationMonths: 1,
        startPreference: "2026-07-01",
        startDate: "2026-07-01",
        endDate: "2026-08-01",
        batchId: "bat-summer-26",
        batchName: "Summer 2026 Batch",
        mentorId: "mnt-3",
        mentorName: "Sana Malik",
        cvFileName: "Saad_Mansoor_Growth.pdf",
        cvFileSize: 290000,
        skills: ["SEO", "Google Analytics", "Content Copywriting"],
        applicationStatus: "Approved",
        internshipStatus: "Dropped",
        archived: false,
        progressPercentage: 25,
        attendancePercentage: 55,
        appliedAt: "2026-06-25T10:00:00Z",
        updatedAt: "2026-07-22T12:00:00Z",
      },
    ],
    tasks: [
      {
        id: "tsk-1",
        title: "Architect Tokenized UI Component Library (Logix v1.0)",
        description:
          "Build Button, Badge, Card, Input, and Modal components matching the Logix Design System v1.0 specifications with full dark mode support.",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        fieldName: "Web Development",
        assignedByMentorId: "mnt-1",
        assignedByName: "Zainab Tariq",
        deadline: "2026-07-25",
        priority: "High",
        attachmentName: "Logix-Design-System-v1.pdf",
        status: "Approved",
        submissionLink: "https://github.com/Abdullah-Developer68/logix/pull/12",
        submissionFileName: "ui-components-bundle.zip",
        submissionNotes:
          "Implemented all semantic color tokens in globals.css and verified WCAG contrast ratios.",
        submittedAt: "2026-07-23T18:00:00Z",
        mentorComments:
          "Exceptional attention to typography scale and zero layout shift. Approved with full credit.",
        reviewedAt: "2026-07-24T11:30:00Z",
        createdAt: "2026-07-05T09:00:00Z",
      },
      {
        id: "tsk-2",
        title: "Build Responsive Portfolio & Case Studies Filtering Engine",
        description:
          "Implement client-side category filtering, case study metric cards, and smooth Framer Motion transitions.",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        fieldName: "Web Development",
        assignedByMentorId: "mnt-1",
        assignedByName: "Zainab Tariq",
        deadline: "2026-08-20",
        priority: "Medium",
        status: "Approved",
        submissionLink: "https://github.com/Abdullah-Developer68/logix/pull/27",
        submissionNotes: "Completed with keyboard accessible filter tabs and responsive grid.",
        submittedAt: "2026-08-18T15:20:00Z",
        mentorComments: "Clean state management and fast rendering.",
        reviewedAt: "2026-08-19T10:00:00Z",
        createdAt: "2026-08-01T09:00:00Z",
      },
      {
        id: "tsk-3",
        title: "Implement Multipart Resume Upload & Nodemailer Notification API",
        description:
          "Create Next.js App Router POST endpoint `/api/apply` with file validation (10MB limit) and HTML email dispatch.",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        fieldName: "Web Development",
        assignedByMentorId: "mnt-1",
        assignedByName: "Zainab Tariq",
        deadline: "2026-09-25",
        priority: "High",
        status: "Approved",
        submissionLink: "https://github.com/Abdullah-Developer68/logix/pull/41",
        submissionNotes: "Added drag-and-drop upload zone and MIME type verification.",
        submittedAt: "2026-09-22T14:10:00Z",
        mentorComments: "Production-ready implementation. Great job completing all 3 cohort milestones!",
        reviewedAt: "2026-09-24T09:45:00Z",
        createdAt: "2026-09-02T09:00:00Z",
      },
      {
        id: "tsk-4",
        title: "Benchmark Hybrid Semantic + BM25 Retrieval Pipeline",
        description:
          "Evaluate top-k recall accuracy across 500 technical documentation queries and submit latency percentiles.",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        fieldName: "AI / Machine Learning",
        assignedByMentorId: "mnt-2",
        assignedByName: "Omar Farooq",
        deadline: "2026-09-28",
        priority: "High",
        attachmentName: "RAG-Benchmark-Dataset.json",
        status: "Approved",
        submissionLink: "https://github.com/ayesha-ai/logix-rag-eval",
        submissionNotes: "Achieved 91.4% Recall@5 with reciprocal rank fusion.",
        submittedAt: "2026-09-26T19:00:00Z",
        mentorComments: "Thorough evaluation notebook and clean latency charts.",
        reviewedAt: "2026-09-27T14:00:00Z",
        createdAt: "2026-09-05T10:00:00Z",
      },
      {
        id: "tsk-5",
        title: "Streaming Tool-Call Guardrails Middleware",
        description:
          "Build schema validation and retry middleware for structured JSON tool calls in Python FastAPI.",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        fieldName: "AI / Machine Learning",
        assignedByMentorId: "mnt-2",
        assignedByName: "Omar Farooq",
        deadline: "2026-10-18",
        priority: "High",
        status: "Submitted",
        submissionLink: "https://github.com/ayesha-ai/logix-guardrails/pull/4",
        submissionNotes: "Implemented Pydantic v2 streaming validator with exponential backoff.",
        submittedAt: "2026-10-12T17:45:00Z",
        createdAt: "2026-10-01T10:00:00Z",
      },
      {
        id: "tsk-6",
        title: "Multi-Agent Evaluation Dashboard UI Integration",
        description:
          "Connect the FastAPI evaluation metrics endpoint to a live telemetry view.",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        fieldName: "AI / Machine Learning",
        assignedByMentorId: "mnt-2",
        assignedByName: "Omar Farooq",
        deadline: "2026-11-10",
        priority: "Medium",
        status: "Assigned",
        createdAt: "2026-10-10T10:00:00Z",
      },
      {
        id: "tsk-7",
        title: "Design Token Audit & Dark Mode Contrast Specification",
        description:
          "Deliver complete Figma component matrix and token documentation for Logix Portal v1.0.",
        internRecordId: "int-3",
        internId: "LGX-INT-2026-003",
        internName: "Bilal Raza",
        fieldName: "UI/UX Design",
        assignedByMentorId: "mnt-3",
        assignedByName: "Sana Malik",
        deadline: "2026-09-15",
        priority: "High",
        status: "Approved",
        submissionLink: "https://figma.com/file/logix-design-system-v1",
        submissionNotes: "All 28 component states documented with light/dark parity.",
        submittedAt: "2026-09-12T16:00:00Z",
        mentorComments: "Flawless token hierarchy and developer handoff specs.",
        reviewedAt: "2026-09-14T11:00:00Z",
        createdAt: "2026-07-15T09:00:00Z",
      },
      {
        id: "tsk-8",
        title: "Offline SQLite Sync Layer for Field Service Mobile App",
        description:
          "Implement optimistic queue synchronization when mobile device reconnects to network.",
        internRecordId: "int-4",
        internId: "LGX-INT-2026-004",
        internName: "Usman Ghani",
        fieldName: "App Development",
        assignedByMentorId: "mnt-1",
        assignedByName: "Zainab Tariq",
        deadline: "2026-10-15",
        priority: "High",
        status: "Needs Revision",
        submissionLink: "https://github.com/usman-mobile/field-sync/pull/2",
        submissionNotes: "Initial queue sync working on Android simulator.",
        submittedAt: "2026-10-09T13:00:00Z",
        mentorComments:
          "Please add idempotency keys to prevent duplicate mutation replay when network flaps.",
        reviewedAt: "2026-10-10T16:00:00Z",
        createdAt: "2026-09-20T09:00:00Z",
      },
    ],
    attendance: [
      {
        id: "att-1",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        date: "2026-09-28",
        status: "Present",
        checkInTime: "09:04 AM",
        notes: "Completed final sprint review",
      },
      {
        id: "att-2",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        date: "2026-09-29",
        status: "Present",
        checkInTime: "08:58 AM",
        notes: "Codebase handoff documentation",
      },
      {
        id: "att-3",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        date: "2026-10-12",
        status: "Present",
        checkInTime: "09:12 AM",
        notes: "Working on streaming tool-call validator",
      },
      {
        id: "att-4",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        date: "2026-10-13",
        status: "Present",
        checkInTime: "09:01 AM",
        notes: "Daily standup with AI Pod",
      },
      {
        id: "att-5",
        internRecordId: "int-4",
        internId: "LGX-INT-2026-004",
        internName: "Usman Ghani",
        date: "2026-10-12",
        status: "Late",
        checkInTime: "10:35 AM",
        notes: "University lab exam in morning",
      },
      {
        id: "att-6",
        internRecordId: "int-4",
        internId: "LGX-INT-2026-004",
        internName: "Usman Ghani",
        date: "2026-10-13",
        status: "Present",
        checkInTime: "09:08 AM",
        notes: "Implementing idempotency keys per mentor review",
      },
    ],
    leaves: [
      {
        id: "lv-1",
        internRecordId: "int-2",
        internId: "LGX-INT-2026-002",
        internName: "Ayesha Khan",
        startDate: "2026-10-20",
        endDate: "2026-10-21",
        reason: "University mid-semester examination at NUST SEECS.",
        status: "Pending",
        createdAt: "2026-10-12T14:00:00Z",
      },
      {
        id: "lv-2",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        startDate: "2026-08-14",
        endDate: "2026-08-15",
        reason: "Family event in Lahore.",
        status: "Approved",
        reviewedBy: "Areeba Siddiqui",
        reviewedAt: "2026-08-12T10:00:00Z",
        createdAt: "2026-08-11T09:00:00Z",
      },
    ],
    evaluations: [
      {
        id: "evl-1",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        fieldName: "Web Development",
        mentorId: "mnt-1",
        mentorName: "Zainab Tariq",
        technicalSkills: 24,
        punctuality: 24,
        communication: 23,
        teamwork: 25,
        totalMarks: 96,
        grade: "A+",
        remarks:
          "Hamza demonstrated senior-level ownership across Next.js 16 architecture, Tailwind v4 design tokens, and API security. Highly recommended for a full-time Junior Software Engineer role.",
        completed: true,
        evaluatedAt: "2026-10-02T15:00:00Z",
        internFeedbackRating: 5,
        internFeedbackComments:
          "The 1-on-1 code reviews with Zainab and working on real production systems transformed my engineering confidence.",
        internFeedbackSubmittedAt: "2026-10-03T10:00:00Z",
      },
      {
        id: "evl-2",
        internRecordId: "int-3",
        internId: "LGX-INT-2026-003",
        internName: "Bilal Raza",
        fieldName: "UI/UX Design",
        mentorId: "mnt-3",
        mentorName: "Sana Malik",
        technicalSkills: 23,
        punctuality: 22,
        communication: 24,
        teamwork: 23,
        totalMarks: 92,
        grade: "A+",
        remarks:
          "Bilal delivered outstanding component token specs and accessibility audits across all web views.",
        completed: true,
        evaluatedAt: "2026-10-02T17:30:00Z",
        internFeedbackRating: 5,
        internFeedbackComments:
          "Loved collaborating with the Design Systems Pod and seeing my Figma tokens live in code.",
        internFeedbackSubmittedAt: "2026-10-03T12:15:00Z",
      },
    ],
    certificates: [
      {
        id: "crt-1",
        certificateNumber: "LGX-CERT-2026-8401",
        internRecordId: "int-1",
        internId: "LGX-INT-2026-001",
        internName: "Hamza Ahmed",
        fatherName: "Tariq Ahmed",
        fieldName: "Web Development",
        durationMonths: 3,
        batchName: "Summer 2026 Batch",
        startDate: "2026-07-01",
        endDate: "2026-10-01",
        issueDate: "2026-10-05",
        grade: "A+",
        totalMarks: 96,
        mentorName: "Zainab Tariq",
        signatoryName: "Areeba Siddiqui",
        signatoryTitle: "Director of Engineering & Talent, Logix Technologies",
        status: "Valid",
        history: [
          {
            action: "Issued",
            timestamp: "2026-10-05T14:20:00Z",
            actor: "Areeba Siddiqui (Admin)",
            note: "Issued upon completion of Summer 2026 Batch with Grade A+ (96/100).",
          },
        ],
      },
    ],
    notifications: [
      {
        id: "ntf-1",
        recipientRole: "intern",
        recipientEmail: "hamza.ahmed@student.edu.pk",
        recipientInternRecordId: "int-1",
        title: "Official Internship Certificate Issued!",
        message:
          "Congratulations Hamza! Your Completion Certificate (LGX-CERT-2026-8401) has been issued and is ready for PDF download with QR verification.",
        category: "certificate",
        read: false,
        emailDispatched: true,
        createdAt: "2026-10-05T14:20:00Z",
      },
      {
        id: "ntf-2",
        recipientRole: "intern",
        recipientEmail: "ayesha.khan@nust.edu.pk",
        recipientInternRecordId: "int-2",
        title: "New Task Assigned: Multi-Agent Evaluation Dashboard",
        message:
          "Mentor Omar Farooq assigned you a new task due on 2026-11-10.",
        category: "task",
        read: false,
        emailDispatched: true,
        createdAt: "2026-10-10T10:00:00Z",
      },
      {
        id: "ntf-3",
        recipientRole: "admin",
        title: "2 New Internship Applications Pending Review",
        message:
          "Fatima Noor (Web Development) and Daniyal Shah (Software Testing & QA) applied for the Winter 2026 Batch.",
        category: "application",
        read: false,
        emailDispatched: true,
        createdAt: "2026-10-12T10:05:00Z",
      },
      {
        id: "ntf-4",
        recipientRole: "mentor",
        title: "Task Submission Pending Review",
        message:
          "Ayesha Khan submitted 'Streaming Tool-Call Guardrails Middleware' for mentor review.",
        category: "task",
        read: false,
        emailDispatched: true,
        createdAt: "2026-10-12T17:45:00Z",
      },
    ],
    announcements: [
      {
        id: "ann-1",
        title: "Winter 2026 Batch Applications & Onboarding Schedule",
        content:
          "Onboarding for the Winter 2026 Cohort begins November 1, 2026. All active interns in the Autumn 2026 Batch should ensure mid-term task submissions are uploaded by October 20.",
        targetAudience: "All Interns",
        priority: "Important",
        authorName: "Areeba Siddiqui",
        authorRole: "admin",
        createdAt: "2026-10-10T09:00:00Z",
      },
      {
        id: "ann-2",
        title: "Engineering Demo Day & Certificate Ceremony — Summer 2026",
        content:
          "Congratulations to our Summer 2026 graduates! Verified digital certificates and experience letters are now available in your Intern Dashboard.",
        targetAudience: "Summer 2026 Batch",
        priority: "Normal",
        authorName: "Zainab Tariq",
        authorRole: "mentor",
        createdAt: "2026-10-05T15:00:00Z",
      },
    ],
    auditLogs: [
      {
        id: "aud-1",
        timestamp: "2026-10-05T14:20:00Z",
        actorName: "Areeba Siddiqui",
        actorEmail: "admin@logix.dev",
        actorRole: "admin",
        action: "ISSUED_CERTIFICATE",
        entityType: "Certificate",
        entityId: "LGX-CERT-2026-8401",
        details: "Issued verified completion certificate LGX-CERT-2026-8401 to Hamza Ahmed (LGX-INT-2026-001).",
      },
      {
        id: "aud-2",
        timestamp: "2026-10-02T15:00:00Z",
        actorName: "Zainab Tariq",
        actorEmail: "mentor@logix.dev",
        actorRole: "mentor",
        action: "COMPLETED_EVALUATION",
        entityType: "Evaluation",
        entityId: "evl-1",
        details: "Submitted final evaluation for Hamza Ahmed: 96/100 (Grade A+).",
      },
      {
        id: "aud-3",
        timestamp: "2026-10-12T10:05:00Z",
        actorName: "Daniyal Shah",
        actorEmail: "daniyal.shah@iba.edu.pk",
        actorRole: "applicant",
        action: "SUBMITTED_APPLICATION",
        entityType: "Application",
        entityId: "LGX-INT-2026-006",
        details: "Submitted internship application for Software Testing & QA (3 Months, Winter 2026 Batch).",
      },
    ],
    backups: [
      {
        id: "bkp-1",
        timestamp: "2026-10-12T00:00:00Z",
        label: "Automatic Daily Snapshot (2026-10-12)",
        recordCount: 38,
        sizeBytes: 28410,
        createdBy: "System Cron",
      },
    ],
  };
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function recalculateMetrics(db: PortalDatabase): PortalDatabase {
  // Recalculate field seat counts
  for (const field of db.fields) {
    field.filledSeats = db.interns.filter(
      (i) =>
        !i.archived &&
        (i.fieldId === field.id || i.fieldName === field.name) &&
        (i.internshipStatus === "Active" || i.internshipStatus === "Completed"),
    ).length;
  }

  // Recalculate progress & attendance percentages for each intern
  for (const intern of db.interns) {
    const internTasks = db.tasks.filter(
      (t) => t.internRecordId === intern.id || t.internId === intern.internId,
    );
    if (internTasks.length > 0) {
      const approvedCount = internTasks.filter(
        (t) => t.status === "Approved",
      ).length;
      const submittedCount = internTasks.filter(
        (t) => t.status === "Submitted",
      ).length;
      const weighted = approvedCount + submittedCount * 0.5;
      intern.progressPercentage = Math.min(
        100,
        Math.round((weighted / internTasks.length) * 100),
      );
    } else if (intern.internshipStatus === "Completed") {
      intern.progressPercentage = 100;
    }

    const internAtt = db.attendance.filter(
      (a) => a.internRecordId === intern.id || a.internId === intern.internId,
    );
    if (internAtt.length > 0) {
      const presentOrLate = internAtt.filter(
        (a) => a.status === "Present" || a.status === "Late",
      ).length;
      intern.attendancePercentage = Math.round(
        (presentOrLate / internAtt.length) * 100,
      );
    }
  }

  return db;
}

export function readDb(): PortalDatabase {
  ensureDirectories();
  if (!fs.existsSync(DB_FILE)) {
    const seed = recalculateMetrics(createSeedDatabase());
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as PortalDatabase;
    return recalculateMetrics(parsed);
  } catch (err) {
    console.error("[DB READ ERROR, RE-SEEDING]", err);
    const seed = recalculateMetrics(createSeedDatabase());
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

export function writeDb(db: PortalDatabase): PortalDatabase {
  ensureDirectories();
  const updated = recalculateMetrics(db);
  fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), "utf8");
  return updated;
}

export function appendAuditLog(
  db: PortalDatabase,
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
) {
  db.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

export function createDatabaseBackup(
  db: PortalDatabase,
  label: string,
  createdBy: string,
) {
  ensureDirectories();
  const id = `bkp-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const serialized = JSON.stringify(db, null, 2);
  const backupFilePath = path.join(BACKUP_DIR, `${id}.json`);
  fs.writeFileSync(backupFilePath, serialized, "utf8");

  const recordCount =
    db.users.length +
    db.interns.length +
    db.tasks.length +
    db.attendance.length +
    db.evaluations.length +
    db.certificates.length;

  const snapshot = {
    id,
    timestamp,
    label: label || `Manual Backup (${timestamp.slice(0, 10)})`,
    recordCount,
    sizeBytes: Buffer.byteLength(serialized, "utf8"),
    createdBy,
  };

  db.backups.unshift(snapshot);
  writeDb(db);
  return snapshot;
}

export function generateNextInternId(db: PortalDatabase): string {
  const maxNum = db.interns.reduce((max, item) => {
    const match = item.internId.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      return n > max ? n : max;
    }
    return max;
  }, 0);
  const next = String(maxNum + 1).padStart(3, "0");
  return `LGX-INT-2026-${next}`;
}

export function generateCertificateNumber(db: PortalDatabase): string {
  const base = 8400 + db.certificates.length + 1;
  return `LGX-CERT-2026-${base}`;
}

export function addPortalNotification(
  db: PortalDatabase,
  params: {
    recipientRole: UserRole | "all";
    recipientEmail?: string;
    recipientInternRecordId?: string;
    title: string;
    message: string;
    category:
      | "application"
      | "status"
      | "task"
      | "evaluation"
      | "certificate"
      | "announcement"
      | "attendance";
    emailDispatched?: boolean;
  },
) {
  db.notifications.unshift({
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recipientRole: params.recipientRole,
    recipientEmail: params.recipientEmail,
    recipientInternRecordId: params.recipientInternRecordId,
    title: params.title,
    message: params.message,
    category: params.category,
    read: false,
    emailDispatched: params.emailDispatched ?? true,
    createdAt: new Date().toISOString(),
  });
}

export type { InternRecord };

