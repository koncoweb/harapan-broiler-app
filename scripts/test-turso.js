// Throwaway connectivity/logic test for the Turso HTTP client pattern.
// Run: node scripts/test-turso.js
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const URL = get('EXPO_PUBLIC_TURSO_URL');
const TOKEN = get('EXPO_PUBLIC_TURSO_AUTH_TOKEN');

async function post(body) {
  const res = await fetch(`${URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${t}`);
  return JSON.parse(t);
}

(async () => {
  // insert a temp session with typed args
  const del = await post({ requests: [{ type: 'execute', stmt: { sql: "DELETE FROM weighing_sessions WHERE id = ?", args: [{ type: 'text', value: 'selftest_1' }] } }] });
  const ins = await post({
    requests: [{ type: 'execute', stmt: { sql:
      "INSERT INTO weighing_sessions (id, date, time, buyer, driver, base_price, cn_amount, final_price, total_net_weight, total_amount, total_coli, amount_paid, payment_status, items, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [
        { type: 'text', value: 'selftest_1' },
        { type: 'text', value: '2026-10-01' },
        { type: 'text', value: '10:00' },
        { type: 'text', value: 'SelfTest Buyer' },
        { type: 'text', value: 'SelfTest Driver' },
        { type: 'float', value: 18000 },
        { type: 'float', value: 500 },
        { type: 'float', value: 17500 },
        { type: 'float', value: 123.45 },
        { type: 'float', value: 2160375 },
        { type: 'integer', value: '5' },
        { type: 'float', value: 0 },
        { type: 'text', value: 'Belum Lunas' },
        { type: 'text', value: JSON.stringify([{ index: 1, grossWeight: 24.7 }, { index: 2, grossWeight: 25.1 }]) },
        { type: 'text', value: 'selftest' },
        { type: 'integer', value: String(Date.now()) },
      ] } }],
  });
  // paginated query + search pushdown
  const sel = await post({
    requests: [{ type: 'execute', stmt: { sql:
      "SELECT id, buyer, total_net_weight, payment_status FROM weighing_sessions WHERE buyer LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      args: [{ type: 'text', value: '%SelfTest%' }, { type: 'integer', value: '10' }, { type: 'integer', value: '0' }], want_rows: true } }],
  });
  console.log('del:', del.results?.[0]?.type, '| ins:', ins.results?.[0]?.type);
  const r = sel.results?.[0]?.response?.result;
  console.log('select rows:', JSON.stringify(r?.rows, null, 0));
  // cleanup
  await post({ requests: [{ type: 'execute', stmt: { sql: "DELETE FROM weighing_sessions WHERE id = ?", args: [{ type: 'text', value: 'selftest_1' }] } }] });
  console.log('cleanup done');
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
