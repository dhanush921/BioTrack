import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET SPARE PARTS
router.get('/', authenticate, (req, res, next) => {
  try {
    const parts = db.list('inventory');
    res.json(parts);
  } catch (err) {
    next(err);
  }
});

// ADD SPARE PART
router.post('/', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), (req, res, next) => {
  try {
    const { name, partNumber, quantity, vendor, minimumStock, purchaseCost, location } = req.body;

    if (!name || !partNumber || quantity === undefined) {
      return res.status(400).json({ error: 'Part Name, Part Number, and Quantity are required.' });
    }

    const newPart = db.add('inventory', {
      name,
      partNumber,
      quantity: Number(quantity),
      vendor: vendor || 'Unknown Vendor',
      minimumStock: minimumStock !== undefined ? Number(minimumStock) : 1,
      purchaseCost: purchaseCost !== undefined ? Number(purchaseCost) : 0,
      location: location || ''
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Add Part',
      details: `Added new spare part: ${newPart.name} (${newPart.partNumber})`
    });

    res.status(201).json(newPart);
  } catch (err) {
    next(err);
  }
});

// UPDATE SPARE PART
router.put('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), (req, res, next) => {
  try {
    const { name, partNumber, quantity, vendor, minimumStock, purchaseCost, location } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (partNumber !== undefined) updates.partNumber = partNumber;
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (vendor !== undefined) updates.vendor = vendor;
    if (minimumStock !== undefined) updates.minimumStock = Number(minimumStock);
    if (purchaseCost !== undefined) updates.purchaseCost = Number(purchaseCost);
    if (location !== undefined) updates.location = location;

    const updatedPart = db.update('inventory', req.params.id, updates);
    if (!updatedPart) {
      return res.status(404).json({ error: 'Spare part not found' });
    }

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Update Part',
      details: `Updated details for spare part ${updatedPart.name} (${updatedPart.partNumber})`
    });

    res.json(updatedPart);
  } catch (err) {
    next(err);
  }
});

// DELETE SPARE PART
router.delete('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer']), (req, res, next) => {
  try {
    const part = db.get('inventory', req.params.id);
    if (!part) {
      return res.status(404).json({ error: 'Spare part not found' });
    }

    db.delete('inventory', req.params.id);

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Delete Part',
      details: `Removed spare part ${part.name} from inventory.`
    });

    res.json({ success: true, message: `Spare part ${req.params.id} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

export default router;
