-- ============================================================================
-- LOGIX INTERNSHIP MANAGEMENT PORTAL - SUPABASE POSTGRESQL SCHEMA (v1.0)
-- Matches Drizzle ORM Schema & Better-Auth Specifications
-- With Complete Referential Integrity, Foreign Keys & Cascading Deletes
-- ============================================================================

-- 1. BETTER-AUTH AUTHENTICATION TABLES
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  role TEXT DEFAULT 'intern', -- 'admin' | 'mentor' | 'intern'
  banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  impersonated_by TEXT
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PORTAL CORE DOMAIN TABLES
CREATE TABLE IF NOT EXISTS "departments" (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  seats INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "batches" (
  id VARCHAR(64) PRIMARY KEY,
  name TEXT NOT NULL,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "durations" (
  id VARCHAR(64) PRIMARY KEY,
  months INTEGER NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "interns" (
  id VARCHAR(64) PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  father_name TEXT,
  cnic VARCHAR(64),
  email TEXT NOT NULL,
  phone VARCHAR(64),
  city VARCHAR(128),
  university TEXT,
  degree TEXT,
  semester VARCHAR(32),
  cgpa VARCHAR(32),
  department_id VARCHAR(64) REFERENCES "departments"(id) ON DELETE SET NULL,
  department_name TEXT,
  batch_id VARCHAR(64) REFERENCES "batches"(id) ON DELETE SET NULL,
  batch_name TEXT,
  duration VARCHAR(64) NOT NULL,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  mentor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  mentor_name TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'Applied', -- 'Applied', 'Active', 'Completed', 'Terminated', 'Dropped'
  progress INTEGER DEFAULT 0,
  cv_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  photo_url TEXT,
  cover_letter TEXT,
  skills TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "tasks" (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department_id VARCHAR(64) REFERENCES "departments"(id) ON DELETE SET NULL,
  intern_id VARCHAR(64) REFERENCES "interns"(id) ON DELETE CASCADE,
  mentor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  mentor_name TEXT,
  deadline VARCHAR(32) NOT NULL,
  attachment_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'Assigned', -- 'Assigned' | 'Submitted' | 'Approved' | 'Needs Revision' | 'Rejected'
  submission_link TEXT,
  submission_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "evaluations" (
  id VARCHAR(64) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES "interns"(id) ON DELETE CASCADE,
  mentor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  mentor_name TEXT,
  technical_score INTEGER NOT NULL DEFAULT 0,
  punctuality_score INTEGER NOT NULL DEFAULT 0,
  communication_score INTEGER NOT NULL DEFAULT 0,
  teamwork_score INTEGER NOT NULL DEFAULT 0,
  final_grade VARCHAR(16) NOT NULL DEFAULT 'A',
  feedback TEXT,
  recommend_for_cert BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "intern_feedback" (
  id VARCHAR(64) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES "interns"(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 5,
  mentor_helpfulness INTEGER NOT NULL DEFAULT 5,
  project_relevance INTEGER NOT NULL DEFAULT 5,
  comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "attendance" (
  id VARCHAR(64) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES "interns"(id) ON DELETE CASCADE,
  date VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Present', -- 'Present', 'Late', 'Absent', 'Leave'
  check_in_time VARCHAR(32),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
  id VARCHAR(64) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES "interns"(id) ON DELETE CASCADE,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "certificates" (
  id VARCHAR(64) PRIMARY KEY,
  intern_id VARCHAR(64) NOT NULL REFERENCES "interns"(id) ON DELETE CASCADE,
  intern_name TEXT NOT NULL,
  field TEXT NOT NULL,
  duration TEXT NOT NULL,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  issue_date VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Valid', -- 'Valid', 'Revoked'
  issued_by TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  grade VARCHAR(16),
  verification_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "announcements" (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_field TEXT DEFAULT 'All',
  target_batch TEXT DEFAULT 'All',
  author TEXT NOT NULL,
  priority VARCHAR(32) DEFAULT 'Normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  id VARCHAR(64) PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_interns_status ON "interns"(status);
CREATE INDEX IF NOT EXISTS idx_interns_dept ON "interns"(department_id);
CREATE INDEX IF NOT EXISTS idx_interns_email ON "interns"(email);
CREATE INDEX IF NOT EXISTS idx_tasks_intern ON "tasks"(intern_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON "tasks"(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_intern_date ON "attendance"(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_intern ON "attendance"(intern_id);
CREATE INDEX IF NOT EXISTS idx_leaves_intern ON "leave_requests"(intern_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_intern ON "evaluations"(intern_id);
CREATE INDEX IF NOT EXISTS idx_cert_status ON "certificates"(status);
CREATE INDEX IF NOT EXISTS idx_cert_intern ON "certificates"(intern_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON "audit_logs"(created_at);
