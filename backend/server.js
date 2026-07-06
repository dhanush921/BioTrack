import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import db, { initSeedData } from './db.js';
import { db as firestoreDb } from './firebase.js';
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

let dbInitialized = false;
let dbInitializationPromise = null;

async function ensureDbInitialized() {
  if (dbInitialized) return;
  if (!dbInitializationPromise) {
    dbInitializationPromise = (async () => {
      try {
        await initSeedData();
        dbInitialized = true;
      } catch (err) {
        console.error('[BioTrack] DB Initialization failed:', err);
        dbInitializationPromise = null;
        throw err;
      }
    })();
  }
  await dbInitializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    next(err);
  }
});


// Normalize path prefix for Netlify only (Vercel routes correctly via vercel.json)
app.use((req, res, next) => {
  if (req.url) {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '/api');
    } else if (process.env.NETLIFY && !req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Helper to resolve ESM default exports in CommonJS bundled environments
const getRouter = (m) => m.default || m;

// Register routers
app.use('/api/auth', getRouter(authRouter));
app.use('/api/equipment', getRouter(equipmentRouter));
app.use('/api/maintenance', getRouter(maintenanceRouter));
app.use('/api/breakdowns', getRouter(breakdownsRouter));
app.use('/api/calibration', getRouter(calibrationRouter));
app.use('/api/inventory', getRouter(inventoryRouter));
app.use('/api/ai', getRouter(aiRouter));
app.use('/api/admin', getRouter(adminRouter));
app.use('/api/contracts', getRouter(contractsRouter));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'local-json-db',
    firestore: {
      projectId: firebaseProjectId || 'missing',
      apiKeyLength: firebaseApiKey ? firebaseApiKey.length : 0,
      isEnabled: !!firestoreDb
    }
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

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.NETLIFY) {
  app.listen(PORT, () => {
    console.log(`[BioTrack Backend] Server running on port ${PORT}`);
  });
}
