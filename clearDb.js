import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MONGODB_URI is not defined in your .env file.');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const hasConfirm = args.includes('--confirm');
const hasDrop = args.includes('--drop');
const hasDropDb = args.includes('--drop-db');

if (!hasConfirm) {
  // Mask password for safe console logs
  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':******@');
  
  console.log(`
⚠️  WARNING: You are about to clear the MongoDB database!
Database URI: ${maskedUri}

To proceed, you must run this script with the --confirm flag:
  node clearDb.js --confirm

Options:
  --confirm    Required to execute the clearing operation.
  --drop       Drop all collections completely (deletes indexes too).
  --drop-db    Drop the entire database.
  
(By default, running with only --confirm will delete all documents from all collections while preserving the collection structures and indexes).
`);
  process.exit(0);
}

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('✅ Connected to MongoDB.');

    const db = mongoose.connection.db;

    if (hasDropDb) {
      console.log('💥 Dropping the entire database...');
      await db.dropDatabase();
      console.log('✅ Database dropped successfully!');
    } else {
      const collections = await db.listCollections().toArray();

      if (collections.length === 0) {
        console.log('ℹ️ No collections found in the database. Nothing to clear.');
        return;
      }

      console.log(`⚠️ Found ${collections.length} collections.`);

      for (const col of collections) {
        const collectionName = col.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        if (hasDrop) {
          console.log(`🔥 Dropping collection: ${collectionName}...`);
          try {
            await db.collection(collectionName).drop();
            console.log(`✅ Collection ${collectionName} dropped.`);
          } catch (dropErr) {
            console.error(`❌ Failed to drop collection ${collectionName}:`, dropErr.message);
          }
        } else {
          console.log(`🧹 Clearing all documents from: ${collectionName}...`);
          try {
            const result = await db.collection(collectionName).deleteMany({});
            console.log(`✅ Cleared ${result.deletedCount} documents from ${collectionName}.`);
          } catch (clearErr) {
            console.error(`❌ Failed to clear documents from ${collectionName}:`, clearErr.message);
          }
        }
      }
    }

    console.log('\n🎉 Database operations completed successfully!');
  } catch (error) {
    console.error('❌ Error performing database operations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🚪 Disconnected from MongoDB.');
  }
}

clearDatabase();
