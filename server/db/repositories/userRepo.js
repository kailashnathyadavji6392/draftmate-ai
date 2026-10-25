// server/db/repositories/userRepo.js
// Parameterized PostgreSQL repository for user accounts

import { query } from '../pool.js';

function mapRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    barCouncilNumber: row.bar_council_number || '',
    chamberName: row.chamber_name || '',
    role: row.role || 'Advocate',
    jurisdiction: row.jurisdiction || 'Supreme Court & High Courts of India',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

export const userRepo = {
  async findById(id) {
    if (!id) return null;
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return mapRowToUser(rows[0]);
  },

  async findByEmail(email) {
    if (!email) return null;
    const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return mapRowToUser(rows[0]);
  },

  async create(user) {
    const id = user.id || `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const { rows } = await query(`
      INSERT INTO users (
        id, name, email, password_hash, bar_council_number,
        chamber_name, role, jurisdiction, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      id,
      user.name.trim(),
      user.email.trim().toLowerCase(),
      user.passwordHash,
      user.barCouncilNumber || '',
      user.chamberName || '',
      user.role || 'Advocate',
      user.jurisdiction || 'Supreme Court & High Courts of India',
      now,
      now
    ]);

    return mapRowToUser(rows[0]);
  },

  async update(id, updates) {
    const fields = [];
    const params = [id];

    if (updates.name) {
      params.push(updates.name.trim());
      fields.push(`name = $${params.length}`);
    }
    if (updates.chamberName !== undefined) {
      params.push(updates.chamberName.trim());
      fields.push(`chamber_name = $${params.length}`);
    }
    if (updates.barCouncilNumber !== undefined) {
      params.push(updates.barCouncilNumber.trim());
      fields.push(`bar_council_number = $${params.length}`);
    }
    if (updates.passwordHash) {
      params.push(updates.passwordHash);
      fields.push(`password_hash = $${params.length}`);
    }

    params.push(new Date().toISOString());
    fields.push(`updated_at = $${params.length}`);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING *;`;
    const { rows } = await query(sql, params);
    return mapRowToUser(rows[0]);
  }
};
