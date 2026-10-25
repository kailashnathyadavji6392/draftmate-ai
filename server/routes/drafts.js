// server/routes/drafts.js
// User-isolated legal drafts repository

import express from 'express';
import { db } from '../data/db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all draft endpoints
router.use(authenticateUser);

/**
 * GET /api/drafts
 * Retrieve all drafts owned by authenticated user, optional ?matterId=...
 */
router.get('/', (req, res) => {
  const { matterId } = req.query;
  const userDrafts = db.drafts.findByUserId(req.userId, d => !matterId || d.matterId === matterId);
  res.json({ success: true, count: userDrafts.length, data: userDrafts });
});

/**
 * GET /api/drafts/:id
 * Retrieve single draft by ID owned by authenticated user
 */
router.get('/:id', (req, res) => {
  const draft = db.drafts.findById(req.params.id);
  if (!draft || draft.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Draft record not found or access denied' });
  }
  res.json({ success: true, data: draft });
});

/**
 * POST /api/drafts
 * Save / create new draft bound strictly to authenticated user
 */
router.post('/', (req, res) => {
  const {
    title,
    content,
    matterId = null,
    docType = 'Legal Notice',
    language = 'en',
    isAiPowered = false,
    provider = 'DraftMate Legal Engine',
    evidenceClaims = [],
    missingPlaceholders = [],
    disclaimer = 'DRAFT — Subject to Advocate Review and Verification.',
    status = 'Draft'
  } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: 'Draft content is required' });
  }

  const newDraft = db.drafts.insert({
    id: `draft-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: req.userId, // Strictly associate with authenticated user
    title: title || `${docType} - ${new Date().toLocaleDateString('en-IN')}`,
    content,
    matterId,
    docType,
    language,
    wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    isAiPowered,
    provider,
    evidenceClaims,
    missingPlaceholders,
    disclaimer,
    status,
    version: 1
  });

  res.status(201).json({ success: true, message: 'Draft saved to matter record.', data: newDraft });
});

/**
 * PUT /api/drafts/:id
 * Update existing draft owned by authenticated user
 */
router.put('/:id', (req, res) => {
  const draft = db.drafts.findById(req.params.id);
  if (!draft || draft.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Draft record not found or access denied' });
  }

  const { title, content, status, evidenceClaims, missingPlaceholders } = req.body;
  const updates = {};

  if (title !== undefined) updates.title = title;
  if (content !== undefined) {
    updates.content = content;
    updates.wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  }
  if (status !== undefined) updates.status = status;
  if (evidenceClaims !== undefined) updates.evidenceClaims = evidenceClaims;
  if (missingPlaceholders !== undefined) updates.missingPlaceholders = missingPlaceholders;
  updates.version = (draft.version || 1) + 1;

  const updated = db.drafts.update(draft.id, updates);
  res.json({ success: true, message: 'Draft updated successfully.', data: updated });
});

/**
 * DELETE /api/drafts/:id
 * Delete draft owned by authenticated user
 */
router.delete('/:id', (req, res) => {
  const draft = db.drafts.findById(req.params.id);
  if (!draft || draft.userId !== req.userId) {
    return res.status(404).json({ success: false, error: 'Draft record not found or access denied' });
  }

  db.drafts.delete(draft.id);
  res.json({ success: true, message: 'Draft deleted from matter repository.', data: draft });
});

export default router;
