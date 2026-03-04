require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const AppConfig = require('./models/AppConfig');

const MEMBERS = ['Tanishq', 'Person2', 'Person3', 'Person4'];

// 🔑 Set passwords here before running
const USERS = [
  { name: 'Tanishq',  password: 'pass1', role: 'member' },
  { name: 'Person2',  password: 'pass2', role: 'member' },
  { name: 'Person3',  password: 'pass3', role: 'member' },
  { name: 'Person4',  password: 'pass4', role: 'member' },
  { name: 'admin',    password: 'adminpass', role: 'admin' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  // Create users
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await User.findOneAndUpdate(
      { name: u.name },
      { name: u.name, password: hash, role: u.role },
      { upsert: true }
    );
    console.log(`User upserted: ${u.name}`);
  }

  // Seed initial config into DB
  await AppConfig.findOneAndUpdate(
    { key: 'members' },
    { value: MEMBERS },
    { upsert: true }
  );
  await AppConfig.findOneAndUpdate(
    { key: 'prices' },
    { value: { full: 80, half: 40 } },
    { upsert: true }
  );
  console.log('Config seeded');

  mongoose.disconnect();
  console.log('Done ✅');
}

seed().catch(console.error);