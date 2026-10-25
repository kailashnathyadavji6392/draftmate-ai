// server/routes/matters.js
// Multi-user isolated legal matters management route with PostgreSQL persistence & JSON fallback

import express from 'express';
import { dataService } from '../db/index.js';
import { db } from '../data/db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce authentication on all matter routes
router.use(authenticateUser);

/**
 * GET /api/matters/stats
 * Aggregate matter and hearing statistics for dashboard summary cards
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await dataService.matters.getStats(req.userId);
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching matter stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/matters/check-duplicate
 * Non-blocking duplicate case number / CNR warning check
 */
router.get('/check-duplicate', async (req, res) => {
  try {
    const { caseNumber, cnr, excludeId } = req.query;
    const result = await dataService.matters.checkDuplicate(req.userId, caseNumber, cnr, excludeId);
    res.json({
      success: true,
      isDuplicate: result.isDuplicate,
      existingMatter: result.existingMatter
    });
  } catch (err) {
    console.error('Error checking duplicate case number:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/matters
 * Retrieve all matters owned by the authenticated user with optional filter & sort
 */
router.get('/', async (req, res) => {
  try {
    const { search, status, court, matterType, priority, sort } = req.query;
    const userMatters = await dataService.matters.findByUserId(req.userId, { search, status, court, matterType, priority, sort });

    // Dynamic document counts
    const userDocs = db.documents.findByUserId(req.userId);
    const docsCountByMatter = {};
    for (const d of userDocs) {
      if (d.matterId) {
        docsCountByMatter[d.matterId] = (docsCountByMatter[d.matterId] || 0) + 1;
      }
    }

    const userHearings = await dataService.hearings.findByUserId(req.userId);
    const hearingsCountByMatter = {};
    for (const h of userHearings) {
      if (h.matterId) {
        hearingsCountByMatter[h.matterId] = (hearingsCountByMatter[h.matterId] || 0) + 1;
      }
    }

    const enrichedMatters = userMatters.map(m => ({
      ...m,
      documentsCount: docsCountByMatter[m.id] !== undefined ? docsCountByMatter[m.id] : (m.documentsCount || 0),
      hearingsCount: hearingsCountByMatter[m.id] !== undefined ? hearingsCountByMatter[m.id] : 0
    }));

    res.json({
      success: true,
      count: enrichedMatters.length,
      data: enrichedMatters
    });
  } catch (err) {
    console.error('Error fetching matters:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/matters/:id/timeline
 * Chronological activity timeline for a matter workspace
 */
router.get('/:id/timeline', async (req, res) => {
  try {
    const matter = await dataService.matters.findById(req.params.id, req.userId);
    if (!matter) {
      return res.status(404).json({ success: false, error: 'Matter not found or access denied.' });
    }

    const timeline = [];

    // 1. Matter Creation Event
    timeline.push({
      id: `tl-create-${matter.id}`,
      type: 'MATTER_CREATED',
      title: 'Matter Docket Registered',
      description: `Registered matter "${matter.title}" in ${matter.court} with CNR ${matter.cnr || matter.matterNumber}.`,
      date: matter.createdAt,
      badge: 'Docket Initiation',
      actor: 'Advocate'
    });

    // 2. Document Upload Events
    const docs = db.documents.findByUserId(req.userId, d => d.matterId === matter.id);
    docs.forEach(d => {
      timeline.push({
        id: `tl-doc-${d.id}`,
        type: 'DOCUMENT_FILED',
        title: `Pleading Filed: ${d.title}`,
        description: `Uploaded ${d.documentType || 'document'} with ${d.extractedFacts?.length || 0} extracted facts.`,
        date: d.createdAt || matter.createdAt,
        badge: 'Document Dossier',
        actor: 'Legal Team'
      });
    });

    // 3. Draft Events
    const drafts = db.drafts.findByUserId(req.userId, dr => dr.matterId === matter.id);
    drafts.forEach(dr => {
      timeline.push({
        id: `tl-draft-${dr.id}`,
        type: 'AI_DRAFT_GENERATED',
        title: `AI Draft Prepared: ${dr.title || dr.documentType}`,
        description: `Drafted legal text (${dr.language || 'English'}) grounded in matter evidence.`,
        date: dr.createdAt || matter.createdAt,
        badge: 'Drafting Studio',
        actor: 'AI Assistant'
      });
    });

    // 4. Hearing Events
    const hearings = await dataService.hearings.findByUserId(req.userId, { matterId: matter.id });
    hearings.forEach(h => {
      timeline.push({
        id: `tl-hrg-${h.id}`,
        type: h.status === 'Completed' ? 'HEARING_COMPLETED' : 'HEARING_SCHEDULED',
        title: `Court Hearing: ${h.hearingType} (${h.status})`,
        description: `${h.court} - ${h.location}. Outcome/Notes: ${h.outcome || h.notes || 'Scheduled for argument.'}`,
        date: h.hearingDate || h.date,
        badge: h.status === 'Completed' ? 'Court Order' : 'Hearing Calendar',
        actor: h.judge || 'Bench'
      });
    });

    // Sort timeline chronologically descending (newest activity first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      matterId: matter.id,
      count: timeline.length,
      data: timeline
    });
  } catch (err) {
    console.error('Error fetching matter timeline:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/matters/:id
 * Retrieve a single matter with full workspace details
 */
router.get('/:id', async (req, res) => {
  try {
    const matter = await dataService.matters.findById(req.params.id, req.userId);
    if (!matter) {
      return res.status(404).json({ success: false, error: 'Matter not found or access denied.' });
    }

    const userDocs = db.documents.findByUserId(req.userId, d => d.matterId === matter.id);
    const userHearings = await dataService.hearings.findByUserId(req.userId, { matterId: matter.id });
    const userDrafts = db.drafts.findByUserId(req.userId, dr => dr.matterId === matter.id);
    const userReminders = await dataService.reminders.findByUserId(req.userId, { matterId: matter.id });

    res.json({
      success: true,
      data: {
        ...matter,
        documentsCount: userDocs.length,
        hearingsCount: userHearings.length,
        draftsCount: userDrafts.length,
        documents: userDocs.map(d => ({ id: d.id, title: d.title, documentType: d.documentType, createdAt: d.createdAt })),
        hearings: userHearings,
        reminders: userReminders,
        drafts: userDrafts.map(dr => ({ id: dr.id, title: dr.title, documentType: dr.documentType, updatedAt: dr.updatedAt }))
      }
    });
  } catch (err) {
    console.error('Error fetching matter details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/matters
 * Create a new matter strictly owned by the authenticated user
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      court,
      matterType,
      client,
      clientRole,
      oppositeParty,
      opposingCounsel,
      judge,
      priority,
      jurisdiction,
      filingDate,
      nextHearingDate,
      claimAmount,
      statutesInvolved,
      summary,
      stage,
      status = 'Open',
      assignedLawyer,
      notes
    } = req.body;

    if (!title || !client) {
      return res.status(400).json({ success: false, error: 'Matter Title and Client Name are required fields.' });
    }

    const cleanCaseNumber = (req.body.matterNumber || `CASE-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`).trim();
    const cleanCnr = (req.body.cnr || `INDH01${Math.floor(10000000 + Math.random() * 90000000)}`).trim();

    // Duplicate Check
    const dup = await dataService.matters.checkDuplicate(req.userId, cleanCaseNumber, cleanCnr);
    let duplicateWarning = null;
    if (dup.isDuplicate && dup.existingMatter) {
      duplicateWarning = `Warning: Case number "${cleanCaseNumber}" is already in use by matter "${dup.existingMatter.title}".`;
    }

    const newMatter = await dataService.matters.create({
      matterNumber: cleanCaseNumber,
      cnr: cleanCnr,
      title: title.trim(),
      court: court || 'High Court of Delhi',
      matterType: matterType || 'Commercial Suit',
      jurisdiction: jurisdiction || 'New Delhi, India',
      client: client.trim(),
      clientRole: clientRole || 'Petitioner / Plaintiff',
      oppositeParty: oppositeParty || 'Opposing Party',
      opposingCounsel: opposingCounsel || 'Counsel on Record',
      judge: judge || "Hon'ble Commercial Division Bench",
      status: ['Open', 'Pending', 'On Hold', 'Closed', 'Archived'].includes(status) ? status : 'Open',
      priority: priority || 'Medium',
      stage: stage || 'Pleadings & Filing',
      filingDate: filingDate || new Date().toISOString().slice(0, 10),
      nextHearingDate: nextHearingDate || null,
      claimAmount: claimAmount || '₹ 0',
      statutesInvolved: Array.isArray(statutesInvolved) ? statutesInvolved : ['Code of Civil Procedure 1908', 'Bharatiya Sakshya Adhiniyam 2023'],
      summary: summary || 'Matter registered in DraftMate Legal Workbench.',
      assignedLawyer: assignedLawyer || 'Lead Advocate',
      notes: notes || '',
      documentsCount: 0
    }, req.userId);

    // If nextHearingDate was provided, auto-create a scheduled hearing
    if (nextHearingDate) {
      const hearingTime = '10:30';
      const hearingDateTime = `${nextHearingDate}T${hearingTime}:00+05:30`;

      const newHearing = await dataService.hearings.create({
        matterId: newMatter.id,
        matterTitle: newMatter.title,
        caseNumber: newMatter.matterNumber,
        court: newMatter.court,
        location: 'Courtroom 4, Main Block',
        judge: newMatter.judge,
        hearingDate: hearingDateTime,
        date: nextHearingDate,
        time: hearingTime,
        hearingType: 'First Hearing / Notice',
        status: 'Scheduled',
        priority: newMatter.priority,
        outcome: '',
        notes: `Initial scheduled hearing for ${newMatter.title}.`,
        reminderDays: [1, 3]
      }, req.userId);

      // Schedule default in-app reminders
      for (const days of [1, 3]) {
        const dueDate = new Date(new Date(hearingDateTime).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
        await dataService.reminders.create({
          hearingId: newHearing.id,
          matterId: newMatter.id,
          matterTitle: newMatter.title,
          caseNumber: newMatter.matterNumber,
          hearingDate: hearingDateTime,
          dueDate,
          daysBefore: days,
          title: `${days}-Day Reminder: Initial Hearing in ${newMatter.title}`,
          message: `Court hearing scheduled on ${nextHearingDate} at ${newMatter.court}.`,
          type: 'HearingReminder',
          status: new Date(dueDate) <= new Date() ? 'Due' : 'Pending',
          isRead: false,
          channel: 'In-App Notification',
          deliveryNote: 'In-app reminder scheduled (External SMTP/SMS unconfigured).'
        }, req.userId);
      }
    }

    res.status(201).json({
      success: true,
      data: newMatter,
      duplicateWarning
    });
  } catch (err) {
    console.error('Error creating matter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/matters/:id
 * Update an existing matter owned by the authenticated user
 */
router.put('/:id', async (req, res) => {
  try {
    const { id, userId, createdAt, ...allowedUpdates } = req.body;
    if (allowedUpdates.title) allowedUpdates.title = allowedUpdates.title.trim();
    if (allowedUpdates.client) allowedUpdates.client = allowedUpdates.client.trim();

    const updated = await dataService.matters.update(req.params.id, req.userId, allowedUpdates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Matter not found or access denied.' });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating matter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/matters/:id/status
 * Fast status transition
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Open', 'Pending', 'On Hold', 'Closed', 'Archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await dataService.matters.updateStatus(req.params.id, req.userId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Matter not found or access denied.' });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating matter status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/matters/:id
 * Delete matter and cascade related records
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await dataService.matters.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Matter not found or access denied.' });
    }

    res.json({
      success: true,
      message: `Matter "${deleted.title}" and its associated dossier were deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting matter:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
