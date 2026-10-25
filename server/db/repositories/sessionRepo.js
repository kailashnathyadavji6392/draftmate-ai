// server/db/repositories/sessionRepo.js
// Parameterized PostgreSQL repository for server-side sessions & token blacklisting

import { query } from '../pool.js';

function mapRowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    isRevoked: Boolean(row.is_revoked),
    isValid: Boolean(row.is_valid),
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    revokedAt: row.revoked_at instanceof Date ? row.revoked_at.toISOString() : row.revoked_at,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export const sessionRepo = {
  async create(session) {
    const { rows } = await query(`
      INSERT INTO sessions (
        id, user_id, token_hash, is_revoked, is_valid, expires_at, revoked_at, ip, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      session.id,
      session.userId || null,
      session.tokenHash || null,
      Boolean(session.isRevoked),
      session.isValid !== undefined ? Boolean(session.isValid) : true,
      session.expiresAt || null,
      session.revokedAt || null,
      session.ip || null,
      session.userAgent || null,
      session.createdAt || new Date().toISOString()
    ]);

    return mapRowToSession(rows[0]);
  },

  async findById(id) {
    if (!id) return null;
    const { rows } = await query('SELECT * FROM sessions WHERE id = $1', [id]);
    return mapRowToSession(rows[0]);
  },

  async findByTokenHash(tokenHash) {
    if (!tokenHash) return null;
    const { rows } = await query('SELECT * FROM sessions WHERE token_hash = $1', [tokenHash]);
    return mapRowToSession(rows[0]);
  },

  async revoke(id) {
    const { rows } = await query(`
      UPDATE sessions 
      SET is_valid = FALSE, is_revoked = TRUE, revoked_at = NOW() 
      WHERE id = $1 
      RETURNING *;
    `, [id]);
    return mapRowToSession(rows[0]);
  },

  async revokeAllUserSessions(userId) {
    const { rowCount } = await query(`
      UPDATE sessions 
      SET is_valid = FALSE, revoked_at = NOW() 
      WHERE user_id = $1 AND is_valid = TRUE;
    `, [userId]);
    return rowCount;
  }
};
