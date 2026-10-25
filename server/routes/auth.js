// server/routes/auth.js
// Authentication routes: Signup, Login, Logout, Current User (Me), Password Reset

import express from 'express';
import { authService } from '../services/authService.js';
import { authenticateUser, optionalAuth, getCookieOptions, clearAuthCookie, COOKIE_NAME } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { db } from '../data/db.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new advocate account and establish active server session
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password, barCouncilNumber, chamberName } = req.body;
    const clientMeta = {
      ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    const user = await authService.registerUser({
      name,
      email,
      password,
      barCouncilNumber,
      chamberName
    }, clientMeta);

    const token = authService.generateToken(user, clientMeta);

    // Set secure HttpOnly cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: `Advocate account created successfully. Welcome, ${user.name}!`,
      user,
      token
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to register account'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user, create server session, and issue cookie
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientMeta = {
      ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    const { user, token } = await authService.loginUser({
      email,
      password,
      ...clientMeta
    });

    // Set secure HttpOnly cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    res.json({
      success: true,
      message: `Welcome back, Advocate ${user.name}`,
      user,
      token
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message || 'Authentication failed'
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate server-side session, blacklist token, and clear authentication cookie
 */
router.post('/logout', optionalAuth, (req, res) => {
  try {
    let token = req.token;
    if (!token && req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // Invalidate server-side session and blacklist token
    if (token) {
      authService.revokeSession(token);
    }
    if (req.userId) {
      authService.revokeAllUserSessions(req.userId);
    }

    // Clear authentication cookie with multi-browser compatibility
    clearAuthCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully. Session invalidated on server.'
    });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({
      success: false,
      error: 'Logout failed: ' + err.message
    });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated user profile and private matter/document counts
 */
router.get('/me', authenticateUser, (req, res) => {
  const userMattersCount = db.matters.findByUserId(req.userId).length;
  const userDocsCount = db.documents.findByUserId(req.userId).length;
  const userDraftsCount = db.drafts.findByUserId(req.userId).length;

  res.json({
    success: true,
    user: req.user,
    stats: {
      mattersCount: userMattersCount,
      documentsCount: userDocsCount,
      draftsCount: userDraftsCount
    }
  });
});

/**
 * PUT /api/auth/profile
 * Update user details (name, bar council number, chamber)
 */
router.put('/profile', authenticateUser, (req, res) => {
  try {
    const { name, barCouncilNumber, chamberName, jurisdiction } = req.body;
    const updates = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.name = name.trim();
    }
    if (barCouncilNumber !== undefined) updates.barCouncilNumber = String(barCouncilNumber).trim();
    if (chamberName !== undefined) updates.chamberName = String(chamberName).trim();
    if (jurisdiction !== undefined) updates.jurisdiction = String(jurisdiction).trim();

    const updated = db.users.update(req.userId, updates);
    res.json({
      success: true,
      user: authService.sanitizeUser(updated)
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request single-use password reset token (with honest SMTP status)
 */
router.post('/forgot-password', passwordResetLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const result = authService.createPasswordResetToken(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Consumes single-use reset token and updates password
 */
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
