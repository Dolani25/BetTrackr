import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = process.env.MONGODB_URI;

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback_secret_for_development_only';
  return crypto.createHash('sha256').update(secret).digest();
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return null;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('❌ Decrypt failed:', err.message);
    return null;
  }
};

async function testSync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { family: 4 });
    
    const user = await User.findOne({ "linkedAccounts.bookie": "Football.com" });
    if (!user) {
      console.error('❌ No user with Football.com linked account found.');
      return;
    }

    const account = user.linkedAccounts.find(a => a.bookie === 'Football.com');
    console.log(`Found linked account: ${account.username}`);
    
    const decryptedCookies = decrypt(account.encryptedSessionToken);
    if (!decryptedCookies) {
      console.error('❌ Failed to decrypt session token.');
      return;
    }

    console.log('🚀 Spawning scraper fetchFootball.js with LAST_BET_DATE_MS=0...');
    const scriptPath = path.resolve(__dirname, '../scrapers/fetchFootball.js');
    
    const env = {
      ...process.env,
      SCRAPER_USERNAME: account.username,
      SCRAPER_COOKIES: decryptedCookies,
      SCRAPER_USER_AGENT: account.userAgent || 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
      LAST_BET_DATE_MS: '0'
    };

    const child = spawn('node', [scriptPath], { env });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      // Only log some lines to avoid spamming the console
      if (text.includes('Fetching') || text.includes('Found') || text.includes('Error') || text.includes('retry') || text.includes('Exhausted') || text.includes('API rate limit') || text.includes('Extracted')) {
        console.log(text.trim());
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`[Scraper Error] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`\n🏁 Scraper process exited with code ${code}`);
      mongoose.disconnect();
    });

  } catch (err) {
    console.error('Error during test:', err);
    mongoose.disconnect();
  }
}

testSync();
