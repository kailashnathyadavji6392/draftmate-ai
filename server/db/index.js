// server/db/index.js
// Unified Database Coordinator with PostgreSQL production engine and JSON fallback

import { getPool, isPostgresConfigured, setPool, closePool, query } from './pool.js';
import { runMigrations } from './migrations.js';
import { importJsonDataToPostgres } from './importer.js';
import { matterRepo } from './repositories/matterRepo.js';
import { hearingRepo } from './repositories/hearingRepo.js';
import { reminderRepo } from './repositories/reminderRepo.js';
import { userRepo } from './repositories/userRepo.js';
import { sessionRepo } from './repositories/sessionRepo.js';
import { db as jsonDb } from '../data/db.js';

let isInitialized = false;

/**
 * Initialize database: connect, run migrations, and import seed/JSON data
 */
export async function initDatabase() {
  if (isInitialized) return;

  if (isPostgresConfigured()) {
    console.log('[Database] PostgreSQL backend detected. Starting connection pool and migrations...');
    try {
      await runMigrations();
      await importJsonDataToPostgres();
      console.log('[Database] PostgreSQL initialized and ready for production operations.');
      isInitialized = true;
    } catch (err) {
      console.error('[Database] Failed to initialize PostgreSQL database:', err);
      throw err;
    }
  } else {
    console.log('[Database] DATABASE_URL not set. Operating in local JSON storage mode.');
    jsonDb.runMigrations();
    isInitialized = true;
  }
}

/**
 * Unified data services layer supporting both PostgreSQL and JSON fallback modes
 */
export const dataService = {
  isPostgres: () => isPostgresConfigured(),

  // Matters
  matters: {
    async findByUserId(userId, filters = {}) {
      if (isPostgresConfigured()) {
        return await matterRepo.findByUserId(userId, filters);
      }
      return jsonDb.matters.findByUserId(userId);
    },

    async findById(id, userId) {
      if (isPostgresConfigured()) {
        return await matterRepo.findById(id, userId);
      }
      const m = jsonDb.matters.findById(id);
      return (m && m.userId === userId) ? m : null;
    },

    async checkDuplicate(userId, caseNumber, cnr, excludeId) {
      if (isPostgresConfigured()) {
        return await matterRepo.checkDuplicate(userId, caseNumber, cnr, excludeId);
      }
      const existing = jsonDb.matters.findOne(m => {
        if (m.userId !== userId) return false;
        if (excludeId && m.id === excludeId) return false;
        const mNumber = (m.matterNumber || '').trim().toLowerCase();
        const mCnr = (m.cnr || '').trim().toLowerCase();
        if (caseNumber && mNumber === caseNumber.trim().toLowerCase()) return true;
        if (cnr && mCnr === cnr.trim().toLowerCase()) return true;
        return false;
      });
      return {
        isDuplicate: Boolean(existing),
        existingMatter: existing ? { id: existing.id, title: existing.title, matterNumber: existing.matterNumber, cnr: existing.cnr, court: existing.court } : null
      };
    },

    async getStats(userId) {
      if (isPostgresConfigured()) {
        return await matterRepo.getStats(userId);
      }
      const userMatters = jsonDb.matters.findByUserId(userId);
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const userHearings = jsonDb.hearings.findByUserId(userId);
      const upcomingHearings = userHearings.filter(h => {
        if (h.status !== 'Scheduled' && h.status !== 'In Progress') return false;
        const hDate = new Date(h.hearingDate || h.date);
        return hDate >= new Date(now.toISOString().slice(0, 10)) && hDate <= in30Days;
      }).length;
      const dueReminders = jsonDb.reminders.findByUserId(userId, r => r.status === 'Due' || (r.status === 'Pending' && new Date(r.dueDate) <= now)).length;

      return {
        totalMatters: userMatters.length,
        activeMatters: userMatters.filter(m => m.status === 'Open' || m.status === 'Pending').length,
        upcomingHearings30Days: upcomingHearings,
        closedMatters: userMatters.filter(m => m.status === 'Closed' || m.status === 'Archived').length,
        onHoldMatters: userMatters.filter(m => m.status === 'On Hold').length,
        dueReminders
      };
    },

    async create(data, userId) {
      if (isPostgresConfigured()) {
        return await matterRepo.create(data, userId);
      }
      return jsonDb.matters.insert({ ...data, userId });
    },

    async update(id, userId, updates) {
      if (isPostgresConfigured()) {
        return await matterRepo.update(id, userId, updates);
      }
      const existing = jsonDb.matters.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.matters.update(id, updates);
    },

    async updateStatus(id, userId, status) {
      if (isPostgresConfigured()) {
        return await matterRepo.updateStatus(id, userId, status);
      }
      const existing = jsonDb.matters.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.matters.update(id, { status });
    },

    async delete(id, userId) {
      if (isPostgresConfigured()) {
        return await matterRepo.delete(id, userId);
      }
      const existing = jsonDb.matters.findById(id);
      if (!existing || existing.userId !== userId) return null;
      jsonDb.matters.delete(id);
      jsonDb.hearings.deleteWhere(h => h.matterId === id && h.userId === userId);
      jsonDb.reminders.deleteWhere(r => r.matterId === id && r.userId === userId);
      jsonDb.documents.deleteWhere(d => d.matterId === id && d.userId === userId);
      return existing;
    }
  },

  // Hearings
  hearings: {
    async findByUserId(userId, filters = {}) {
      if (isPostgresConfigured()) {
        return await hearingRepo.findByUserId(userId, filters);
      }
      const hearings = jsonDb.hearings.findByUserId(userId, h => {
        if (filters.matterId && h.matterId !== filters.matterId) return false;
        if (filters.status && h.status !== filters.status) return false;
        if (filters.month) {
          const hDate = (h.date || h.hearingDate || '').slice(0, 7);
          if (hDate !== filters.month) return false;
        }
        if (filters.from && (h.date || '').slice(0, 10) < filters.from) return false;
        if (filters.to && (h.date || '').slice(0, 10) > filters.to) return false;
        return true;
      });
      hearings.sort((a, b) => new Date(a.hearingDate || a.date) - new Date(b.hearingDate || b.date));
      return hearings;
    },

    async findById(id, userId) {
      if (isPostgresConfigured()) {
        return await hearingRepo.findById(id, userId);
      }
      const h = jsonDb.hearings.findById(id);
      return (h && h.userId === userId) ? h : null;
    },

    async create(data, userId) {
      if (isPostgresConfigured()) {
        return await hearingRepo.create(data, userId);
      }
      return jsonDb.hearings.insert({ ...data, userId });
    },

    async update(id, userId, updates) {
      if (isPostgresConfigured()) {
        return await hearingRepo.update(id, userId, updates);
      }
      const existing = jsonDb.hearings.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.hearings.update(id, updates);
    },

    async delete(id, userId) {
      if (isPostgresConfigured()) {
        return await hearingRepo.delete(id, userId);
      }
      const existing = jsonDb.hearings.findById(id);
      if (!existing || existing.userId !== userId) return null;
      jsonDb.hearings.delete(id);
      jsonDb.reminders.deleteWhere(r => r.hearingId === id && r.userId === userId);
      return existing;
    }
  },

  // Reminders
  reminders: {
    async findByUserId(userId, filters = {}) {
      if (isPostgresConfigured()) {
        return await reminderRepo.findByUserId(userId, filters);
      }
      const now = new Date();
      const userReminders = jsonDb.reminders.findByUserId(userId, r => {
        if (filters.matterId && r.matterId !== filters.matterId) return false;
        if (filters.status && r.status !== filters.status) return false;
        return true;
      });
      userReminders.forEach(r => {
        if (r.status === 'Pending' && new Date(r.dueDate) <= now) {
          r.status = 'Due';
        }
      });
      let filtered = userReminders;
      if (filters.dueOnly === 'true' || filters.dueOnly === true) {
        filtered = userReminders.filter(r => r.status === 'Due');
      }
      filtered.sort((a, b) => {
        if (a.status === 'Due' && b.status !== 'Due') return -1;
        if (b.status === 'Due' && a.status !== 'Due') return 1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      return filtered;
    },

    async findById(id, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.findById(id, userId);
      }
      const r = jsonDb.reminders.findById(id);
      return (r && r.userId === userId) ? r : null;
    },

    async create(data, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.create(data, userId);
      }
      return jsonDb.reminders.insert({ ...data, userId });
    },

    async markRead(id, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.markRead(id, userId);
      }
      const existing = jsonDb.reminders.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.reminders.update(id, { isRead: true });
    },

    async complete(id, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.complete(id, userId);
      }
      const existing = jsonDb.reminders.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.reminders.update(id, { status: 'Completed', isRead: true });
    },

    async dismiss(id, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.dismiss(id, userId);
      }
      const existing = jsonDb.reminders.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.reminders.update(id, { status: 'Dismissed', isRead: true });
    },

    async delete(id, userId) {
      if (isPostgresConfigured()) {
        return await reminderRepo.delete(id, userId);
      }
      const existing = jsonDb.reminders.findById(id);
      if (!existing || existing.userId !== userId) return null;
      return jsonDb.reminders.delete(id);
    }
  },

  // Users & Sessions
  users: userRepo,
  sessions: sessionRepo
};

export {
  getPool,
  setPool,
  closePool,
  query,
  runMigrations,
  importJsonDataToPostgres,
  matterRepo,
  hearingRepo,
  reminderRepo,
  userRepo,
  sessionRepo
};
