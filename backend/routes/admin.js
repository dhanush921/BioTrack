import express from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, authorize } from '../authMiddleware.js';

const router = express.Router();
const DATA_DIR = path.resolve('data');

// GET SYSTEM LOGS
router.get('/logs', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const logs = db.list('logs');
    // Sort logs by newest first
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
    res.json(sortedLogs);
  } catch (err) {
    next(err);
  }
});

// GET ALL USERS
router.get('/users', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const users = db.list('users').map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// CREATE USER (ADMIN ONLY)
router.post('/users', authenticate, authorize(['Administrator']), async (req, res, next) => {
  try {
    const { email, password, name, role, department } = req.body;

    if (!email || !password || !name || !role || !department) {
      return res.status(400).json({ error: 'Name, email, password, role, and department are required.' });
    }

    const existingUser = db.findOne('users', { email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = db.add('users', {
      email: email.toLowerCase(),
      name,
      role,
      department,
      password: hashedPassword,
      avatar: '',
      notifications: { calibration: true, warranty: true, breakdowns: true, tasks: true },
      themePreference: 'dark',
      approved: true
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Admin Create User',
      details: `Created new user account: ${name} (${email}) as ${role} in ${department}`
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

// UPDATE USER ROLE OR DEPT
router.put('/users/:id', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const { role, department, approved } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (department) updates.department = department;
    if (approved !== undefined) updates.approved = approved;

    const updatedUser = db.update('users', req.params.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = updatedUser;

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Admin Update User',
      details: `Modified credentials/roles for user ${updatedUser.name} (${updatedUser.id})`
    });

    res.json(userWithoutPassword);
  } catch (err) {
    next(err);
  }
});

// BACKUP DATABASE (DUMP ALL COLLECTIONS AS SINGLE JSON)
router.get('/backup', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const backupData = {};
    const collections = ['users', 'equipment', 'maintenance', 'breakdowns', 'calibration', 'inventory', 'logs'];

    collections.forEach(col => {
      const filePath = path.join(DATA_DIR, `${col}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          backupData[col] = JSON.parse(content);
        } catch (e) {
          backupData[col] = [];
        }
      } else {
        backupData[col] = [];
      }
    });

    res.setHeader('Content-disposition', `attachment; filename=biotrack_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.json(backupData);
  } catch (err) {
    next(err);
  }
});

// RESTORE DATABASE
router.post('/restore', authenticate, authorize(['Administrator']), (req, res, next) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    const collections = ['users', 'equipment', 'maintenance', 'breakdowns', 'calibration', 'inventory', 'logs'];
    let restoredCount = 0;

    collections.forEach(col => {
      if (Array.isArray(backupData[col])) {
        const filePath = path.join(DATA_DIR, `${col}.json`);
        fs.writeFileSync(filePath, JSON.stringify(backupData[col], null, 2), 'utf8');
        restoredCount++;
      }
    });

    db.add('logs', {
      userId: req.user.id,
      userName: req.user.name,
      action: 'Restore Database',
      details: `Restored ${restoredCount} database collections from admin panel backup upload`
    });

    res.json({ success: true, message: `Successfully restored ${restoredCount} collections.` });
  } catch (err) {
    next(err);
  }
});

// GET OPENAPI SPECIFICATION (API DOCS)
router.get('/docs', authenticate, (req, res, next) => {
  try {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'BioTrack API Documentation',
        version: '1.0.0',
        description: 'REST API endpoints for the Smart Biomedical Equipment Management System.'
      },
      servers: [
        { url: 'http://localhost:5000/api', description: 'Development Server' }
      ],
      paths: {
        '/auth/login': {
          post: {
            summary: 'Authenticate and retrieve session token',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': { description: 'Successful login' },
              '400': { description: 'Invalid email or password' }
            }
          }
        },
        '/equipment': {
          get: {
            summary: 'Retrieve clinical assets registry list',
            responses: {
              '200': { description: 'Success' }
            }
          },
          post: {
            summary: 'Register a new clinical device',
            security: [{ bearerAuth: [] }],
            responses: {
              '201': { description: 'Asset registered' }
            }
          }
        },
        '/maintenance': {
          get: {
            summary: 'List scheduled PM routines',
            responses: {
              '200': { description: 'Success' }
            }
          }
        },
        '/breakdowns': {
          get: {
            summary: 'List corrective breakdown tickets',
            responses: {
              '200': { description: 'Success' }
            }
          }
        },
        '/contracts': {
          get: {
            summary: 'List active and expiring AMC/CMC contracts',
            responses: {
              '200': { description: 'Success' }
            }
          }
        }
      }
    };
    res.json(spec);
  } catch (err) {
    next(err);
  }
});

export default router;
