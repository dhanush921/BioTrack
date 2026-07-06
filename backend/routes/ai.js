import express from 'express';
import db from '../db.js';
import { aiEngine } from '../aiEngine.js';
import { authenticate } from '../authMiddleware.js';

const router = express.Router();

// PREDICT BREAKDOWN
router.post('/predict', authenticate, (req, res, next) => {
  try {
    const { equipmentId } = req.body;
    if (!equipmentId) {
      return res.status(400).json({ error: 'Equipment ID is required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const maintenanceLogs = db.findMany('maintenance', { equipmentId });
    const breakdownLogs = db.findMany('breakdowns', { equipmentId });

    const prediction = aiEngine.predictMaintenance(equipment, maintenanceLogs, breakdownLogs);
    res.json(prediction);
  } catch (err) {
    next(err);
  }
});

// SCHEDULE RECOMMENDATIONS
router.post('/schedule-recommend', authenticate, (req, res, next) => {
  try {
    const { equipmentId } = req.body;
    if (!equipmentId) {
      return res.status(400).json({ error: 'Equipment ID is required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const recommendation = aiEngine.recommendSchedule(equipment);
    res.json(recommendation);
  } catch (err) {
    next(err);
  }
});

// FAULT TROUBLESHOOTING & CAUSES
router.post('/troubleshoot', authenticate, (req, res, next) => {
  try {
    const { equipmentId, problemDescription } = req.body;
    if (!equipmentId || !problemDescription) {
      return res.status(400).json({ error: 'Equipment ID and Problem Description are required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const diagnosis = aiEngine.analyzeFault(equipment, problemDescription);
    res.json(diagnosis);
  } catch (err) {
    next(err);
  }
});

// Q&A CHAT INTERACTION
router.post('/chat', authenticate, (req, res, next) => {
  try {
    const { equipmentId, question } = req.body;
    if (!equipmentId || !question) {
      return res.status(400).json({ error: 'Equipment ID and Question are required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const chatResponse = aiEngine.answerQuestion(equipment, question);
    res.json(chatResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
