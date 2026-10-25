// server/middleware/auth.js
// Authentication middleware: validates JWT from HttpOnly cookie or Authorization header
// Enforces server-side session validity, token revocation checks, and strict Cache-Control

import { authService } from '../services/authService.js';

export const COOKIE_NAME = 'draftmate_token';

/**
 * Standard cookie options for setting the authentication session
 */
export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Set to true over HTTPS in production
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-site prod, 'lax' for local dev
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/'
  };
}

/**
 * Compatible cookie options for clearing the authentication session across all browsers
 */
export function getClearCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  };
}

/**
 * Helper to ensure the authentication cookie is completely removed from the client
 */
export function clearAuthCookie(res) {
  const clearOpts = getClearCookieOptions();
  res.clearCookie(COOKIE_NAME, clearOpts);
  res.cookie(COOKIE_NAME, '', {
    ...clearOpts,
    expires: new Date(0),
    maxAge: 0
  });
}

/**
 * Required authentication middleware: rejects unauthenticated or revoked requests with 401
 */
export function authenticateUser(req, res, next) {
  let token = null;

  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  // 2. Fallback to Authorization: Bearer <token> header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      error: 'Authentication required. Please log in to access this resource.'
    });
  }

  const payload = authService.verifyToken(token);
  if (!payload || !payload.sub) {
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED_OR_INVALID',
      error: 'Session expired or invalid credentials. Please log in again.'
    });
  }

  // Check if session has been invalidated/logged out on the server
  if (!authService.isSessionValid(payload, token)) {
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      code: 'SESSION_REVOKED',
      error: 'Session has been logged out or invalidated. Please log in again.'
    });
  }

  const user = authService.findUserById(payload.sub);
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      code: 'USER_NOT_FOUND',
      error: 'The account associated with this session no longer exists.'
    });
  }

  // Enforce strict no-store headers on all authenticated API responses to prevent bfcache leaks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  req.user = authService.sanitizeUser(user);
  req.userId = user.id;
  req.token = token;
  req.sessionId = payload.sid || null;
  next();
}

/**
 * Optional authentication middleware: attaches req.user if valid token present, but doesn't block
 */
export function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const payload = authService.verifyToken(token);
    if (payload && payload.sub && authService.isSessionValid(payload, token)) {
      const user = authService.findUserById(payload.sub);
      if (user) {
        req.user = authService.sanitizeUser(user);
        req.userId = user.id;
        req.token = token;
        req.sessionId = payload.sid || null;
      }
    }
  }
  next();
}
