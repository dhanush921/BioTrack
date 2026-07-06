import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET ALL EQUIPMENT (WITH FILTERS & SEARCH)
router.get('/', authenticate, (req, res, next) => {
  try {
    let items = db.list('equipment');
    const { department, category, status, manufacturer, search, warranty, calibration } = req.query;
    const today = new Date();

    // 1. Search Query
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item => 
        (item.name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.serialNumber || '').toLowerCase().includes(q) ||
        (item.manufacturer || '').toLowerCase().includes(q) ||
        (item.modelNumber || '').toLowerCase().includes(q)
      );
    }

    // 2. Exact Filters
    if (department) items = items.filter(item => item.department === department);
    if (category) items = items.filter(item => item.category === category);
    if (status) items = items.filter(item => item.status === status);
    if (manufacturer) items = items.filter(item => item.manufacturer === manufacturer);

    // 3. Warranty Status Filter
    if (warranty) {
      if (warranty === 'Active') {
        items = items.filter(item => !item.warrantyExpiry || new Date(item.warrantyExpiry) >= today);
      } else if (warranty === 'Expired') {
        items = items.filter(item => item.warrantyExpiry && new Date(item.warrantyExpiry) < today);
      } else if (warranty === 'ExpiringSoon') {
        // Expiring in next 90 days
        const limitDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        items = items.filter(item => 
          item.warrantyExpiry && 
          new Date(item.warrantyExpiry) >= today && 
          new Date(item.warrantyExpiry) <= limitDate
        );
      }
    }

    // 4. Calibration Status Filter
    if (calibration) {
      if (calibration === 'Active') {
        items = items.filter(item => item.nextCalibrationDate && new Date(item.nextCalibrationDate) > today);
      } else if (calibration === 'Due') {
        const limitDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        items = items.filter(item => 
          item.nextCalibrationDate && 
          new Date(item.nextCalibrationDate) >= today && 
          new Date(item.nextCalibrationDate) <= limitDate
        );
      } else if (calibration === 'Overdue') {
        items = items.filter(item => item.nextCalibrationDate && new Date(item.nextCalibrationDate) < today);
      }
    }

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET EQUIPMENT DETAILS + HISTORY TIMELINE
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const item = db.get('equipment', req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Pull combined history
    const maintenance = db.findMany('maintenance', { equipmentId: item.id });
    const breakdowns = db.findMany('breakdowns', { equipmentId: item.id });
    const calibrations = db.findMany('calibration', { equipmentId: item.id });

    // Format historical entries into a unified chronological log
    const history = [
      ...maintenance.map(m => ({
        type: 'Maintenance',
        date: m.completedAt || m.scheduledDate,
        title: `${m.type} Maintenance - ${m.status}`,
        description: m.notes || `Scheduled ${m.frequency} PM check.`,
        cost: m.cost || 0,
        technician: m.assignedTechnician,
        status: m.status
      })),
      ...breakdowns.map(b => ({
        type: 'Breakdown',
        date: b.actualCompletion || b.reportedAt,
        title: `Breakdown Ticket - ${b.status} (${b.priority} Priority)`,
        description: b.solution || b.problemDescription,
        cost: b.repairCost || 0,
        technician: b.assignedEngineer,
        status: b.status
      })),
      ...calibrations.map(c => ({
        type: 'Calibration',
        date: c.calibrationDate,
        title: `Calibration - Performed`,
        description: `Certificate No: ${c.certificateNumber || 'N/A'}. Notes: ${c.notes || 'None'}`,
        cost: 0,
        technician: c.performedBy,
        status: 'Completed'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    res.json({
      ...item,
      history
    });
  } catch (err) {
    next(err);
  }
});

// CREATE NEW EQUIPMENT
router.post('/', authenticate, authorize(['Administrator', 'Biomedical Engineer']), async (req, res, next) => {
  try {
    const data = req.body;
    
    if (!data.name || !data.category || !data.manufacturer || !data.serialNumber) {
      return res.status(400).json({ error: 'Name, Category, Manufacturer, and Serial Number are mandatory fields.' });
    }

    // Auto-generate ID if not supplied
    const eqId = data.id || `EQ-${Math.floor(100 + Math.random() * 900)}`;
    
    // Auto-generate QR code link & Barcode if empty
    const qrCode = `biotrack://equipment/${eqId}`;
    const barcode = data.barcode || `BAR-${data.manufacturer.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEquipment = await db.set('equipment', eqId, {
      ...data,
      qrCode,
      barcode,
      status: data.status || 'Active'
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Register Equipment',
      details: `Created equipment asset ${newEquipment.name} (${newEquipment.id}) in ${newEquipment.department}`
    }).catch(err => console.error('[BioTrack] Failed to log equipment register:', err.message));

    res.status(201).json(newEquipment);
  } catch (err) {
    next(err);
  }
});

// UPDATE EQUIPMENT
router.put('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), async (req, res, next) => {
  try {
    const updated = await db.update('equipment', req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Update Equipment',
      details: `Modified fields on equipment asset ${updated.name} (${updated.id})`
    }).catch(err => console.error('[BioTrack] Failed to log equipment update:', err.message));

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE/ARCHIVE EQUIPMENT
router.delete('/:id', authenticate, authorize(['Administrator']), async (req, res, next) => {
  try {
    const item = db.get('equipment', req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    
    await db.delete('equipment', req.params.id);

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Archive Equipment',
      details: `Archived/Deleted equipment asset ${item.name} (${item.id})`
    }).catch(err => console.error('[BioTrack] Failed to log equipment archive:', err.message));

    res.json({ success: true, message: `Equipment ${req.params.id} has been archived successfully.` });
  } catch (err) {
    next(err);
  }
});

export default router;
