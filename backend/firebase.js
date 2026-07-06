import https from 'https';

/**
 * Firebase Firestore REST API client.
 *
 * Uses the Firestore REST API (no Admin SDK) so it works with only
 * the web API key + project ID - no service account needed.
 *
 * Falls back to null (offline mode) if env vars are missing.
 */

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

const BASE_URL = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : null;

function httpFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        port: 443
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: async () => data,
            json: async () => {
              try {
                return JSON.parse(data);
              } catch (e) {
                return {};
              }
            }
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}


// Convert Firestore REST document fields to plain JS object
function fromFirestore(fields = {}) {
  const obj = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined)  obj[key] = val.stringValue;
    else if (val.integerValue !== undefined) obj[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined)  obj[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
    else if (val.nullValue !== undefined)    obj[key] = null;
    else if (val.mapValue)  obj[key] = fromFirestore(val.mapValue.fields || {});
    else if (val.arrayValue) {
      obj[key] = (val.arrayValue.values || []).map(v => fromFirestore({ _: v })._);
    } else obj[key] = undefined;
  }
  return obj;
}

// Convert plain JS value to Firestore REST field value
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean')  return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string')  return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert plain JS object to Firestore REST fields map
function toFirestore(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

// Build query param string (including API key)
function apiUrl(path = '') {
  const key = FIREBASE_API_KEY ? `?key=${FIREBASE_API_KEY}` : '';
  return `${BASE_URL}${path}${key}`;
}

/**
 * Firestore REST db object (mirrors the Admin SDK API used in db.js).
 * Returns null if project/key env vars are not set.
 */
let db = null;

if (BASE_URL) {
  db = {
    collection(col) {
      return {
        // Get all documents in the collection
        async get() {
          try {
            let allDocs = [];
            let pageToken = null;
            do {
              const url = apiUrl(`/${col}`) + (pageToken ? `&pageToken=${pageToken}` : '');
              const res = await httpFetch(url);
              if (!res.ok) {
                const err = await res.text();
                console.error(`[Firestore REST] collection.get error ${res.status}:`, err);
                return { empty: true, forEach: () => {} };
              }
              const json = await res.json();
              if (json.documents) allDocs = allDocs.concat(json.documents);
              pageToken = json.nextPageToken || null;
            } while (pageToken);

            const docs = allDocs.map(d => ({
              data: () => fromFirestore(d.fields),
              id: d.name.split('/').pop(),
            }));
            return {
              empty: docs.length === 0,
              forEach: (fn) => docs.forEach(fn),
            };
          } catch (err) {
            console.error('[Firestore REST] collection.get exception:', err.message);
            return { empty: true, forEach: () => {} };
          }
        },

        // Reference to a specific document
        doc(docId) {
          return {
            async set(data) {
              try {
                const fields = toFirestore(data);
                const url = apiUrl(`/${col}/${docId}`);
                const res = await httpFetch(url, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ fields }),
                });
                if (!res.ok) {
                  const err = await res.text();
                  console.error(`[Firestore REST] doc.set error ${res.status}:`, err);
                }
              } catch (err) {
                console.error('[Firestore REST] doc.set exception:', err.message);
              }
            },
            async get() {
              try {
                const url = apiUrl(`/${col}/${docId}`);
                const res = await httpFetch(url);
                if (!res.ok) return { exists: false, data: () => null };
                const json = await res.json();
                return {
                  exists: true,
                  data: () => fromFirestore(json.fields || {}),
                };
              } catch (err) {
                console.error('[Firestore REST] doc.get exception:', err.message);
                return { exists: false, data: () => null };
              }
            },
            async delete() {
              try {
                const url = apiUrl(`/${col}/${docId}`);
                const res = await httpFetch(url, { method: 'DELETE' });
                if (!res.ok) {
                  const err = await res.text();
                  console.error(`[Firestore REST] doc.delete error ${res.status}:`, err);
                }
              } catch (err) {
                console.error('[Firestore REST] doc.delete exception:', err.message);
              }
            },
          };
        },

        // Batch write (simplified: sequential for REST)
        batch() {
          const ops = [];
          return {
            set(docRef, data) {
              ops.push({ docRef, data });
              return this;
            },
            async commit() {
              for (const op of ops) {
                await op.docRef.set(op.data);
              }
            },
          };
        },
      };
    },

    // Batch helper at top level  
    batch() {
      const ops = [];
      return {
        set(docRef, data) { ops.push({ docRef, data }); return this; },
        async commit() {
          for (const op of ops) await op.docRef.set(op.data);
        },
      };
    },
  };

  console.log(`[Firebase] Firestore REST API enabled for project: ${FIREBASE_PROJECT_ID}`);
} else {
  console.log('[Firebase] Admin credentials not supplied. Firestore sync disabled.');
}

// Compatibility export (same as before)
export { db };
export default db;
