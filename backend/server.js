import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import db, { initSeedData } from './db.js';
import authRouter from './routes/auth.js';
import equipmentRouter from './routes/equipment.js';
import maintenanceRouter from './routes/maintenance.js';
import breakdownsRouter from './routes/breakdowns.js';
import calibrationRouter from './routes/calibration.js';
import inventoryRouter from './routes/inventory.js';
import aiRouter from './routes/ai.js';
import adminRouter from './routes/admin.js';
import contractsRouter from './routes/contracts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes (specifically for React Dev server at port 5173)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json());

// Initialize default data if not present
initSeedData().catch(err => console.error('[BioTrack] Database seed error:', err));

// Normalize path prefix for Vercel & Netlify
app.use((req, res, next) => {
  if (req.url) {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '/api');
    }
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/breakdowns', breakdownsRouter);
app.use('/api/calibration', calibrationRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contracts', contractsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'local-json-db'
  });
});

// Serve frontend static build files in production
let frontendDistPath = path.resolve('biotrack/frontend/dist');
if (!fs.existsSync(frontendDistPath)) {
  frontendDistPath = path.resolve('../frontend/dist');
}

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  console.log(`[BioTrack] Serving static production build from ${frontendDistPath}`);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[BioTrack Backend] Server running on port ${PORT}`);
  });
}
