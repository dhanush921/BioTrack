import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET ALL CALIBRATIONS
router.get('/', authenticate, (req, res, next) => {
  try {
    const calibrations = db.list('calibration');
    res.json(calibrations);
  } catch (err) {
    next(err);
  }
});

// LOG CALIBRATION
router.post('/', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), (req, res, next) => {
  try {
    const { equipmentId, calibrationDate, nextDueDate, frequency, performedBy, certificateNumber, notes } = req.body;

    if (!equipmentId || !calibrationDate || !nextDueDate) {
      return res.status(400).json({ error: 'Equipment ID, Calibration Date, and Next Due Date are mandatory.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment asset not found' });
    }

    // Determine status
    const today = new Date();
    const dueDate = new Date(nextDueDate);
    let status = 'Active';
    if (dueDate < today) {
      status = 'Overdue';
    } else if (dueDate - today < 30 * 24 * 60 * 60 * 1000) {
      status = 'Due Soon';
    }

    // Create Calibration Entry
    const newCalibration = db.add('calibration', {
      equipmentId,
      equipmentName: equipment.name,
      calibrationDate,
      nextDueDate,
      frequency: frequency || '12 Months',
      performedBy: performedBy || req.user.name,
      certificateNumber: certificateNumber || `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
      status,
      notes: notes || ''
    });

    // Update equipment's calibration markers
    db.update('equipment', equipmentId, {
      lastCalibrationDate: calibrationDate,
      nextCalibrationDate: nextDueDate
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Log Calibration',
      details: `Logged calibration for ${equipment.name} (${equipmentId}). Next due on ${nextDueDate}`
    });

    res.status(201).json(newCalibration);
  } catch (err) {
    next(err);
  }
});

export default router;
