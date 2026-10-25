// server/db/repositories/matterRepo.js
// Parameterized, strictly isolated PostgreSQL repository for legal matters

import { query } from '../pool.js';

function mapRowToMatter(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    matterNumber: row.matter_number,
    cnr: row.cnr,
    title: row.title,
    court: row.court,
    matterType: row.matter_type,
    jurisdiction: row.jurisdiction,
    client: row.client,
    clientRole: row.client_role,
    oppositeParty: row.opposite_party,
    opposingCounsel: row.opposing_counsel,
    judge: row.judge,
    status: row.status,
    priority: row.priority,
    stage: row.stage,
    filingDate: row.filing_date,
    nextHearingDate: row.next_hearing_date,
    claimAmount: row.claim_amount,
    statutesInvolved: typeof row.statutes_involved === 'string' ? JSON.parse(row.statutes_involved) : row.statutes_involved,
    summary: row.summary,
    assignedLawyer: row.assigned_lawyer,
    notes: row.notes,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export const matterRepo = {
  /**
   * Find all matters owned strictly by userId with optional search, status, court, priority, and sorting
   */
  async findByUserId(userId, { search, status, court, priority, sort } = {}) {
    let sql = 'SELECT * FROM matters WHERE user_id = $1';
    const params = [userId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const pIdx = params.length;
      sql += ` AND (
        LOWER(title) LIKE $${pIdx} OR 
        LOWER(matter_number) LIKE $${pIdx} OR 
        LOWER(cnr) LIKE $${pIdx} OR 
        LOWER(client) LIKE $${pIdx} OR 
        LOWER(opposite_party) LIKE $${pIdx} OR 
        LOWER(court) LIKE $${pIdx}
      )`;
    }

    if (status && status !== 'ALL') {
      if (status.toLowerCase() === 'closed') {
        sql += ` AND (LOWER(status) = 'closed' OR LOWER(status) = 'archived')`;
      } else {
        params.push(status);
        sql += ` AND LOWER(status) = LOWER($${params.length})`;
      }
    }

    if (court && court !== 'ALL') {
      params.push(`%${court.toLowerCase()}%`);
      sql += ` AND LOWER(court) LIKE $${params.length}`;
    }

    if (priority && priority !== 'ALL') {
      params.push(priority);
      sql += ` AND LOWER(priority) = LOWER($${params.length})`;
    }

    // Sorting
    if (sort === 'nextHearingDate_asc') {
      sql += ' ORDER BY next_hearing_date ASC NULLS LAST, updated_at DESC';
    } else if (sort === 'title_asc') {
      sql += ' ORDER BY title ASC';
    } else if (sort === 'filingDate_desc') {
      sql += ' ORDER BY filing_date DESC NULLS LAST, created_at DESC';
    } else {
      sql += ' ORDER BY updated_at DESC, created_at DESC';
    }

    const { rows } = await query(sql, params);
    return rows.map(mapRowToMatter);
  },

  /**
   * Find single matter strictly owned by user
   */
  async findById(id, userId) {
    const { rows } = await query(
      'SELECT * FROM matters WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return mapRowToMatter(rows[0]);
  },

  /**
   * Check for duplicate case number or CNR
   */
  async checkDuplicate(userId, caseNumber, cnr, excludeId = null) {
    if (!caseNumber && !cnr) {
      return { isDuplicate: false, existingMatter: null };
    }

    let sql = 'SELECT id, title, matter_number, cnr, court FROM matters WHERE user_id = $1 AND (';
    const params = [userId];
    const clauses = [];

    if (caseNumber) {
      params.push(caseNumber.trim().toLowerCase());
      clauses.push(`LOWER(matter_number) = $${params.length}`);
    }
    if (cnr) {
      params.push(cnr.trim().toLowerCase());
      clauses.push(`LOWER(cnr) = $${params.length}`);
    }

    sql += clauses.join(' OR ') + ')';

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }

    sql += ' LIMIT 1';

    const { rows } = await query(sql, params);
    if (rows.length > 0) {
      return {
        isDuplicate: true,
        existingMatter: {
          id: rows[0].id,
          title: rows[0].title,
          matterNumber: rows[0].matter_number,
          cnr: rows[0].cnr,
          court: rows[0].court
        }
      };
    }

    return { isDuplicate: false, existingMatter: null };
  },

  /**
   * Get KPI aggregate stats for user's matters and hearings
   */
  async getStats(userId) {
    const nowIso = new Date().toISOString().slice(0, 10);
    const in30DaysIso = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const mattersRes = await query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status IN ('Open', 'Pending', 'In Progress', 'Active') THEN 1 END)::int AS active,
        COUNT(CASE WHEN status IN ('Closed', 'Archived') THEN 1 END)::int AS closed,
        COUNT(CASE WHEN status = 'On Hold' THEN 1 END)::int AS on_hold
      FROM matters
      WHERE user_id = $1;
    `, [userId]);

    const hearingsRes = await query(`
      SELECT COUNT(*)::int AS upcoming_30d
      FROM hearings
      WHERE user_id = $1 
        AND status IN ('Scheduled', 'In Progress')
        AND (date >= $2 AND date <= $3);
    `, [userId, nowIso, in30DaysIso]);

    const remindersRes = await query(`
      SELECT COUNT(*)::int AS due_count
      FROM reminders
      WHERE user_id = $1 
        AND (status = 'Due' OR (status = 'Pending' AND due_date <= $2));
    `, [userId, new Date().toISOString()]);

    const m = mattersRes.rows[0] || {};
    return {
      totalMatters: m.total || 0,
      activeMatters: m.active || 0,
      upcomingHearings30Days: hearingsRes.rows[0]?.upcoming_30d || 0,
      closedMatters: m.closed || 0,
      onHoldMatters: m.on_hold || 0,
      dueReminders: remindersRes.rows[0]?.due_count || 0
    };
  },

  /**
   * Create new matter strictly owned by user
   */
  async create(data, userId) {
    const id = data.id || `mat-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const { rows } = await query(`
      INSERT INTO matters (
        id, user_id, matter_number, cnr, title, court, matter_type,
        jurisdiction, client, client_role, opposite_party, opposing_counsel,
        judge, status, priority, stage, filing_date, next_hearing_date,
        claim_amount, statutes_involved, summary, assigned_lawyer, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *;
    `, [
      id,
      userId,
      data.matterNumber || `CASE-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      data.cnr || `INDH01${Math.floor(10000000 + Math.random() * 90000000)}`,
      data.title.trim(),
      data.court || 'High Court of Delhi',
      data.matterType || 'Commercial Suit',
      data.jurisdiction || 'New Delhi, India',
      data.client.trim(),
      data.clientRole || 'Plaintiff',
      data.oppositeParty || 'Opposing Party',
      data.opposingCounsel || 'Counsel on Record',
      data.judge || "Hon'ble Presiding Bench",
      data.status || 'Open',
      data.priority || 'Medium',
      data.stage || 'Pleadings & Filing',
      data.filingDate || now.slice(0, 10),
      data.nextHearingDate || null,
      data.claimAmount || '₹ 0',
      JSON.stringify(Array.isArray(data.statutesInvolved) ? data.statutesInvolved : ['Code of Civil Procedure 1908']),
      data.summary || 'Matter registered in DraftMate Legal Workbench.',
      data.assignedLawyer || 'Lead Advocate',
      data.notes || '',
      now,
      now
    ]);

    return mapRowToMatter(rows[0]);
  },

  /**
   * Update matter strictly owned by user
   */
  async update(id, userId, updates) {
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    const fields = [];
    const params = [id, userId];

    const allowed = {
      title: 'title',
      matterNumber: 'matter_number',
      cnr: 'cnr',
      court: 'court',
      matterType: 'matter_type',
      jurisdiction: 'jurisdiction',
      client: 'client',
      clientRole: 'client_role',
      oppositeParty: 'opposite_party',
      opposingCounsel: 'opposing_counsel',
      judge: 'judge',
      status: 'status',
      priority: 'priority',
      stage: 'stage',
      filingDate: 'filing_date',
      nextHearingDate: 'next_hearing_date',
      claimAmount: 'claim_amount',
      statutesInvolved: 'statutes_involved',
      summary: 'summary',
      assignedLawyer: 'assigned_lawyer',
      notes: 'notes'
    };

    for (const [key, col] of Object.entries(allowed)) {
      if (updates[key] !== undefined) {
        let val = updates[key];
        if (key === 'statutesInvolved' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }

    params.push(new Date().toISOString());
    fields.push(`updated_at = $${params.length}`);

    if (fields.length === 1) { // only updated_at
      return existing;
    }

    const sql = `
      UPDATE matters 
      SET ${fields.join(', ')} 
      WHERE id = $1 AND user_id = $2 
      RETURNING *;
    `;

    const { rows } = await query(sql, params);
    return mapRowToMatter(rows[0]);
  },

  /**
   * Quick status transition
   */
  async updateStatus(id, userId, status) {
    const { rows } = await query(`
      UPDATE matters 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND user_id = $3 
      RETURNING *;
    `, [status, id, userId]);

    return mapRowToMatter(rows[0]);
  },

  /**
   * Delete matter strictly owned by user (cascades hearings & reminders)
   */
  async delete(id, userId) {
    const { rows } = await query(
      'DELETE FROM matters WHERE id = $1 AND user_id = $2 RETURNING *;',
      [id, userId]
    );
    return mapRowToMatter(rows[0]);
  }
};
