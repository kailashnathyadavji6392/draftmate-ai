// server/db/repositories/hearingRepo.js
// Parameterized, strictly isolated PostgreSQL repository for court hearings

import { query } from '../pool.js';

function mapRowToHearing(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    matterId: row.matter_id,
    matterTitle: row.matter_title,
    caseNumber: row.case_number,
    court: row.court,
    location: row.location,
    judge: row.judge,
    hearingDate: row.hearing_date,
    date: row.date,
    time: row.time,
    hearingType: row.hearing_type,
    status: row.status,
    priority: row.priority,
    outcome: row.outcome || '',
    notes: row.notes || '',
    reminderDays: typeof row.reminder_days === 'string' ? JSON.parse(row.reminder_days) : row.reminder_days,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export const hearingRepo = {
  /**
   * Find all hearings owned strictly by user
   */
  async findByUserId(userId, { matterId, status, month, from, to } = {}) {
    let sql = 'SELECT * FROM hearings WHERE user_id = $1';
    const params = [userId];

    if (matterId) {
      params.push(matterId);
      sql += ` AND matter_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (month) {
      params.push(`${month}%`);
      sql += ` AND (date LIKE $${params.length} OR hearing_date LIKE $${params.length})`;
    }

    if (from) {
      params.push(from);
      sql += ` AND date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      sql += ` AND date <= $${params.length}`;
    }

    sql += ' ORDER BY date ASC, time ASC, hearing_date ASC';

    const { rows } = await query(sql, params);
    return rows.map(mapRowToHearing);
  },

  /**
   * Find single hearing strictly owned by user
   */
  async findById(id, userId) {
    const { rows } = await query(
      'SELECT * FROM hearings WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return mapRowToHearing(rows[0]);
  },

  /**
   * Schedule new court hearing
   */
  async create(data, userId) {
    const id = data.id || `hrg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const { rows } = await query(`
      INSERT INTO hearings (
        id, user_id, matter_id, matter_title, case_number, court,
        location, judge, hearing_date, date, time, hearing_type,
        status, priority, outcome, notes, reminder_days, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *;
    `, [
      id,
      userId,
      data.matterId,
      data.matterTitle || 'Court Matter',
      data.caseNumber || 'CASE',
      data.court || 'High Court of Delhi',
      data.location || 'Courtroom 4, Main Block',
      data.judge || "Hon'ble Presiding Bench",
      data.hearingDate,
      data.date,
      data.time || '10:30',
      data.hearingType || 'Arguments',
      data.status || 'Scheduled',
      data.priority || 'High',
      data.outcome || '',
      data.notes || '',
      JSON.stringify(Array.isArray(data.reminderDays) ? data.reminderDays : [1, 3]),
      now,
      now
    ]);

    // Resync matter next hearing date
    await this.syncMatterNextHearingDate(data.matterId, userId);

    return mapRowToHearing(rows[0]);
  },

  /**
   * Update or reschedule hearing
   */
  async update(id, userId, updates) {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const fields = [];
    const params = [id, userId];

    const allowed = {
      hearingType: 'hearing_type',
      court: 'court',
      location: 'location',
      judge: 'judge',
      hearingDate: 'hearing_date',
      date: 'date',
      time: 'time',
      status: 'status',
      priority: 'priority',
      outcome: 'outcome',
      notes: 'notes',
      reminderDays: 'reminder_days'
    };

    for (const [key, col] of Object.entries(allowed)) {
      if (updates[key] !== undefined) {
        let val = updates[key];
        if (key === 'reminderDays' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }

    params.push(new Date().toISOString());
    fields.push(`updated_at = $${params.length}`);

    const sql = `
      UPDATE hearings 
      SET ${fields.join(', ')} 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `;

    const { rows } = await query(sql, params);
    const updated = mapRowToHearing(rows[0]);

    // If date changed or status changed, sync matter's next hearing date
    await this.syncMatterNextHearingDate(existing.matterId, userId);

    return updated;
  },

  /**
   * Delete hearing strictly owned by user
   */
  async delete(id, userId) {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const { rows } = await query(
      'DELETE FROM hearings WHERE id = $1 AND user_id = $2 RETURNING *;',
      [id, userId]
    );

    // Resync matter next hearing date
    await this.syncMatterNextHearingDate(existing.matterId, userId);

    return mapRowToHearing(rows[0]);
  },

  /**
   * Sync next hearing date for a matter
   */
  async syncMatterNextHearingDate(matterId, userId) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const { rows } = await query(`
      SELECT date, hearing_date 
      FROM hearings 
      WHERE user_id = $1 
        AND matter_id = $2 
        AND status IN ('Scheduled', 'In Progress')
        AND date >= $3
      ORDER BY date ASC, time ASC 
      LIMIT 1;
    `, [userId, matterId, todayIso]);

    const nextDate = rows.length > 0 ? rows[0].date : null;
    await query(`
      UPDATE matters 
      SET next_hearing_date = $1, updated_at = NOW() 
      WHERE id = $2 AND user_id = $3;
    `, [nextDate, matterId, userId]);

    return nextDate;
  }
};
