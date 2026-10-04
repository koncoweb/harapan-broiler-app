// Read-only inspection of the quizzizclone (Harapan Broiler) Firebase project.
// Usage: node scripts/inspect-firebase.js
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const KEY_PATH = 'c:/projects/harapanbroiler/quizzizclone-firebase-adminsdk-fbsvc-6ea471e75a.json';
const serviceAccount = require(KEY_PATH);

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = getFirestore();

async function main() {
  console.log('\n=====================================================');
  console.log(' Firebase project:', serviceAccount.project_id);
  console.log('=====================================================\n');

  // ---------- AUTH USERS ----------
  try {
    const { users } = await getAuth().listUsers(1000);
    console.log(`## Auth users: ${users.length}\n`);
    console.log('email | displayName | role | disabled | created | lastLogin');
    console.log('-'.repeat(90));
    for (const u of users.sort((a, b) => (a.email || '').localeCompare(b.email || ''))) {
      const created = u.metadata.creationTime || '-';
      const last = u.metadata.lastSignInTime || '-';
      console.log(`${u.email || '(no email)'} | ${u.displayName || '-'} | role=${u.customClaims?.role || u.role || '-'} | disabled=${u.disabled} | ${created} | ${last}`);
    }
  } catch (e) {
    console.log('Auth list failed:', e.message);
  }

  // ---------- FIRESTORE COLLECTIONS ----------
  console.log('\n## Firestore top-level collections');
  try {
    const cols = await db.listCollections();
    for (const c of cols) {
      const snap = await c.get();
      console.log(`  - ${c.id}: ${snap.size} docs`);
    }
  } catch (e) {
    console.log('  (could not list collections)', e.message);
  }

  // ---------- SETTINGS ----------
  console.log('\n## settings/general');
  try {
    const s = await db.collection('settings').doc('general').get();
    console.log(s.exists ? JSON.stringify(s.data()) : '  (not found)');
  } catch (e) {
    console.log('  error:', e.message);
  }

  // ---------- USERS (firestore) ----------
  console.log('\n## firestore users (role docs)');
  try {
    const snap = await db.collection('users').limit(100).get();
    snap.forEach((d) => {
      const x = d.data();
      console.log(`  ${d.id} | ${x.email || '-'} | role=${x.role || '-'} | ${x.displayName || '-'}`);
    });
  } catch (e) {
    console.log('  error:', e.message);
  }

  // ---------- WEIGHING SESSIONS ----------
  console.log('\n## weighing_sessions (totals + latest 10)');
  try {
    const all = await db.collection('weighing_sessions').get();
    let totalWeight = 0;
    let totalAmount = 0;
    let paid = 0;
    const byStatus = {};
    all.forEach((d) => {
      const x = d.data();
      totalWeight += x.totalNetWeight || 0;
      totalAmount += x.totalAmount || 0;
      paid += x.amountPaid || 0;
      const st = x.paymentStatus || 'Belum Lunas';
      byStatus[st] = (byStatus[st] || 0) + 1;
    });
    console.log(`  count=${all.size} | sumTotalWeight=${totalWeight.toFixed(2)} kg | sumTotalAmount=${totalAmount} | sumPaid=${paid}`);
    console.log('  byStatus:', JSON.stringify(byStatus));
    const recent = await db.collection('weighing_sessions').orderBy('createdAt', 'desc').limit(10).get();
    console.log('\n  latest 10:');
    recent.forEach((d) => {
      const x = d.data();
      console.log(`   ${x.date} ${x.time || ''} | ${x.buyer} | ${x.driver || '-'} | ${x.totalNetWeight}kg | ${x.totalColi}x | total=${x.totalAmount} | paid=${x.amountPaid || 0} | ${x.paymentStatus || '-'}`);
    });
  } catch (e) {
    console.log('  error:', e.message);
  }

  await admin.deleteApp(admin.getApp());
}

main().catch((e) => { console.error(e); process.exit(1); });
