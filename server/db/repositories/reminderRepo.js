// server/db/repositories/reminderRepo.js
// Parameterized, strictly isolated PostgreSQL repository for court reminders

import { query } from '../pool.js';

function mapRowToReminder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    hearingId: row.hearing_id,
    matterId: row.matter_id,
    matterTitle: row.matter_title,
    caseNumber: row.case_number,
    hearingDate: row.hearing_date,
    dueDate: row.due_date,
    daysBefore: row.days_before,
    title: row.title,
    message: row.message,
    type: row.type,
    status: row.status,
    isRead: Boolean(row.is_read),
    channel: row.channel || 'In-App Notification',
    deliveryNote: row.delivery_note || 'In-app notification active (External SMTP/SMS unconfigured).',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export const reminderRepo = {
  /**
   * Find reminders owned strictly by user with dynamic due calculation
   */
  async findByUserId(userId, { matterId, status, dueOnly } = {}) {
    const nowIso = new Date().toISOString();

    // Auto-update overdue pending reminders to 'Due'
    await query(`
      UPDATE reminders 
      SET status = 'Due', updated_at = NOW() 
      WHERE user_id = $1 
        AND status = 'Pending' 
        AND due_date <= $2;
    `, [userId, nowIso]);

    let sql = 'SELECT * FROM reminders WHERE user_id = $1';
    const params = [userId];

    if (matterId) {
      params.push(matterId);
      sql += ` AND matter_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (dueOnly === 'true' || dueOnly === true) {
      sql += ` AND status = 'Due'`;
    }

    sql += ` ORDER BY CASE WHEN status = 'Due' THEN 0 ELSE 1 END, due_date ASC`;

    const { rows } = await query(sql, params);
    return rows.map(mapRowToReminder);
  },

  /**
   * Find single reminder strictly owned by user
   */
  async findById(id, userId) {
    const { rows } = await query(
      'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return mapRowToReminder(rows[0]);
  },

  /**
   * Create new reminder strictly owned by user
   */
  async create(data, userId) {
    const id = data.id || `rem-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const isDue = new Date(data.dueDate) <= new Date();

    const { rows } = await query(`
      INSERT INTO reminders (
        id, user_id, hearing_id, matter_id, matter_title, case_number,
        hearing_date, due_date, days_before, title, message, type,
        status, is_read, channel, delivery_note, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *;
    `, [
      id,
      userId,
      data.hearingId || null,
      data.matterId || null,
      data.matterTitle || 'Court Matter',
      data.caseNumber || 'CASE',
      data.hearingDate || data.dueDate,
      data.dueDate,
      data.daysBefore || 0,
      data.title,
      data.message || data.title,
      data.type || 'HearingReminder',
      data.status || (isDue ? 'Due' : 'Pending'),
      Boolean(data.isRead),
      data.channel || 'In-App Notification',
      data.deliveryNote || 'In-app notification active (External SMTP/SMS unconfigured).',
      now,
      now
    ]);

    return mapRowToReminder(rows[0]);
  },

  /**
   * Mark reminder as read
   */
  async markRead(id, userId) {
    const { rows } = await query(`
      UPDATE reminders 
      SET is_read = TRUE, updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `, [id, userId]);

    return mapRowToReminder(rows[0]);
  },

  /**
   * Mark reminder as completed
   */
  async complete(id, userId) {
    const { rows } = await query(`
      UPDATE reminders 
      SET status = 'Completed', is_read = TRUE, updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `, [id, userId]);

    return mapRowToReminder(rows[0]);
  },

  /**
   * Dismiss reminder
   */
  async dismiss(id, userId) {
    const { rows } = await query(`
      UPDATE reminders 
      SET status = 'Dismissed', is_read = TRUE, updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `, [id, userId]);

    return mapRowToReminder(rows[0]);
  },

  /**
   * Delete reminder
   */
  async delete(id, userId) {
    const { rows } = await query(
      'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING *;',
      [id, userId]
    );
    return mapRowToReminder(rows[0]);
  }
};
