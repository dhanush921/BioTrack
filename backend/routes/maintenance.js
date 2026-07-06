import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET ALL MAINTENANCE SCHEDULES
router.get('/', authenticate, (req, res, next) => {
  try {
    const schedules = db.list('maintenance');
    res.json(schedules);
  } catch (err) {
    next(err);
  }
});

// CREATE MAINTENANCE SCHEDULE
router.post('/', authenticate, authorize(['Administrator', 'Biomedical Engineer']), async (req, res, next) => {
  try {
    const { equipmentId, type, frequency, checklist, scheduledDate, assignedTechnician, notes } = req.body;

    if (!equipmentId || !scheduledDate || !assignedTechnician) {
      return res.status(400).json({ error: 'Equipment ID, Scheduled Date, and Assigned Technician are required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment asset not found' });
    }

    const newSchedule = await db.add('maintenance', {
      equipmentId,
      equipmentName: equipment.name,
      type: type || 'Preventive',
      frequency: frequency || 'Monthly',
      checklist: checklist || [],
      scheduledDate,
      assignedTechnician,
      status: 'Pending',
      notes: notes || '',
      serviceReportUrl: '',
      completedAt: ''
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Schedule PM',
      details: `Scheduled ${frequency} maintenance for ${equipment.name} on ${scheduledDate}`
    }).catch(err => console.error('[BioTrack] Failed to log maintenance schedule:', err.message));

    res.status(201).json(newSchedule);
  } catch (err) {
    next(err);
  }
});

// UPDATE MAINTENANCE TASK (CHECKLIST STATE, ASSIGNMENT, OR COMPLETE)
router.put('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), async (req, res, next) => {
  try {
    const { checklist, status, notes, serviceReportUrl, cost } = req.body;
    const task = db.get('maintenance', req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Maintenance task not found' });
    }

    const updates = {};
    if (checklist) updates.checklist = checklist;
    if (notes) updates.notes = notes;
    if (serviceReportUrl) updates.serviceReportUrl = serviceReportUrl;
    if (cost !== undefined) updates.cost = cost;

    if (status) {
      updates.status = status;
      if (status === 'Completed') {
        updates.completedAt = new Date().toISOString();
        
        // Also update associated equipment status to 'Active'
        await db.update('equipment', task.equipmentId, { status: 'Active' });
      } else if (status === 'In Progress') {
        // Update equipment to 'Under Maintenance'
        await db.update('equipment', task.equipmentId, { status: 'Under Maintenance' });
      }
    }

    const updatedTask = await db.update('maintenance', req.params.id, updates);

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Update PM',
      details: `Updated PM task ${task.id} status to ${status || task.status}`
    }).catch(err => console.error('[BioTrack] Failed to log PM update:', err.message));

    res.json(updatedTask);
  } catch (err) {
    next(err);
  }
});

export default router;
