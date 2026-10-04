// Dump Firestore users collection (email, displayName, role) for seeding.
// Run: node scripts/dump-users.js
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const SA_PATH = 'c:/projects/harapanbroiler/quizzizclone-firebase-adminsdk-fbsvc-6ea471e75a.json';
admin.initializeApp({ credential: admin.cert(require(SA_PATH)) });
const db = getFirestore();
(async () => {
  const snap = await db.collection('users').get();
  const out = snap.docs.map((d) => {
    const x = d.data();
    return { uid: d.id, email: x.email, displayName: x.displayName, role: x.role };
  });
  out.sort((a, b) => (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1));
  console.log(JSON.stringify(out, null, 2));
  await admin.deleteApp(admin.getApp());
})();
