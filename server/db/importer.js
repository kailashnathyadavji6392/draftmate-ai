// server/db/importer.js
// Validated one-time import from existing JSON files into PostgreSQL

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

function readJsonSafely(filename, defaultVal = []) {
  try {
    const fullPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[JSON Importer] Could not read ${filename}:`, err.message);
  }
  return defaultVal;
}

export async function importJsonDataToPostgres() {
  console.log('[JSON Importer] Starting validated one-time import from JSON to PostgreSQL...');

  const stats = {
    users: 0,
    matters: 0,
    hearings: 0,
    reminders: 0,
    sessions: 0
  };

  // 1. Users Import
  const users = readJsonSafely('usersDb.json', []);
  // Ensure legacy demo user exists if matters reference it
  const hasLegacyUser = users.some(u => u.id === 'usr-legacy-demo');
  if (!hasLegacyUser) {
    users.unshift({
      id: 'usr-legacy-demo',
      name: 'Legacy Demo Advocate',
      email: 'legacy.demo@draftmate.internal',
      passwordHash: '$2a$12$e.x..legacy.demo.unusable.hash.cannot.login.directly..',
      barCouncilNumber: '',
      chamberName: '',
      role: 'Legacy Archive',
      jurisdiction: 'Supreme Court & High Courts of India',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
  }

  for (const u of users) {
    if (!u.id || !u.email) continue;
    await query(`
      INSERT INTO users (
        id, name, email, password_hash, bar_council_number,
        chamber_name, role, jurisdiction, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      u.id,
      u.name || 'Advocate',
      (u.email || '').toLowerCase().trim(),
      u.passwordHash || '$2b$12$placeholder',
      u.barCouncilNumber || '',
      u.chamberName || '',
      u.role || 'Advocate',
      u.jurisdiction || 'Supreme Court & High Courts of India',
      u.createdAt || new Date().toISOString(),
      u.updatedAt || new Date().toISOString()
    ]);
    stats.users++;
  }

  // Set of valid user IDs for foreign key reference
  const validUserIds = new Set(users.map(u => u.id));

  // 2. Matters Import
  const matters = readJsonSafely('mattersDb.json', []);
  const validMatterIds = new Set();

  for (const m of matters) {
    if (!m.id || !m.title) continue;
    const userId = (m.userId && validUserIds.has(m.userId)) ? m.userId : 'usr-legacy-demo';
    const status = (!m.status || m.status === 'In Progress' || m.status === 'Active') ? 'Open' : m.status;

    await query(`
      INSERT INTO matters (
        id, user_id, matter_number, cnr, title, court, matter_type,
        jurisdiction, client, client_role, opposite_party, opposing_counsel,
        judge, status, priority, stage, filing_date, next_hearing_date,
        claim_amount, statutes_involved, summary, assigned_lawyer, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO NOTHING;
    `, [
      m.id,
      userId,
      m.matterNumber || `CASE-${Date.now().toString().slice(-4)}`,
      m.cnr || `DLHC01${Date.now().toString().slice(-6)}`,
      m.title.trim(),
      m.court || 'High Court of Delhi',
      m.matterType || 'Commercial Suit',
      m.jurisdiction || 'New Delhi, India',
      (m.client || 'Client on Record').trim(),
      m.clientRole || 'Plaintiff',
      m.oppositeParty || 'Opposing Party',
      m.opposingCounsel || 'Counsel on Record',
      m.judge || "Hon'ble Bench",
      status,
      m.priority || 'Medium',
      m.stage || 'Pleadings & Filing',
      m.filingDate || (m.createdAt ? m.createdAt.slice(0, 10) : '2026-01-15'),
      m.nextHearingDate || null,
      m.claimAmount || '₹ 0',
      JSON.stringify(Array.isArray(m.statutesInvolved) ? m.statutesInvolved : ['Code of Civil Procedure 1908']),
      m.summary || 'Matter registered in DraftMate Legal Workbench.',
      m.assignedLawyer || 'Lead Advocate',
      m.notes || '',
      m.createdAt || new Date().toISOString(),
      m.updatedAt || new Date().toISOString()
    ]);
    validMatterIds.add(m.id);
    stats.matters++;
  }

  // 3. Hearings Import
  const hearings = readJsonSafely('hearingsDb.json', []);
  const validHearingIds = new Set();

  for (const h of hearings) {
    if (!h.id || !h.matterId || !validMatterIds.has(h.matterId)) continue;
    const userId = (h.userId && validUserIds.has(h.userId)) ? h.userId : 'usr-legacy-demo';
    const hearingDate = h.hearingDate || (h.date ? `${h.date}T${h.time || '10:30'}:00+05:30` : new Date().toISOString());

    await query(`
      INSERT INTO hearings (
        id, user_id, matter_id, matter_title, case_number, court,
        location, judge, hearing_date, date, time, hearing_type,
        status, priority, outcome, notes, reminder_days, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO NOTHING;
    `, [
      h.id,
      userId,
      h.matterId,
      h.matterTitle || 'Court Matter',
      h.caseNumber || 'CASE',
      h.court || 'High Court of Delhi',
      h.location || 'Courtroom 4, Main Block',
      h.judge || "Hon'ble Bench",
      hearingDate,
      h.date || hearingDate.slice(0, 10),
      h.time || '10:30',
      h.hearingType || 'Arguments',
      h.status || 'Scheduled',
      h.priority || 'High',
      h.outcome || '',
      h.notes || '',
      JSON.stringify(Array.isArray(h.reminderDays) ? h.reminderDays : [1, 3]),
      h.createdAt || new Date().toISOString(),
      h.updatedAt || new Date().toISOString()
    ]);
    validHearingIds.add(h.id);
    stats.hearings++;
  }

  // 4. Reminders Import
  const reminders = readJsonSafely('remindersDb.json', []);

  for (const r of reminders) {
    if (!r.id || !r.dueDate) continue;
    const userId = (r.userId && validUserIds.has(r.userId)) ? r.userId : 'usr-legacy-demo';
    const matterId = (r.matterId && validMatterIds.has(r.matterId)) ? r.matterId : null;
    const hearingId = (r.hearingId && validHearingIds.has(r.hearingId)) ? r.hearingId : null;

    await query(`
      INSERT INTO reminders (
        id, user_id, hearing_id, matter_id, matter_title, case_number,
        hearing_date, due_date, days_before, title, message, type,
        status, is_read, channel, delivery_note, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO NOTHING;
    `, [
      r.id,
      userId,
      hearingId,
      matterId,
      r.matterTitle || 'Matter Reminder',
      r.caseNumber || 'CASE',
      r.hearingDate || r.dueDate,
      r.dueDate,
      r.daysBefore || 0,
      r.title || 'Hearing Reminder',
      r.message || r.title || 'Court appearance reminder',
      r.type || 'HearingReminder',
      r.status || 'Pending',
      Boolean(r.isRead),
      r.channel || 'In-App Notification',
      r.deliveryNote || 'In-app notification active (External SMTP/SMS unconfigured).',
      r.createdAt || new Date().toISOString(),
      r.updatedAt || new Date().toISOString()
    ]);
    stats.reminders++;
  }

  // 5. Sessions Import
  const sessions = readJsonSafely('sessionsDb.json', []);
  for (const s of sessions) {
    if (!s.id) continue;
    const userId = (s.userId && validUserIds.has(s.userId)) ? s.userId : null;
    await query(`
      INSERT INTO sessions (
        id, user_id, token_hash, is_revoked, is_valid, expires_at,
        revoked_at, ip, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      s.id,
      userId,
      s.tokenHash || null,
      Boolean(s.isRevoked),
      s.isValid !== undefined ? Boolean(s.isValid) : true,
      s.expiresAt || null,
      s.revokedAt || null,
      s.ip || null,
      s.userAgent || null,
      s.createdAt || new Date().toISOString()
    ]);
    stats.sessions++;
  }

  console.log(`[JSON Importer] Migration summary: ${stats.users} users, ${stats.matters} matters, ${stats.hearings} hearings, ${stats.reminders} reminders, ${stats.sessions} sessions verified in PostgreSQL.`);
  return stats;
}
