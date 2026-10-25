// server/db/migrations.js
// Safe, idempotent database schema migrations for PostgreSQL

import { query } from './pool.js';

export async function runMigrations() {
  console.log('[PostgreSQL Migration] Initializing safe schema migrations...');

  // Check if schema_migrations table exists
  const checkTable = await query(`
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'schema_migrations';
  `);

  if (checkTable.rows.length > 0) {
    const checkVersion = await query(`
      SELECT version FROM schema_migrations WHERE version = 'v1_initial_matters_hearings_reminders';
    `);
    if (checkVersion.rows.length > 0) {
      console.log('[PostgreSQL Migration] Schema migrations already up-to-date (v1 applied).');
      return;
    }
  }

  // 1. Schema Migrations Tracking Table
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      bar_council_number VARCHAR(100),
      chamber_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'Advocate',
      jurisdiction VARCHAR(255) DEFAULT 'Supreme Court & High Courts of India',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Matters Table (Multi-User Isolated)
  await query(`
    CREATE TABLE IF NOT EXISTS matters (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      matter_number VARCHAR(100),
      cnr VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      court VARCHAR(255) DEFAULT 'High Court of Delhi',
      matter_type VARCHAR(100) DEFAULT 'Commercial Suit',
      jurisdiction VARCHAR(255) DEFAULT 'New Delhi, India',
      client VARCHAR(255) NOT NULL,
      client_role VARCHAR(100) DEFAULT 'Plaintiff',
      opposite_party VARCHAR(255),
      opposing_counsel VARCHAR(255),
      judge VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Open',
      priority VARCHAR(50) DEFAULT 'Medium',
      stage VARCHAR(100) DEFAULT 'Pleadings & Filing',
      filing_date VARCHAR(50),
      next_hearing_date VARCHAR(50),
      claim_amount VARCHAR(100) DEFAULT '₹ 0',
      statutes_involved JSONB DEFAULT '["Code of Civil Procedure 1908", "Bharatiya Sakshya Adhiniyam 2023"]'::jsonb,
      summary TEXT,
      assigned_lawyer VARCHAR(255) DEFAULT 'Lead Advocate',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Hearings Table (Court Calendar)
  await query(`
    CREATE TABLE IF NOT EXISTS hearings (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      matter_id VARCHAR(64) NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
      matter_title VARCHAR(255) NOT NULL,
      case_number VARCHAR(100),
      court VARCHAR(255),
      location VARCHAR(255) DEFAULT 'Courtroom 4, Main Block',
      judge VARCHAR(255),
      hearing_date VARCHAR(64) NOT NULL,
      date VARCHAR(50) NOT NULL,
      time VARCHAR(20) DEFAULT '10:30',
      hearing_type VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'Scheduled',
      priority VARCHAR(50) DEFAULT 'High',
      outcome TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      reminder_days JSONB DEFAULT '[1, 3]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Reminders Table
  await query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hearing_id VARCHAR(64) REFERENCES hearings(id) ON DELETE CASCADE,
      matter_id VARCHAR(64) REFERENCES matters(id) ON DELETE CASCADE,
      matter_title VARCHAR(255),
      case_number VARCHAR(100),
      hearing_date VARCHAR(64),
      due_date VARCHAR(64) NOT NULL,
      days_before INTEGER DEFAULT 0,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'HearingReminder',
      status VARCHAR(50) DEFAULT 'Pending',
      is_read BOOLEAN DEFAULT FALSE,
      channel VARCHAR(100) DEFAULT 'In-App Notification',
      delivery_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 6. Sessions Table (Server-side Revocation & Multi-device Auth)
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(128),
      is_revoked BOOLEAN DEFAULT FALSE,
      is_valid BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      ip VARCHAR(100),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 7. Performance Indexes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_matters_user_id ON matters(user_id);
    CREATE INDEX IF NOT EXISTS idx_matters_user_status ON matters(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_matters_user_hearing ON matters(user_id, next_hearing_date);
    CREATE INDEX IF NOT EXISTS idx_hearings_user_id ON hearings(user_id);
    CREATE INDEX IF NOT EXISTS idx_hearings_matter_id ON hearings(matter_id);
    CREATE INDEX IF NOT EXISTS idx_hearings_user_date ON hearings(user_id, hearing_date);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
  `);

  // Record initial migration
  await query(`
    INSERT INTO schema_migrations (version, description)
    VALUES ('v1_initial_matters_hearings_reminders', 'Initial schema with users, matters, hearings, reminders, sessions and performance indexes')
    ON CONFLICT (version) DO NOTHING;
  `);

  console.log('[PostgreSQL Migration] Schema migrations executed successfully.');
}
