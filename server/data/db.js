// server/data/db.js
// Production-grade persistent atomic database engine with user data isolation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = __dirname;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Atomic file write using temporary file and atomic rename with Windows fallback
function atomicWriteJson(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    try {
      fs.renameSync(tempPath, filePath);
    } catch (renameErr) {
      // Windows/OneDrive EPERM/EBUSY workaround
      fs.copyFileSync(tempPath, filePath);
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  } catch (err) {
    // If temp file failed, try direct write as final fallback
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    } catch (directErr) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      console.error(`[DB] Error writing to ${filePath}:`, directErr.message);
      throw directErr;
    }
  }
}

function readJsonSafely(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[DB] Error reading ${filePath}:`, err.message);
  }
  return defaultVal;
}

class Collection {
  constructor(name, filename) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, filename);
    this.items = [];
    this.indexes = {
      byId: new Map(),
      byUserId: new Map()
    };
    this.load();
  }

  load() {
    this.items = readJsonSafely(this.filePath, []);
    this.rebuildIndexes();
  }

  save() {
    atomicWriteJson(this.filePath, this.items);
  }

  rebuildIndexes() {
    this.indexes.byId.clear();
    this.indexes.byUserId.clear();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.id) {
        this.indexes.byId.set(item.id, item);
      }
      if (item.userId) {
        if (!this.indexes.byUserId.has(item.userId)) {
          this.indexes.byUserId.set(item.userId, []);
        }
        this.indexes.byUserId.get(item.userId).push(item);
      }
    }
  }

  findById(id) {
    if (!id) return null;
    return this.indexes.byId.get(id) || null;
  }

  findByUserId(userId, filterFn = null) {
    if (!userId) return [];
    const userItems = this.indexes.byUserId.get(userId) || [];
    if (filterFn) {
      return userItems.filter(filterFn);
    }
    return [...userItems];
  }

  findOne(queryFn) {
    return this.items.find(queryFn) || null;
  }

  find(queryFn = null) {
    if (!queryFn) return [...this.items];
    return this.items.filter(queryFn);
  }

  insert(record) {
    if (!record.id) {
      record.id = `${this.name.slice(0, 3)}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const now = new Date().toISOString();
    if (!record.createdAt) record.createdAt = now;
    record.updatedAt = now;

    this.items.unshift(record);
    this.rebuildIndexes();
    this.save();
    return record;
  }

  update(id, updates) {
    const item = this.findById(id);
    if (!item) return null;

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    this.rebuildIndexes();
    this.save();
    return item;
  }

  delete(id) {
    const idx = this.items.findIndex(item => item.id === id);
    if (idx === -1) return null;

    const [deleted] = this.items.splice(idx, 1);
    this.rebuildIndexes();
    this.save();
    return deleted;
  }

  deleteWhere(queryFn) {
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !queryFn(item));
    const deletedCount = initialLen - this.items.length;
    if (deletedCount > 0) {
      this.rebuildIndexes();
      this.save();
    }
    return deletedCount;
  }
}

// Database Singleton
export const db = {
  users: new Collection('users', 'usersDb.json'),
  sessions: new Collection('sessions', 'sessionsDb.json'),
  resetTokens: new Collection('resetTokens', 'resetTokensDb.json'),
  matters: new Collection('matters', 'mattersDb.json'),
  documents: new Collection('documents', 'documentsDb.json'),
  drafts: new Collection('drafts', 'draftsDb.json'),
  redlineHistory: new Collection('redlineHistory', 'redlineHistoryDb.json'),
  userSettings: new Collection('userSettings', 'userSettingsDb.json'),
  hearings: new Collection('hearings', 'hearingsDb.json'),
  reminders: new Collection('reminders', 'remindersDb.json'),

  // Run migration to attach existing orphan records to a legacy demo user
  runMigrations() {
    const LEGACY_USER_ID = 'usr-legacy-demo';

    // 1. Ensure a legacy demo user exists if there are legacy records
    let legacyUser = this.users.findById(LEGACY_USER_ID);
    let legacyRecordsExist = false;

    // Check if matters lack userId
    let mattersMigrated = 0;
    for (const m of this.matters.items) {
      if (!m.userId) {
        m.userId = LEGACY_USER_ID;
        mattersMigrated++;
        legacyRecordsExist = true;
      }
    }
    if (mattersMigrated > 0) {
      this.matters.rebuildIndexes();
      this.matters.save();
      console.log(`[DB Migration] Migrated ${mattersMigrated} legacy matters to ${LEGACY_USER_ID}`);
    }

    // Check if documents lack userId
    let docsMigrated = 0;
    for (const d of this.documents.items) {
      if (!d.userId) {
        d.userId = LEGACY_USER_ID;
        docsMigrated++;
        legacyRecordsExist = true;
      }
    }
    if (docsMigrated > 0) {
      this.documents.rebuildIndexes();
      this.documents.save();
      console.log(`[DB Migration] Migrated ${docsMigrated} legacy documents to ${LEGACY_USER_ID}`);
    }

    // Check drafts
    let draftsMigrated = 0;
    for (const dr of this.drafts.items) {
      if (!dr.userId) {
        dr.userId = LEGACY_USER_ID;
        draftsMigrated++;
        legacyRecordsExist = true;
      }
    }
    if (draftsMigrated > 0) {
      this.drafts.rebuildIndexes();
      this.drafts.save();
    }

    // Check redline history
    let redlinesMigrated = 0;
    for (const r of this.redlineHistory.items) {
      if (!r.userId) {
        r.userId = LEGACY_USER_ID;
        redlinesMigrated++;
        legacyRecordsExist = true;
      }
    }
    if (redlinesMigrated > 0) {
      this.redlineHistory.rebuildIndexes();
      this.redlineHistory.save();
    }

    // If legacy records exist, create a safe legacy user entry if not already present
    if (legacyRecordsExist && !legacyUser) {
      legacyUser = this.users.insert({
        id: LEGACY_USER_ID,
        name: 'Legacy Demo Advocate',
        email: 'legacy.demo@draftmate.internal',
        passwordHash: '$2a$12$e.x..legacy.demo.unusable.hash.cannot.login.directly..',
        role: 'Legacy Archive',
        isLegacy: true,
        createdAt: new Date('2026-01-01').toISOString()
      });
      console.log(`[DB Migration] Initialized archive record for legacy records.`);
    }

    // Normalize matter statuses and ensure fields exist
    let mattersUpdated = 0;
    for (const m of this.matters.items) {
      let changed = false;
      if (!m.status || m.status === 'In Progress' || m.status === 'Active') {
        m.status = 'Open';
        changed = true;
      }
      if (!m.filingDate) {
        m.filingDate = m.createdAt ? m.createdAt.slice(0, 10) : '2026-01-15';
        changed = true;
      }
      if (!m.priority) {
        m.priority = 'Medium';
        changed = true;
      }
      if (changed) mattersUpdated++;
    }
    if (mattersUpdated > 0) {
      this.matters.rebuildIndexes();
      this.matters.save();
    }

    // Seed hearings for matters that have nextHearingDate if not yet scheduled
    for (const m of this.matters.items) {
      if (m.nextHearingDate && m.userId) {
        const existingHrg = this.hearings.findOne(h => h.matterId === m.id);
        if (!existingHrg) {
          const hrgId = `hrg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          const hearingTime = '10:30';
          const hearingDateTime = `${m.nextHearingDate}T${hearingTime}:00+05:30`;
          
          this.hearings.insert({
            id: hrgId,
            userId: m.userId,
            matterId: m.id,
            matterTitle: m.title,
            caseNumber: m.matterNumber || m.cnr || 'CASE-2026',
            court: m.court || 'High Court of Delhi',
            location: 'Courtroom 4, Main Block',
            judge: m.judge || "Hon'ble Presiding Bench",
            hearingDate: hearingDateTime,
            date: m.nextHearingDate,
            time: hearingTime,
            hearingType: 'Arguments',
            status: 'Scheduled',
            priority: m.priority || 'High',
            outcome: '',
            notes: `Hearing for ${m.title}. Verify Order XXXIX pleadings and Section 63 BSA certificate.`,
            reminderDays: [1, 3, 7],
            createdAt: m.createdAt || new Date().toISOString()
          });

          // Seed default reminders
          [1, 3].forEach(days => {
            const dueDate = new Date(new Date(hearingDateTime).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
            this.reminders.insert({
              id: `rem-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
              userId: m.userId,
              hearingId: hrgId,
              matterId: m.id,
              matterTitle: m.title,
              caseNumber: m.matterNumber || m.cnr || 'CASE-2026',
              hearingDate: hearingDateTime,
              dueDate: dueDate,
              daysBefore: days,
              title: `${days}-Day Reminder: Arguments in ${m.title}`,
              message: `Upcoming hearing in ${days} day(s) at ${m.court} (Courtroom 4). Check paper book and case citations.`,
              type: 'HearingReminder',
              status: new Date(dueDate) <= new Date() ? 'Due' : 'Pending',
              isRead: false,
              channel: 'In-App Notification',
              deliveryNote: 'In-app reminder scheduled (External SMTP/SMS unconfigured).',
              createdAt: new Date().toISOString()
            });
          });
        }
      }
    }

    // Clean up expired sessions and reset tokens
    const nowIso = new Date().toISOString();
    const expiredTokens = this.resetTokens.deleteWhere(t => t.expiresAt < nowIso || t.usedAt);
    if (expiredTokens > 0) {
      console.log(`[DB Cleanup] Removed ${expiredTokens} expired/used password reset tokens.`);
    }

    const expiredSessions = this.sessions.deleteWhere(s => s.expiresAt < nowIso);
    if (expiredSessions > 0) {
      console.log(`[DB Cleanup] Removed ${expiredSessions} expired user sessions.`);
    }
  }
};

// Run migrations on initial load
db.runMigrations();
