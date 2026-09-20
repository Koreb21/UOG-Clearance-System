#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'ugclear';
const desiredPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin@123';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection('app_store');
    const doc = await col.findOne({ _id: 'singleton' });
    if (!doc || !doc.data) {
      console.error('No app_store singleton found. Nothing to update.');
      process.exit(1);
    }
    const data = doc.data;
    if (!Array.isArray(data.users)) {
      console.error('No users array in app_store data.');
      process.exit(1);
    }
    let changed = false;
    const admin = data.users.find(u => u.username === 'admin');
    if (admin) {
      if (admin.password !== desiredPassword) {
        admin.password = desiredPassword;
        changed = true;
      }
    } else {
      data.users.push({ id: 'u-admin', username: 'admin', password: desiredPassword, role: 'SYSTEM_ADMIN', campusId: 'TEWODROS', email: 'admin@uog.edu.et', staffId: 'UGR/ADM/001', active: true, mustChangePassword: false });
      changed = true;
    }
    if (changed) {
      await col.replaceOne({ _id: 'singleton' }, { _id: 'singleton', data, updated_at: new Date() }, { upsert: true });
      console.log('Updated admin password in MongoDB to desired value.');
    } else {
      console.log('Admin password already matches desired value. Nothing changed.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin password:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
