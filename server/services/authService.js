// server/services/authService.js
// Authentication, password hashing, JWT session, server-side session revocation, and password-reset service

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'draftmate-secure-jwt-key-production-secret-984214';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

// Email validation regex (RFC 5322 standard compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const authService = {
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length > 254) return false;
    return EMAIL_REGEX.test(trimmed);
  },

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, reason: 'Password is required' };
    }
    if (password.length < 8) {
      return { valid: false, reason: 'Password must be at least 8 characters long' };
    }
    if (password.length > 128) {
      return { valid: false, reason: 'Password must not exceed 128 characters' };
    }
    if (!/[A-Za-z]/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one letter' };
    }
    if (!/\d/.test(password)) {
      return { valid: false, reason: 'Password must contain at least one number' };
    }
    return { valid: true };
  },

  async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  },

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  },

  generateToken(user, { ip = null, userAgent = null } = {}) {
    const sessionId = `sess-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'Advocate',
      sid: sessionId
    };

    // Track active server-side session in db.sessions
    try {
      db.sessions.insert({
        id: sessionId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        isValid: true,
        ip,
        userAgent
      });
    } catch (err) {
      console.warn('[AuthService] Could not persist session record:', err.message);
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  },

  /**
   * Validate whether a session or token is active and has not been revoked/logged out
   */
  isSessionValid(payload, rawToken = null) {
    if (!payload || !payload.sub) return false;

    // 1. Check token-level revocation blacklist
    if (rawToken) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const blacklisted = db.sessions.findOne(s => s.tokenHash === tokenHash && s.isRevoked);
      if (blacklisted) return false;
    }

    // 2. Check session-level status if session ID (sid) is present
    if (payload.sid) {
      const session = db.sessions.findById(payload.sid);
      if (!session) return false;
      if (!session.isValid) return false;
      if (session.expiresAt && session.expiresAt < new Date().toISOString()) return false;
    }

    return true;
  },

  /**
   * Revoke an active session and blacklist its token on the server
   */
  revokeSession(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return false;

    let payload = null;
    try {
      payload = jwt.verify(rawToken, JWT_SECRET, { ignoreExpiration: true });
    } catch (_) {
      try {
        payload = jwt.decode(rawToken);
      } catch (_) {}
    }

    // Invalidate session by session ID
    if (payload && payload.sid) {
      const existing = db.sessions.findById(payload.sid);
      if (existing) {
        db.sessions.update(payload.sid, {
          isValid: false,
          revokedAt: new Date().toISOString()
        });
      }
    }

    // Invalidate token hash in revoked tokens list
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const existingRevoked = db.sessions.findOne(s => s.tokenHash === tokenHash);
    if (!existingRevoked) {
      db.sessions.insert({
        id: `rev-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        userId: payload?.sub || null,
        tokenHash,
        isRevoked: true,
        isValid: false,
        revokedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
      });
    }

    return true;
  },

  /**
   * Revoke all active sessions for a user (e.g., password change or account compromise)
   */
  revokeAllUserSessions(userId) {
    if (!userId) return 0;
    const userSessions = db.sessions.findByUserId(userId, s => s.isValid);
    for (const s of userSessions) {
      db.sessions.update(s.id, {
        isValid: false,
        revokedAt: new Date().toISOString()
      });
    }
    return userSessions.length;
  },

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  },

  findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return db.users.findOne(u => u.email && u.email.toLowerCase() === normalized);
  },

  findUserById(id) {
    return db.users.findById(id);
  },

  async registerUser({ name, email, password, barCouncilNumber = '', chamberName = '' }, sessionMetadata = {}) {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new Error('Full legal name is required (minimum 2 characters)');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!this.validateEmail(normalizedEmail)) {
      throw new Error('Please enter a valid, reachable email address');
    }

    const passwordCheck = this.validatePassword(password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.reason);
    }

    const existingUser = this.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newUser = db.users.insert({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      barCouncilNumber: barCouncilNumber.trim(),
      chamberName: chamberName.trim(),
      role: 'Advocate',
      jurisdiction: 'Supreme Court & High Courts of India',
      createdAt: new Date().toISOString()
    });

    // Auto-seed an initial starter matter isolated strictly to this user
    try {
      db.matters.insert({
        id: `mat-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        userId: newUser.id,
        matterNumber: `CS(COMM)/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        cnr: `DLHC01${Math.floor(10000000 + Math.random() * 90000000)}`,
        title: `${name.trim().split(' ')[0]}'s Initial Legal Matter: Commercial Injunction & Recovery`,
        court: 'High Court of Delhi (Commercial Division)',
        matterType: 'Commercial Suit',
        jurisdiction: 'New Delhi, India',
        client: `${name.trim()} & Associates`,
        clientRole: 'Plaintiff',
        oppositeParty: 'Apex Logistics & Tech Solutions Pvt Ltd',
        opposingCounsel: 'Senior Advocate on Record',
        judge: 'Hon\'ble Commercial Division Bench',
        status: 'Active',
        priority: 'High',
        stage: 'Pleadings & Injunction Hearing',
        nextHearingDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        claimAmount: '₹ 45,00,000',
        statutesInvolved: [
          'Commercial Courts Act 2015',
          'Code of Civil Procedure 1908 (Order XXXIX)',
          'Bharatiya Sakshya Adhiniyam 2023 (Section 63)'
        ],
        summary: `Matter created for Advocate ${name.trim()}. Ready for document upload, evidence discovery, risk analysis, and drafting.`,
        documentsCount: 0,
        createdAt: new Date().toISOString()
      });
    } catch (seedErr) {
      console.warn('[AuthService] Could not auto-seed starter matter:', seedErr.message);
    }

    return this.sanitizeUser(newUser);
  },

  async loginUser({ email, password, ip = null, userAgent = null }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error('Email and password are required');
    }

    const user = this.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password credentials');
    }

    if (user.isLegacy) {
      throw new Error('This account is archived. Please register a personal advocate account.');
    }

    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password credentials');
    }

    // Update last login timestamp
    db.users.update(user.id, { lastLoginAt: new Date().toISOString() });

    const token = this.generateToken(user, { ip, userAgent });
    return {
      user: this.sanitizeUser(user),
      token
    };
  },

  createPasswordResetToken(email) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = this.findUserByEmail(normalizedEmail);
    if (!user) {
      return {
        success: true,
        userFound: false,
        message: 'If an account exists with this email, password reset instructions have been generated.'
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.resetTokens.deleteWhere(t => t.userId === user.id);

    db.resetTokens.insert({
      id: `rst-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null
    });

    const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    return {
      success: true,
      userFound: true,
      emailSent: emailConfigured,
      message: emailConfigured 
        ? 'Password reset email sent to your registered email address.' 
        : 'SMTP server is not configured in this environment. For development/demo verification, your secure reset token has been generated below.',
      resetToken: emailConfigured ? undefined : rawToken,
      expiresInMinutes: 60
    };
  },

  async resetPassword({ token, newPassword }) {
    if (!token || typeof token !== 'string') {
      throw new Error('Reset token is required');
    }

    const passwordCheck = this.validatePassword(newPassword);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.reason);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const nowIso = new Date().toISOString();

    const record = db.resetTokens.findOne(t => t.tokenHash === tokenHash && !t.usedAt && t.expiresAt > nowIso);
    if (!record) {
      throw new Error('Password reset token is invalid, expired, or has already been used');
    }

    const user = db.users.findById(record.userId);
    if (!user) {
      throw new Error('User account not found');
    }

    const newHash = await this.hashPassword(newPassword);
    db.users.update(user.id, {
      passwordHash: newHash,
      passwordChangedAt: new Date().toISOString()
    });

    // Mark token as consumed
    db.resetTokens.update(record.id, { usedAt: new Date().toISOString() });

    // Revoke all existing sessions for this user on password reset
    this.revokeAllUserSessions(user.id);

    return { success: true, message: 'Password has been successfully reset. Please log in with your new password.' };
  }
};
