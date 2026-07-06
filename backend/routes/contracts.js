import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET ALL CONTRACTS
router.get('/', authenticate, (req, res, next) => {
  try {
    const contracts = db.list('contracts');
    res.json(contracts);
  } catch (err) {
    next(err);
  }
});

// CREATE CONTRACT
router.post('/', authenticate, authorize(['Administrator', 'Biomedical Engineer']), (req, res, next) => {
  try {
    const { contractNumber, vendor, contractType, equipmentId, startDate, endDate, cost, slaResponseHours, notes } = req.body;

    if (!contractNumber || !vendor || !contractType || !equipmentId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Contract Number, Vendor, Type, Equipment, Start, and End dates are required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment asset not found' });
    }

    // Determine status based on dates
    const today = new Date();
    const expiry = new Date(endDate);
    let status = 'Active';
    if (expiry < today) {
      status = 'Expired';
    } else if (expiry - today < 30 * 24 * 60 * 60 * 1000) {
      status = 'Due Soon';
    }

    const newContract = db.add('contracts', {
      contractNumber,
      vendor,
      contractType,
      equipmentId,
      equipmentName: equipment.name,
      startDate,
      endDate,
      cost: Number(cost || 0),
      slaResponseHours: Number(slaResponseHours || 24),
      notes: notes || '',
      status
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Create Contract',
      details: `Added ${contractType} contract (${contractNumber}) for ${equipment.name} with ${vendor}`
    });

    res.status(201).json(newContract);
  } catch (err) {
    next(err);
  }
});

// UPDATE CONTRACT
router.put('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer']), (req, res, next) => {
  try {
    const updates = req.body;
    const updated = db.update('contracts', req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Update Contract',
      details: `Modified parameters on AMC/CMC contract ${updated.contractNumber}`
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE CONTRACT
router.delete('/:id', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const contract = db.get('contracts', req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    db.delete('contracts', req.params.id);

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Delete Contract',
      details: `Removed maintenance contract ${contract.contractNumber}`
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
