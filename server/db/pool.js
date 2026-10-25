// server/db/pool.js
// Production-grade PostgreSQL connection pooling for Render and enterprise environments

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let activePool = null;

/**
 * Configure and obtain the PostgreSQL connection pool
 */
export function getPool() {
  if (activePool) {
    return activePool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  // Detect SSL requirement (Render, AWS, Heroku or explicit sslmode)
  const isSslRequired = process.env.NODE_ENV === 'production' || 
                        databaseUrl.includes('render.com') || 
                        databaseUrl.includes('amazonaws.com') ||
                        databaseUrl.includes('sslmode=require');

  activePool = new Pool({
    connectionString: databaseUrl,
    max: parseInt(process.env.PG_MAX_POOL || '20', 10), // Maximum pool connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Fail fast after 10s connection timeout
    ssl: isSslRequired ? { rejectUnauthorized: false } : false
  });

  activePool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error] Unexpected idle client error:', err.message);
  });

  return activePool;
}

/**
 * Allows injecting an alternate pool (e.g. in-memory pg-mem pool for automated tests)
 */
export function setPool(customPool) {
  activePool = customPool;
}

/**
 * Close active pool on graceful shutdown
 */
export async function closePool() {
  if (activePool) {
    await activePool.end();
    activePool = null;
  }
}

/**
 * Safe parameterized query executor with connection release guarantee
 */
export async function query(text, params = []) {
  const pool = getPool();
  if (!pool) {
    throw new Error('PostgreSQL pool is not configured. DATABASE_URL environment variable is missing.');
  }

  const start = Date.now();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] (${duration}ms):`, text, params);
    }
    return result;
  } finally {
    client.release();
  }
}

/**
 * Check if PostgreSQL is actively configured via environment
 */
export function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL) || Boolean(activePool);
}
