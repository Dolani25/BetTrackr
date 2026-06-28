import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(mongoUri, { family: 4 });
    const users = await User.find({});
    console.log('Total Users:', users.length);
    for (const u of users) {
      console.log(`User ID: ${u.userId}`);
      console.log(`Linked Accounts:`);
      for (const acc of u.linkedAccounts) {
        console.log(`  - Bookie: ${acc.bookie}, Username: ${acc.username}, Has token: ${!!acc.encryptedSessionToken}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
