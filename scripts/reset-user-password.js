// Reset a user's password to a chosen value directly in Turso, matching the
// app's hash scheme: password_hash = `${salt}$${sha256hex(salt + ":" + password)}`.
// Also clears last_login so the app forces a password change on next login.
// Run: node scripts/reset-user-password.js <email> <newPassword>
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];
const TURSO_URL = get('EXPO_PUBLIC_TURSO_URL');
const TURSO_TOKEN = get('EXPO_PUBLIC_TURSO_AUTH_TOKEN');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${salt}:${password}`, 'utf8').digest('hex');
  return `${salt}$${hash}`;
}

const txt = (v) => (v == null ? { type: 'null' } : { type: 'text', value: String(v) });

(async () => {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('usage: node scripts/reset-user-password.js <email> <newPassword>');
    process.exit(1);
  }

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_type: 'write',
      requests: [
        {
          type: 'execute',
          stmt: {
            sql: `UPDATE users SET password_hash = ?, last_login = NULL WHERE email = ?`,
            args: [txt(hashPassword(password)), txt(email)],
            want_rows: false,
          },
        },
        {
          type: 'execute',
          stmt: { sql: 'SELECT changes() AS c', want_rows: true },
        },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${text}`);
  const json = JSON.parse(text);
  const err = (json.results || []).find((r) => r.type === 'err');
  if (err) throw new Error(`Turso stmt error: ${err.error}`);
  const changed = json.results?.[1]?.response?.result?.rows?.[0]?.[0]?.value;
  console.log(`reset password for ${email} -> rows changed: ${changed}`);
  if (String(changed) === '0') {
    console.error('No matching user; check the email.');
    process.exit(1);
  }
})().catch((e) => {
  console.error('RESET FAILED:', e.message);
  process.exit(1);
});
