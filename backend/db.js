import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db as firestoreDb } from './firebase.js';

const DATA_DIR = process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve('data');

// Local memory cache
const cache = {
  users: [],
  equipment: [],
  maintenance: [],
  breakdowns: [],
  contracts: [],
  inventory: [],
  logs: []
};

// Ensure local directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load a single collection from local JSON file
function readCollectionLocal(collection) {
  let filePath = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(path.resolve('data'), `${collection}.json`);
  }
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading local collection ${collection}:`, err);
    return [];
  }
}

// Write a single collection to local JSON file
function writeCollectionLocal(collection, data) {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing local collection ${collection}:`, err);
  }
}

// Initialize cache
export async function syncWithFirestore() {
  const collections = ['users', 'equipment', 'maintenance', 'breakdowns', 'contracts', 'inventory', 'logs'];
  
  if (firestoreDb) {
    console.log('[Firebase] Starting Firestore database sync...');
    for (const col of collections) {
      try {
        const snapshot = await firestoreDb.collection(col).get();
        if (snapshot.empty) {
          // If Firestore collection is empty, load from local file
          const localData = readCollectionLocal(col);
          cache[col] = localData;
          
          // Seed Firestore with local data
          if (localData.length > 0) {
            console.log(`[Firebase] Seeding Firestore collection "${col}" with ${localData.length} records...`);
            const batch = firestoreDb.batch();
            localData.forEach(doc => {
              const docRef = firestoreDb.collection(col).doc(doc.id);
              batch.set(docRef, doc);
            });
            await batch.commit();
          }
        } else {
          // Load Firestore documents into local cache
          const firestoreDocs = [];
          snapshot.forEach(doc => {
            firestoreDocs.push(doc.data());
          });
          cache[col] = firestoreDocs;
          
          // Sync back to local JSON for offline caching
          writeCollectionLocal(col, firestoreDocs);
        }
      } catch (err) {
        console.error(`[Firebase] Failed to sync collection "${col}":`, err.message);
        // Fallback to local files
        cache[col] = readCollectionLocal(col);
      }
    }
    console.log('[Firebase] Firestore database sync complete.');
  } else {
    console.log('[Firebase] Offline mode: loading local database files.');
    for (const col of collections) {
      cache[col] = readCollectionLocal(col);
    }
  }
}

// Background write updater
function persistDoc(collection, docId, data) {
  writeCollectionLocal(collection, cache[collection]);
  if (firestoreDb) {
    firestoreDb.collection(collection).doc(docId).set(data).catch(err => {
      console.error(`[Firebase] Failed to write document ${docId} to collection ${collection}:`, err.message);
    });
  }
}

function persistDeleteDoc(collection, docId) {
  writeCollectionLocal(collection, cache[collection]);
  if (firestoreDb) {
    firestoreDb.collection(collection).doc(docId).delete().catch(err => {
      console.error(`[Firebase] Failed to delete document ${docId} from collection ${collection}:`, err.message);
    });
  }
}

const db = {
  // Get all items in a collection
  list(collection) {
    return cache[collection] || [];
  },

  // Get item by ID
  get(collection, id) {
    const items = cache[collection] || [];
    return items.find(item => item.id === id) || null;
  },

  // Find one item by query (object match)
  findOne(collection, query = {}) {
    const items = cache[collection] || [];
    return items.find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  },

  // Find multiple items by query
  findMany(collection, query = {}) {
    const items = cache[collection] || [];
    return items.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  },

  // Add an item (generates ID)
  add(collection, data) {
    if (!cache[collection]) cache[collection] = [];
    const newItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    cache[collection].push(newItem);
    persistDoc(collection, newItem.id, newItem);
    return newItem;
  },

  // Set an item (requires explicit ID, overwrites or creates)
  set(collection, id, data) {
    if (!cache[collection]) cache[collection] = [];
    const items = cache[collection];
    const index = items.findIndex(item => item.id === id);
    const itemData = {
      id,
      updatedAt: new Date().toISOString(),
      ...data
    };
    if (index !== -1) {
      items[index] = { ...items[index], ...itemData };
    } else {
      itemData.createdAt = new Date().toISOString();
      items.push(itemData);
    }
    const resultDoc = items[index !== -1 ? index : items.length - 1];
    persistDoc(collection, id, resultDoc);
    return resultDoc;
  },

  // Update specific fields on an item
  update(collection, id, updates) {
    if (!cache[collection]) return null;
    const items = cache[collection];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const updatedItem = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    items[index] = updatedItem;
    persistDoc(collection, id, updatedItem);
    return updatedItem;
  },

  // Delete an item
  delete(collection, id) {
    if (!cache[collection]) return false;
    const items = cache[collection];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    items.splice(index, 1);
    persistDeleteDoc(collection, id);
    return true;
  }
};


// Initialize default/seed data if DB is empty
export async function initSeedData() {
  await syncWithFirestore();
  // 1. Users
  if (db.list('users').length === 0) {
    const passwordHash = bcrypt.hashSync('password123', 10);
    const adminPasswordHash = bcrypt.hashSync('dhanushking', 10);
    
    const defaultUsers = [
      {
        id: 'user-admin',
        email: 'chippadadhanush274@gmail.com',
        name: 'Dhanush',
        role: 'Administrator',
        password: adminPasswordHash,
        department: 'Biomedical Engineering',
        avatar: '',
        notifications: { calibration: true, warranty: true, breakdowns: true, tasks: true },
        themePreference: 'dark',
        approved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-engineer',
        email: 'engineer@biotrack.com',
        name: 'Marcus Chen',
        role: 'Biomedical Engineer',
        password: passwordHash,
        department: 'Biomedical Engineering',
        avatar: '',
        notifications: { calibration: true, warranty: true, breakdowns: true, tasks: true },
        themePreference: 'dark',
        approved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-tech',
        email: 'technician@biotrack.com',
        name: 'David Kojo',
        role: 'Technician',
        password: passwordHash,
        department: 'Biomedical Engineering',
        avatar: '',
        notifications: { calibration: true, warranty: false, breakdowns: true, tasks: true },
        themePreference: 'dark',
        approved: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-staff',
        email: 'staff@biotrack.com',
        name: 'Nurse Emily Rose',
        role: 'Department Staff',
        password: passwordHash,
        department: 'Cardiology',
        avatar: '',
        notifications: { calibration: false, warranty: false, breakdowns: true, tasks: false },
        themePreference: 'light',
        approved: true,
        createdAt: new Date().toISOString()
      }
    ];
    defaultUsers.forEach(u => db.set('users', u.id, u));
  }

  // Live migration to update old admin to chippadadhanush274@gmail.com
  try {
    const oldAdmin = db.list('users').find(u => u.email === 'admin@biotrack.com' || u.email === 'dhanushchippada274@gmail.com');
    if (oldAdmin) {
      db.update('users', oldAdmin.id, {
        email: 'chippadadhanush274@gmail.com',
        name: 'Dhanush',
        password: bcrypt.hashSync('dhanushking', 10),
        approved: true
      });
      console.log('[Migration] Updated administrator credentials successfully.');
    }
    // Also ensure all existing users have an approved flag
    const allUsers = db.list('users');
    allUsers.forEach(u => {
      if (u.approved === undefined) {
        db.update('users', u.id, { approved: true });
      }
    });
  } catch (e) {
    console.error('[Migration Error]', e);
  }

  // 2. Equipment
  if (db.list('equipment').length === 0) {
    const initialEquipment = [
      {
        id: 'EQ-001',
        name: 'Revolution CT Scanner',
        category: 'Imaging',
        manufacturer: 'GE HealthCare',
        modelNumber: 'REV-CT-256',
        serialNumber: 'GE-REV-77810',
        department: 'Radiology',
        location: 'Imaging Suite B',
        purchaseDate: '2024-03-12',
        installationDate: '2024-04-01',
        warrantyExpiry: '2027-04-01',
        vendorDetails: 'GE HealthCare Sales & Services (North)',
        equipmentCost: 1250000,
        status: 'Active',
        qrCode: 'biotrack://equipment/EQ-001',
        barcode: 'BAR-REVCT-001',
        image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400',
        manualUrl: '/manuals/ge_revolution_ct.pdf',
        calibrationCertificateUrl: '/certificates/cal_eq_001.pdf',
        assignedTechnician: 'Marcus Chen',
        lastCalibrationDate: '2026-02-15',
        nextCalibrationDate: '2026-08-15'
      },
      {
        id: 'EQ-002',
        name: 'Mac 5500 HD ECG System',
        category: 'Cardiovascular',
        manufacturer: 'GE HealthCare',
        modelNumber: 'MAC-5500',
        serialNumber: 'GE-MAC-33041',
        department: 'Cardiology',
        location: 'ECG Lab 1',
        purchaseDate: '2025-01-10',
        installationDate: '2025-01-15',
        warrantyExpiry: '2026-01-15', // Warranty expired!
        vendorDetails: 'BioMed Distributors Inc.',
        equipmentCost: 18500,
        status: 'Active',
        qrCode: 'biotrack://equipment/EQ-002',
        barcode: 'BAR-GEMAC-002',
        image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=400',
        manualUrl: '',
        calibrationCertificateUrl: '',
        assignedTechnician: 'David Kojo',
        lastCalibrationDate: '2026-01-05',
        nextCalibrationDate: '2026-07-05' // Calibration due today!
      },
      {
        id: 'EQ-003',
        name: 'Affinity 70 Ultrasound',
        category: 'Imaging',
        manufacturer: 'Philips',
        modelNumber: 'AFF-70-US',
        serialNumber: 'PH-AFF-88129',
        department: 'Obstetrics & Gynecology',
        location: 'Ultrasound Room 2',
        purchaseDate: '2023-08-20',
        installationDate: '2023-09-01',
        warrantyExpiry: '2026-09-01', // Warranty expiring soon
        vendorDetails: 'Philips Medical Solutions',
        equipmentCost: 85000,
        status: 'Under Maintenance',
        qrCode: 'biotrack://equipment/EQ-003',
        barcode: 'BAR-PHUS-003',
        image: 'https://images.unsplash.com/photo-1579684389782-64d84b5e905d?auto=format&fit=crop&q=80&w=400',
        manualUrl: '',
        calibrationCertificateUrl: '',
        assignedTechnician: 'Marcus Chen',
        lastCalibrationDate: '2025-11-20',
        nextCalibrationDate: '2026-05-20' // Overdue calibration!
      },
      {
        id: 'EQ-004',
        name: 'Evita V800 Ventilator',
        category: 'Respiratory',
        manufacturer: 'Dräger',
        modelNumber: 'EVITA-V800',
        serialNumber: 'DR-EV-20931',
        department: 'ICU',
        location: 'ICU Bed 4',
        purchaseDate: '2024-11-05',
        installationDate: '2024-11-10',
        warrantyExpiry: '2027-11-10',
        vendorDetails: 'Draeger Medical Inc.',
        equipmentCost: 45000,
        status: 'Active',
        qrCode: 'biotrack://equipment/EQ-004',
        barcode: 'BAR-DREV-004',
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
        manualUrl: '',
        calibrationCertificateUrl: '',
        assignedTechnician: 'David Kojo',
        lastCalibrationDate: '2026-04-10',
        nextCalibrationDate: '2026-10-10'
      },
      {
        id: 'EQ-005',
        name: 'Primus Anesthesia Workstation',
        category: 'Anesthesia',
        manufacturer: 'Dräger',
        modelNumber: 'PRIMUS-A',
        serialNumber: 'DR-PR-44012',
        department: 'OR',
        location: 'Operating Room 3',
        purchaseDate: '2022-05-15',
        installationDate: '2022-06-01',
        warrantyExpiry: '2025-06-01', // Expired
        vendorDetails: 'Draeger Medical Inc.',
        equipmentCost: 95000,
        status: 'Out of Service',
        qrCode: 'biotrack://equipment/EQ-005',
        barcode: 'BAR-DRPR-005',
        image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400',
        manualUrl: '',
        calibrationCertificateUrl: '',
        assignedTechnician: 'Marcus Chen',
        lastCalibrationDate: '2025-05-10',
        nextCalibrationDate: '2025-11-10' // Overdue calibration
      }
    ];
    initialEquipment.forEach(eq => db.set('equipment', eq.id, eq));
  }

  // 3. Maintenance Schedules
  if (db.list('maintenance').length === 0) {
    const initialMaintenance = [
      {
        id: 'MAIN-001',
        equipmentId: 'EQ-001',
        equipmentName: 'Revolution CT Scanner',
        type: 'Preventive',
        frequency: 'Quarterly',
        checklist: [
          { task: 'Inspect and clean slip ring assembly', done: false },
          { task: 'Check gantry rotation alignment & belt tension', done: false },
          { task: 'Verify tube temperature & cooling system flow rate', done: false },
          { task: 'Perform phantom calibration tests (CT number, noise)', done: false },
          { task: 'Verify emergency stop circuit operation', done: false }
        ],
        scheduledDate: '2026-07-15',
        assignedTechnician: 'Marcus Chen',
        status: 'Pending',
        notes: 'Regular quarterly checkup. Needs phantom kit B.',
        serviceReportUrl: '',
        completedAt: ''
      },
      {
        id: 'MAIN-002',
        equipmentId: 'EQ-004',
        equipmentName: 'Evita V800 Ventilator',
        type: 'Preventive',
        frequency: 'Monthly',
        checklist: [
          { task: 'Replace O2 sensor if cell usage is >80%', done: true },
          { task: 'Check and clean air-intake dust filters', done: true },
          { task: 'Perform leak and compliance self-tests', done: true },
          { task: 'Verify battery backup backup duration status', done: true }
        ],
        scheduledDate: '2026-07-02',
        assignedTechnician: 'David Kojo',
        status: 'Completed',
        notes: 'O2 cell tested at 91% capacity (good). Cleaned intake filter, compliance self-test passed.',
        serviceReportUrl: '/reports/sr_main_002.pdf',
        completedAt: '2026-07-02T10:30:00Z'
      },
      {
        id: 'MAIN-003',
        equipmentId: 'EQ-003',
        equipmentName: 'Affinity 70 Ultrasound',
        type: 'Preventive',
        frequency: 'Half-Yearly',
        checklist: [
          { task: 'Inspect ultrasound probe housings for cracks', done: true },
          { task: 'Clean internal air filters and cooling fans', done: false },
          { task: 'Verify keyboard, trackball, and monitor articulation', done: true },
          { task: 'Run diagnostic self-test and review system error logs', done: false }
        ],
        scheduledDate: '2026-07-04',
        assignedTechnician: 'Marcus Chen',
        status: 'In Progress',
        notes: 'Probes checked, no cracks. Keyboard trackball cleaned. Still need to clean internal filters and run system diagnostic tests.',
        serviceReportUrl: '',
        completedAt: ''
      }
    ];
    initialMaintenance.forEach(m => db.set('maintenance', m.id, m));
  }

  // 4. Corrective Maintenance (Breakdown Tickets)
  if (db.list('breakdowns').length === 0) {
    const initialBreakdowns = [
      {
        id: 'TKT-001',
        equipmentId: 'EQ-003',
        equipmentName: 'Affinity 70 Ultrasound',
        reportedBy: 'Nurse Emily Rose',
        department: 'Obstetrics & Gynecology',
        problemDescription: 'Linear probe L12-3 is producing shadow artifacts across the center of the screen during obstetric scans. Imaging is degraded.',
        priority: 'High',
        assignedEngineer: 'Marcus Chen',
        status: 'In Progress',
        reportedAt: '2026-07-04T08:15:00Z',
        estimatedCompletion: '2026-07-07T17:00:00Z',
        actualCompletion: '',
        downtimeHours: 36, // Ongoing
        repairCost: 0,
        solution: ''
      },
      {
        id: 'TKT-002',
        equipmentId: 'EQ-002',
        equipmentName: 'Mac 5500 HD ECG System',
        reportedBy: 'Dr. James Wilson',
        department: 'Cardiology',
        problemDescription: 'System does not power on even when connected to wall power. Charging light does not illuminate. Emergency crash cart ECG needed.',
        priority: 'Critical',
        assignedEngineer: 'David Kojo',
        status: 'Pending',
        reportedAt: '2026-07-05T14:20:00Z',
        estimatedCompletion: '2026-07-06T12:00:00Z',
        actualCompletion: '',
        downtimeHours: 7,
        repairCost: 0,
        solution: ''
      },
      {
        id: 'TKT-003',
        equipmentId: 'EQ-005',
        equipmentName: 'Primus Anesthesia Workstation',
        reportedBy: 'Anesthetist Peter Parker',
        department: 'OR',
        problemDescription: 'Flow sensor failure warning on screen during morning startup checks. System locked out anesthesia delivery.',
        priority: 'Critical',
        assignedEngineer: 'Marcus Chen',
        status: 'Completed',
        reportedAt: '2026-06-28T07:00:00Z',
        estimatedCompletion: '2026-06-29T12:00:00Z',
        actualCompletion: '2026-06-28T14:45:00Z',
        downtimeHours: 7.75,
        repairCost: 380,
        solution: 'Replaced faulty flow sensor module (Part: FS-DR-90). Recalibrated flow valves and ran self-tests. Patient ready.'
      }
    ];
    initialBreakdowns.forEach(b => db.set('breakdowns', b.id, b));
  }

  // 5. Calibration Log
  if (db.list('calibration').length === 0) {
    const initialCalibrations = [
      {
        id: 'CAL-001',
        equipmentId: 'EQ-001',
        equipmentName: 'Revolution CT Scanner',
        calibrationDate: '2026-02-15',
        nextDueDate: '2026-08-15',
        frequency: '6 Months',
        performedBy: 'GE Service Engineer Team',
        certificateNumber: 'CERT-GE-77890-1',
        status: 'Active',
        notes: 'Full gantry alignment and kV/mA calibration. Passed all standard parameters.'
      },
      {
        id: 'CAL-002',
        equipmentId: 'EQ-002',
        equipmentName: 'Mac 5500 HD ECG System',
        calibrationDate: '2025-07-05',
        nextDueDate: '2026-07-05', // Due today!
        frequency: '12 Months',
        performedBy: 'David Kojo',
        certificateNumber: 'CERT-BT-002-25',
        status: 'Due Soon',
        notes: 'Annual calibration due. Verification of leads, frequency response, and electrical safety standards required.'
      },
      {
        id: 'CAL-003',
        equipmentId: 'EQ-003',
        equipmentName: 'Affinity 70 Ultrasound',
        calibrationDate: '2025-11-20',
        nextDueDate: '2026-05-20', // Overdue!
        frequency: '6 Months',
        performedBy: 'Marcus Chen',
        certificateNumber: 'CERT-BT-003-25',
        status: 'Overdue',
        notes: 'Acoustic power and measurement accuracy test. Currently overdue due to probe shadow artifacts breakdown.'
      }
    ];
    initialCalibrations.forEach(c => db.set('calibration', c.id, c));
  }

  // 6. Spare Parts Inventory
  if (db.list('inventory').length === 0) {
    const initialInventory = [
      {
        id: 'PRT-001',
        name: 'Flow Sensor (Dräger Primus)',
        partNumber: 'FS-DR-90',
        quantity: 1,
        vendor: 'Draeger Medical Inc.',
        minimumStock: 2, // Low stock alert!
        purchaseCost: 220,
        location: 'Cabinet A, Shelf 2'
      },
      {
        id: 'PRT-002',
        name: 'O2 Sensor Cell (Ventilator)',
        partNumber: 'O2-CELL-M4',
        quantity: 5,
        vendor: 'BioMed Distributors Inc.',
        minimumStock: 3,
        purchaseCost: 110,
        location: 'Cabinet B, Shelf 1'
      },
      {
        id: 'PRT-003',
        name: 'ECG patient cable 10-lead',
        partNumber: 'ECG-CB-10',
        quantity: 8,
        vendor: 'GE HealthCare Parts',
        minimumStock: 2,
        purchaseCost: 150,
        location: 'Cabinet C, Shelf 4'
      },
      {
        id: 'PRT-004',
        name: 'CT Gantry Slip Ring Brush Kit',
        partNumber: 'GE-SRB-256',
        quantity: 0, // Out of stock!
        vendor: 'GE HealthCare Parts',
        minimumStock: 1, // Low stock alert!
        purchaseCost: 1450,
        location: 'Cabinet E, Lockbox'
      }
    ];
    initialInventory.forEach(p => db.set('inventory', p.id, p));
  }

  // 7. System Logs
  if (db.list('logs').length === 0) {
    const initialLogs = [
      {
        id: 'LOG-001',
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        userId: 'user-admin',
        userName: 'Dr. Sarah Jenkins',
        action: 'System Initialization',
        details: 'Initial database collections established with default schema structures.'
      },
      {
        id: 'LOG-002',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        userId: 'user-admin',
        userName: 'Dr. Sarah Jenkins',
        action: 'Equipment Register',
        details: 'Added GE Revolution CT Scanner (EQ-001) to Radiology Department.'
      },
      {
        id: 'LOG-003',
        timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
        userId: 'user-engineer',
        userName: 'Marcus Chen',
        action: 'Breakdown Resolve',
        details: 'Resolved ticket TKT-003: primus anesthesia workstation flow sensor replaced.'
      },
      {
        id: 'LOG-004',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        userId: 'user-staff',
        userName: 'Nurse Emily Rose',
        action: 'Breakdown Report',
        details: 'Reported shadow artifacts breakdown on Affinity 70 Ultrasound (EQ-003).'
      }
    ];
    initialLogs.forEach(l => db.set('logs', l.id, l));
  }

  // 8. Branches Seed
  if (db.list('branches').length === 0) {
    const defaultBranches = [
      { id: 'BR-1', name: 'City Central Hospital', location: 'Downtown Hub' },
      { id: 'BR-2', name: 'Westside Medical Clinic', location: 'Westside Suburb' },
      { id: 'BR-3', name: 'Mercy General Branch', location: 'Northside Campus' }
    ];
    defaultBranches.forEach(b => db.set('branches', b.id, b));
  }

  // 9. AMC/CMC Contracts Seed
  if (db.list('contracts').length === 0) {
    const defaultContracts = [
      {
        id: 'CTR-001',
        contractNumber: 'CON-GE-8891',
        vendor: 'GE HealthCare Support',
        contractType: 'CMC', // Comprehensive
        equipmentId: 'EQ-001',
        equipmentName: 'Revolution CT Scanner',
        startDate: '2025-01-01',
        endDate: '2027-01-01',
        cost: 12500,
        slaResponseHours: 4,
        status: 'Active',
        notes: 'Includes all replacement tube inserts, vacuum components, and gantry parts.'
      },
      {
        id: 'CTR-002',
        contractNumber: 'CON-DR-2201',
        vendor: 'Draeger Medical Inc.',
        contractType: 'AMC', // Annual
        equipmentId: 'EQ-004',
        equipmentName: 'Evita V800 Ventilator',
        startDate: '2025-07-20',
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expiring in 15 days
        cost: 2400,
        slaResponseHours: 12,
        status: 'Due Soon',
        notes: 'Covers calibration verification and standard O2 cells filters.'
      }
    ];
    defaultContracts.forEach(c => db.set('contracts', c.id, c));
  }

  // 10. Dynamically append Branch and Lifecycle tracking fields to Equipment list
  const equipment = db.list('equipment');
  const branchesList = ['City Central Hospital', 'Westside Medical Clinic', 'Mercy General Branch'];
  equipment.forEach((eq, idx) => {
    let updates = {};
    let changed = false;
    
    if (!eq.branch) {
      updates.branch = branchesList[idx % branchesList.length];
      changed = true;
    }
    
    if (!eq.lifecycle) {
      // Installed -> Active -> Under Repair -> Retired -> Disposed
      if (eq.status === 'Under Maintenance') {
        updates.lifecycle = 'Under Repair';
      } else if (eq.status === 'Out of Service') {
        updates.lifecycle = 'Retired';
      } else {
        updates.lifecycle = 'Active';
      }
      changed = true;
    }

    if (changed) {
      db.update('equipment', eq.id, updates);
    }
  });
}

export default db;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = db;
  module.exports.initSeedData = initSeedData;
  module.exports.syncWithFirestore = syncWithFirestore;
}
