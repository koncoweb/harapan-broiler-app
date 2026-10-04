// One-off migration: Firestore (quizzizclone) -> Turso (harapanbroiler).
// Copies settings + all weighing_sessions. Users are NOT copied (passwords are
// not exportable from Firebase Auth); they get seeded separately in the app.
// Run: node scripts/migrate-firestore-to-turso.js
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const SA_PATH = 'c:/projects/harapanbroiler/quizzizclone-firebase-adminsdk-fbsvc-6ea471e75a.json';

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const TURSO_URL = get('EXPO_PUBLIC_TURSO_URL');
const TURSO_TOKEN = get('EXPO_PUBLIC_TURSO_AUTH_TOKEN');

admin.initializeApp({ credential: admin.cert(require(SA_PATH)) });
const fsdb = getFirestore();

async function turso(stmts) {
  // Build a batched transactional pipeline.
  const requests = stmts.map((s) => ({
    type: 'execute',
    stmt: { sql: s.sql, args: s.args, want_rows: false },
  }));
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${text}`);
  const json = JSON.parse(text);
  const err = (json.results || []).find((r) => r.type === 'err');
  if (err) throw new Error(`Turso stmt error: ${err.error}`);
  return json;
}

const txt = (v) => ({ type: 'text', value: v == null ? null : String(v) });
const txtOrNull = (v) => (v == null ? { type: 'null' } : { type: 'text', value: String(v) });
const num = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return { type: 'null' };
  return Number.isInteger(n) ? { type: 'integer', value: String(n) } : { type: 'float', value: n };
};
const toMs = (v) => {
  if (v == null) return Date.now();
  if (typeof v === 'number') return v;
  if (v.toMillis) return v.toMillis(); // Timestamp
  if (v instanceof Date) return v.getTime();
  return Date.now();
};

async function migrateSettings() {
  const doc = await fsdb.collection('settings').doc('general').get();
  if (!doc.exists) { console.log('settings: none'); return; }
  const d = doc.data();
  await turso([
    {
      sql: `INSERT INTO settings (key, farm_name, farm_address) VALUES (?,?,?)
            ON CONFLICT(key) DO UPDATE SET farm_name=excluded.farm_name, farm_address=excluded.farm_address`,
      args: [txt('general'), txtOrNull(d.farmName), txtOrNull(d.farmAddress)],
    },
  ]);
  console.log('settings: migrated');
}

async function migrateSessions() {
  const snap = await fsdb.collection('weighing_sessions').get();
  console.log(`sessions found: ${snap.size}`);
  const cols = `id, date, time, buyer, driver, base_price, cn_amount, final_price,
    total_net_weight, total_amount, total_coli, amount_paid, payment_status,
    notes, items, created_by, created_at`;
  const stmts = [];
  const sql = `INSERT OR REPLACE INTO weighing_sessions (${cols}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  let count = 0;
  for (const doc of snap.docs) {
    const x = doc.data();
    stmts.push({
      sql,
      args: [
        txt(doc.id),
        txt(x.date ?? ''),
        txtOrNull(x.time),
        txt(x.buyer ?? ''),
        txtOrNull(x.driver),
        num(x.basePrice ?? 0),
        num(x.cnAmount ?? 0),
        num(x.finalPrice ?? 0),
        num(x.totalNetWeight ?? 0),
        num(x.totalAmount ?? 0),
        num(x.totalColi ?? 0),
        num(x.amountPaid ?? 0),
        txt(x.paymentStatus ?? 'Belum Lunas'),
        txtOrNull(x.notes),
        txt(JSON.stringify(x.items ?? [])),
        txtOrNull(x.createdBy),
        num(toMs(x.createdAt)),
      ],
    });
    if (stmts.length >= 200) { await flush(stmts); count += stmts.length; stmts.length = 0; console.log(`  inserted ${count}`); }
  }
  if (stmts.length) { await flush(stmts); count += stmts.length; }
  console.log(`sessions migrated: ${count}`);
}

async function flush(chunk) {
  // chunk is reused array; copy then clear happens at caller via slice
  await turso(chunk.slice());
}

(async () => {
  await migrateSettings();
  await migrateSessions();
  const verify = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql: 'SELECT COUNT(*) AS c FROM weighing_sessions', want_rows: true } }] }),
  }).then((r) => r.json());
  console.log('turso row count:', verify.results?.[0]?.response?.result?.rows?.[0]?.[0]?.value);
  await admin.app().delete();
})().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
