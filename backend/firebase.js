import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let db = null;

if (projectId && clientEmail && privateKey) {
  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    }
    db = admin.firestore();
    console.log('[Firebase] Admin SDK initialized successfully via Environment Variables.');
  } catch (err) {
    console.error('[Firebase] Error initializing Admin SDK:', err.message);
  }
} else {
  console.log('[Firebase] Admin credentials not supplied. Firestore sync disabled.');
}

export { admin, db };
