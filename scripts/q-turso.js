// Ad-hoc Turso SQL runner for local dev (uses .env token).
// Run: node scripts/q-turso.js "SELECT ..."
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const U = get('EXPO_PUBLIC_TURSO_URL');
const T = get('EXPO_PUBLIC_TURSO_AUTH_TOKEN');

(async () => {
  const sql = process.argv[2];
  const r = await fetch(`${U}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, want_rows: true } }] }),
  });
  const j = await r.json();
  const res = j.results?.[0];
  if (res?.type === 'err') { console.error('ERR:', res.error); process.exit(1); }
  console.log(JSON.stringify(res?.response?.result?.rows, null, 2));
})();
