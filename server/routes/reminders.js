// server/routes/reminders.js
// Multi-user isolated court hearing and deadline reminders with PostgreSQL & JSON support

import express from 'express';
import { dataService } from '../db/index.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce strict authentication on all reminder endpoints
router.use(authenticateUser);

/**
 * GET /api/reminders
 * Retrieve all reminders owned by the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { status, dueOnly, matterId } = req.query;
    const reminders = await dataService.reminders.findByUserId(req.userId, { status, dueOnly, matterId });

    const unreadCount = reminders.filter(r => !r.isRead).length;
    const dueCount = reminders.filter(r => r.status === 'Due').length;

    res.json({
      success: true,
      count: reminders.length,
      unreadCount,
      dueCount,
      data: reminders,
      disclosure: 'In-app reminder notifications active. External SMTP/SMS services are unconfigured.'
    });
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/reminders/:id/read
 * Mark reminder as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const updated = await dataService.reminders.markRead(req.params.id, req.userId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error marking reminder read:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/reminders/:id/complete
 * Mark reminder as completed
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const updated = await dataService.reminders.complete(req.params.id, req.userId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error completing reminder:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/reminders/:id/dismiss
 * Dismiss reminder
 */
router.put('/:id/dismiss', async (req, res) => {
  try {
    const updated = await dataService.reminders.dismiss(req.params.id, req.userId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error dismissing reminder:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reminders
 * Create a custom deadline or hearing reminder
 */
router.post('/', async (req, res) => {
  try {
    const {
      matterId,
      hearingId,
      title,
      message,
      dueDate,
      type = 'TaskReminder'
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, error: 'Title and due date are required for reminders.' });
    }

    let matterTitle = 'General Legal Work';
    let caseNumber = 'N/A';
    if (matterId) {
      const matter = await dataService.matters.findById(matterId, req.userId);
      if (matter) {
        matterTitle = matter.title;
        caseNumber = matter.matterNumber || matter.cnr || 'CASE';
      }
    }

    const newReminder = await dataService.reminders.create({
      matterId: matterId || null,
      hearingId: hearingId || null,
      matterTitle,
      caseNumber,
      hearingDate: dueDate,
      dueDate,
      daysBefore: 0,
      title,
      message: message || title,
      type,
      isRead: false,
      channel: 'In-App Notification',
      deliveryNote: 'In-app notification active (External SMTP/SMS unconfigured).'
    }, req.userId);

    res.status(201).json({ success: true, data: newReminder });
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await dataService.reminders.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
    }
    res.json({ success: true, message: 'Reminder removed successfully.' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
