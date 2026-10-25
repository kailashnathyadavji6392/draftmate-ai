// server/routes/hearings.js
// Multi-user isolated court hearing calendar routes with PostgreSQL persistence & JSON fallback

import express from 'express';
import { dataService } from '../db/index.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Enforce strict authentication on all hearing endpoints
router.use(authenticateUser);

/**
 * Format IST Date Time Helper
 */
function normalizeIstHearingDate(dateStr, timeStr = '10:30') {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    return dateStr;
  }
  const cleanDate = dateStr.trim();
  const cleanTime = (timeStr || '10:30').trim();
  return `${cleanDate}T${cleanTime.length === 5 ? cleanTime + ':00' : cleanTime}+05:30`;
}

/**
 * GET /api/hearings
 * Retrieve all hearings owned by authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { matterId, status, month, from, to } = req.query;
    const hearings = await dataService.hearings.findByUserId(req.userId, { matterId, status, month, from, to });

    res.json({
      success: true,
      count: hearings.length,
      data: hearings
    });
  } catch (err) {
    console.error('Error fetching hearings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hearings/:id
 * Retrieve a single hearing owned by authenticated user
 */
router.get('/:id', async (req, res) => {
  try {
    const hearing = await dataService.hearings.findById(req.params.id, req.userId);
    if (!hearing) {
      return res.status(404).json({ success: false, error: 'Hearing not found or access denied' });
    }

    const matter = await dataService.matters.findById(hearing.matterId, req.userId);
    const reminders = await dataService.reminders.findByUserId(req.userId, { matterId: hearing.matterId });
    const linkedReminders = reminders.filter(r => r.hearingId === hearing.id);

    res.json({
      success: true,
      data: {
        ...hearing,
        matter: matter ? { id: matter.id, title: matter.title, cnr: matter.cnr, court: matter.court } : null,
        reminders: linkedReminders
      }
    });
  } catch (err) {
    console.error('Error fetching hearing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/hearings
 * Schedule a new court hearing
 */
router.post('/', async (req, res) => {
  try {
    const {
      matterId,
      hearingType,
      date,
      time = '10:30',
      court,
      location,
      judge,
      priority = 'High',
      notes,
      reminderDays = [1, 3]
    } = req.body;

    if (!matterId) {
      return res.status(400).json({ success: false, error: 'Target matter is required to schedule a hearing.' });
    }
    if (!date) {
      return res.status(400).json({ success: false, error: 'Hearing date is required.' });
    }

    // Verify matter ownership
    const matter = await dataService.matters.findById(matterId, req.userId);
    if (!matter) {
      return res.status(404).json({ success: false, error: 'Associated matter not found or access denied.' });
    }

    const hearingDateTime = normalizeIstHearingDate(date, time);
    const dateOnly = date.includes('T') ? date.slice(0, 10) : date;
    const timeOnly = time || '10:30';

    const newHearing = await dataService.hearings.create({
      matterId: matter.id,
      matterTitle: matter.title,
      caseNumber: matter.matterNumber || matter.cnr || 'CASE-2026',
      court: court || matter.court || 'High Court of Delhi',
      location: location || 'Courtroom 4, Main Block',
      judge: judge || matter.judge || "Hon'ble Presiding Bench",
      hearingDate: hearingDateTime,
      date: dateOnly,
      time: timeOnly,
      hearingType: hearingType || 'Arguments',
      status: 'Scheduled',
      priority: priority || matter.priority || 'High',
      outcome: '',
      notes: notes || `Hearing for ${matter.title}. Review pleadings and compliance.`,
      reminderDays: Array.isArray(reminderDays) ? reminderDays : [1, 3]
    }, req.userId);

    // Generate automated reminders
    const daysArr = Array.isArray(reminderDays) ? reminderDays : [1, 3];
    const now = new Date();
    let createdRemindersCount = 0;

    for (const days of daysArr) {
      const hearingTimeMs = new Date(hearingDateTime).getTime();
      const dueDate = new Date(hearingTimeMs - Number(days) * 24 * 60 * 60 * 1000).toISOString();
      const isDue = new Date(dueDate) <= now;

      await dataService.reminders.create({
        hearingId: newHearing.id,
        matterId: matter.id,
        matterTitle: matter.title,
        caseNumber: matter.matterNumber || matter.cnr || 'CASE-2026',
        hearingDate: hearingDateTime,
        dueDate: dueDate,
        daysBefore: Number(days),
        title: `${days}-Day Reminder: ${newHearing.hearingType} in ${matter.title}`,
        message: `Upcoming ${newHearing.hearingType} hearing in ${days} day(s) at ${newHearing.court} (${newHearing.location}). Prepare briefing docket and authorities.`,
        type: 'HearingReminder',
        status: isDue ? 'Due' : 'Pending',
        isRead: false,
        channel: 'In-App Notification',
        deliveryNote: 'In-app notification active (External SMTP/SMS unconfigured).'
      }, req.userId);

      createdRemindersCount++;
    }

    res.status(201).json({
      success: true,
      data: newHearing,
      remindersScheduled: createdRemindersCount
    });
  } catch (err) {
    console.error('Error creating hearing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/hearings/:id
 * Update or reschedule an existing hearing
 */
router.put('/:id', async (req, res) => {
  try {
    const hearing = await dataService.hearings.findById(req.params.id, req.userId);
    if (!hearing) {
      return res.status(404).json({ success: false, error: 'Hearing not found or access denied.' });
    }

    const {
      hearingType,
      date,
      time,
      court,
      location,
      judge,
      status,
      priority,
      outcome,
      notes,
      reminderDays
    } = req.body;

    const updates = {};
    if (hearingType) updates.hearingType = hearingType;
    if (court) updates.court = court;
    if (location) updates.location = location;
    if (judge !== undefined) updates.judge = judge;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (outcome !== undefined) updates.outcome = outcome;
    if (notes !== undefined) updates.notes = notes;
    if (reminderDays) updates.reminderDays = reminderDays;

    if (date || time) {
      const finalDate = date || hearing.date;
      const finalTime = time || hearing.time;
      updates.date = finalDate.includes('T') ? finalDate.slice(0, 10) : finalDate;
      updates.time = finalTime;
      updates.hearingDate = normalizeIstHearingDate(updates.date, updates.time);
    }

    const updated = await dataService.hearings.update(hearing.id, req.userId, updates);

    // If status is Completed or Cancelled, dismiss pending reminders
    if (status === 'Completed' || status === 'Cancelled') {
      const userReminders = await dataService.reminders.findByUserId(req.userId, { matterId: hearing.matterId });
      for (const r of userReminders) {
        if (r.hearingId === hearing.id && r.status !== 'Completed') {
          if (status === 'Completed') {
            await dataService.reminders.complete(r.id, req.userId);
          } else {
            await dataService.reminders.dismiss(r.id, req.userId);
          }
        }
      }
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Error updating hearing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/hearings/:id
 * Delete a hearing and its linked reminders
 */
router.delete('/:id', async (req, res) => {
  try {
    const hearing = await dataService.hearings.findById(req.params.id, req.userId);
    if (!hearing) {
      return res.status(404).json({ success: false, error: 'Hearing not found or access denied.' });
    }

    await dataService.hearings.delete(hearing.id, req.userId);

    res.json({
      success: true,
      message: `Hearing on ${hearing.date || hearing.hearingDate} deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting hearing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
