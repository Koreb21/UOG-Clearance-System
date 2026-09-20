(require('dotenv').config());
const { MongoClient } = require('mongodb');
(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'ugclear';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('app_store');
    const doc = await col.findOne({ _id: 'singleton' });
    if (!doc || !doc.data) { console.log('No app_store document found.'); process.exit(0); }
    const users = doc.data.users || [];
    const admin = users.find(u => u.username === 'admin' || u.role === 'SYSTEM_ADMIN');
    console.log('Admin record (partial):');
    if (!admin) {
      console.log('Admin user not found');
    } else {
      const info = { id: admin.id, username: admin.username, role: admin.role, email: admin.email, campusId: admin.campusId };
      if (admin.password === 'admin@123') {
        info.passwordMatch = 'matches admin@123 (seeded)';
      } else if (admin.password === 'admin123') {
        info.passwordMatch = 'matches admin123 (screenshot)';
      } else {
        info.passwordMatch = 'different (hidden)';
      }
      console.log(JSON.stringify(info, null, 2));
    }
    await client.close();
  } catch (e) {
    console.error('Error querying MongoDB:', e.message || e);
    process.exit(1);
  }
})();
