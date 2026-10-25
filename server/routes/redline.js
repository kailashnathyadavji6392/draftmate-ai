// server/routes/redline.js
// User-isolated smart redline comparison, version diffing, and audit history

import express from 'express';
import { redlineService } from '../services/redlineService.js';
import { documentService } from '../services/documentService.js';
import { db } from '../data/db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all redline operations
router.use(authenticateUser);

/**
 * POST /api/redline/compare
 * Compare original and revised documents or texts with user-isolated document access
 */
router.post('/compare', (req, res) => {
  try {
    const { originalText, revisedText, originalDocId, revisedDocId, options } = req.body;

    let orig = originalText || '';
    let rev = revisedText || '';

    if (originalDocId && !orig) {
      const doc = documentService.getById(originalDocId, req.userId);
      if (doc) orig = doc.content;
    }

    if (revisedDocId && !rev) {
      const doc = documentService.getById(revisedDocId, req.userId);
      if (doc) rev = doc.content;
    }

    if (!orig && !rev) {
      return res.status(400).json({ success: false, error: 'Original or revised text/document is required' });
    }

    const comparison = redlineService.compareTexts(orig, rev, options || {});

    res.json({
      success: true,
      data: comparison
    });
  } catch (err) {
    console.error('Redline comparison error:', err);
    res.status(500).json({ success: false, error: err.message || 'Comparison failed' });
  }
});

/**
 * POST /api/redline/apply-decisions
 * Apply user accept/reject decisions to generate resolved document text
 */
router.post('/apply-decisions', (req, res) => {
  try {
    const { originalText, revisedText, decisions } = req.body;

    if (!originalText && !revisedText) {
      return res.status(400).json({ success: false, error: 'Original and revised text are required' });
    }

    const result = redlineService.applyDecisions(originalText || '', revisedText || '', decisions || {});

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Apply decisions error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to apply decisions' });
  }
});

/**
 * GET /api/redline/history
 * Retrieve redline comparison sessions owned by the authenticated user
 */
router.get('/history', (req, res) => {
  const { matterId } = req.query;
  const userHistory = db.redlineHistory.findByUserId(req.userId, h => !matterId || h.matterId === matterId);
  res.json({ success: true, count: userHistory.length, data: userHistory });
});

/**
 * GET /api/redline/history/:id
 * Retrieve single redline session owned by authenticated user
 */
router.get('/history/:id', (req, res) => {
  const session = db.redlineHistory.findById(req.params.id);
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Redline comparison record not found or access denied' });
  }
  res.json({ success: true, data: session });
});

/**
 * POST /api/redline/save-session
 * Save redline comparison session bound to authenticated user
 */
router.post('/save-session', (req, res) => {
  const {
    title = 'Redline Comparison Session',
    matterId = null,
    originalText = '',
    revisedText = '',
    summary = {},
    changes = [],
    decisions = {},
    finalDocumentText = '',
    auditTrail = []
  } = req.body;

  const newSession = db.redlineHistory.insert({
    id: `redline-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: req.userId, // Strictly associate with authenticated user
    title,
    matterId,
    originalText,
    revisedText,
    summary,
    changes,
    decisions,
    finalDocumentText,
    auditTrail
  });

  res.status(201).json({ success: true, message: 'Redline session saved to matter history.', data: newSession });
});

/**
 * DELETE /api/redline/history/:id
 * Delete redline session owned by authenticated user
 */
router.delete('/history/:id', (req, res) => {
  const session = db.redlineHistory.findById(req.params.id);
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Redline comparison record not found or access denied' });
  }

  db.redlineHistory.delete(session.id);
  res.json({ success: true, message: 'Redline session removed from history.', data: session });
});

export default router;
