import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function checkDb() {
  try {
    console.log('Connecting...');
    await mongoose.connect(mongoUri, { family: 4 });
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    for (const col of collections) {
      if (col.name === 'bets') {
        const counts = await db.collection(col.name).aggregate([
          { $group: { _id: { userId: "$userId", bookie: "$bookie", user: "$sportsbookUsername" }, count: { $sum: 1 } } }
        ]).toArray();
        console.log('Bets counts by group:');
        console.log(JSON.stringify(counts, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
