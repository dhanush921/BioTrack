import express from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();

// GET ALL BREAKDOWN TICKETS
router.get('/', authenticate, (req, res, next) => {
  try {
    const tickets = db.list('breakdowns');
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// REPORT BREAKDOWN (TICKET CREATION)
router.post('/', authenticate, (req, res, next) => {
  try {
    const { equipmentId, problemDescription, priority } = req.body;

    if (!equipmentId || !problemDescription || !priority) {
      return res.status(400).json({ error: 'Equipment ID, Problem Description, and Priority are required.' });
    }

    const equipment = db.get('equipment', equipmentId);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment asset not found' });
    }

    // Create ticket
    const ticket = db.add('breakdowns', {
      equipmentId,
      equipmentName: equipment.name,
      reportedBy: req.user.name,
      department: equipment.department,
      problemDescription,
      priority,
      assignedEngineer: '',
      status: 'Pending',
      reportedAt: new Date().toISOString(),
      estimatedCompletion: '',
      actualCompletion: '',
      downtimeHours: 0,
      repairCost: 0,
      solution: ''
    });

    // Update equipment status to 'Out of Service' or 'Under Maintenance' depending on priority
    const newEquipStatus = (priority === 'Critical' || priority === 'High') ? 'Out of Service' : 'Under Maintenance';
    db.update('equipment', equipmentId, { status: newEquipStatus });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Report Breakdown',
      details: `Reported breakdown for ${equipment.name} (${equipmentId}) with priority ${priority}`
    });

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// UPDATE BREAKDOWN TICKET (ASSIGN, PROGRESS, CLOSE)
router.put('/:id', authenticate, authorize(['Administrator', 'Biomedical Engineer', 'Technician']), (req, res, next) => {
  try {
    const { assignedEngineer, status, estimatedCompletion, actualCompletion, repairCost, solution, downtimeHours } = req.body;
    const ticket = db.get('breakdowns', req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Breakdown ticket not found' });
    }

    const updates = {};
    if (assignedEngineer !== undefined) updates.assignedEngineer = assignedEngineer;
    if (status !== undefined) updates.status = status;
    if (estimatedCompletion !== undefined) updates.estimatedCompletion = estimatedCompletion;
    if (actualCompletion !== undefined) updates.actualCompletion = actualCompletion;
    if (repairCost !== undefined) updates.repairCost = Number(repairCost);
    if (solution !== undefined) updates.solution = solution;
    if (downtimeHours !== undefined) updates.downtimeHours = Number(downtimeHours);

    // Dynamic equipment status change logic based on ticket state
    if (status === 'Completed') {
      updates.actualCompletion = new Date().toISOString();
      // Calculate downtime hours dynamically if not supplied
      if (!downtimeHours) {
        const reportedDate = new Date(ticket.reportedAt);
        const resolvedDate = new Date();
        const diffMs = resolvedDate - reportedDate;
        updates.downtimeHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
      
      // Sync equipment back to 'Active' upon completing breakdown repair
      db.update('equipment', ticket.equipmentId, { status: 'Active' });
    } else if (status === 'In Progress') {
      // Sync equipment to 'Under Maintenance'
      db.update('equipment', ticket.equipmentId, { status: 'Under Maintenance' });
    }

    const updatedTicket = db.update('breakdowns', req.params.id, updates);

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Update Ticket',
      details: `Modified breakdown ticket ${ticket.id} status to ${status || ticket.status}`
    });

    res.json(updatedTicket);
  } catch (err) {
    next(err);
  }
});

export default router;
