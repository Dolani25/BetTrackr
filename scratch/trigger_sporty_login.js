import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import User from '../models/User.js';
import Bet from '../models/Bet.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

async function runLoginTest() {
  let serverProcess = null;

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { family: 4 });

    const user = await User.findOne({ "linkedAccounts.bookie": { $in: ["SportyBet", "sportybet"] } });
    if (!user) {
      console.error('❌ User not found with a SportyBet account linked.');
      await mongoose.disconnect();
      return;
    }

    const account = user.linkedAccounts.find(a => a.bookie.toLowerCase() === 'sportybet');
    console.log(`Found user ID: ${user.userId}, bookie username: ${account.username}`);

    // Create a fresh JWT token to authenticate the API request
    const token = jwt.sign({ userId: user.userId }, jwtSecret, { expiresIn: '1h' });
    console.log(`Generated JWT: ${token.substring(0, 20)}...`);

    // Let's clear existing SportyBet bets to ensure the sync fully works
    console.log('🗑️ Clearing existing SportyBet bets for this user to test fresh population...');
    const deleteResult = await Bet.deleteMany({ userId: user.userId, bookie: 'SportyBet' });
    console.log(`Deleted ${deleteResult.deletedCount} bets.`);

    // Start server.js in background
    console.log('🔌 Starting server.js on port 8000...');
    const rootDir = path.resolve(__dirname, '..');
    serverProcess = spawn('node', ['server.js'], {
      cwd: rootDir,
      env: { ...process.env, PORT: '8000' }
    });

    serverProcess.on('error', (err) => {
      console.error(`[Server Spawn Error]`, err);
    });

    serverProcess.on('close', (code) => {
      console.log(`[Server Process Closed] Exit code: ${code}`);
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    // Wait 10 seconds for server to boot
    await new Promise(r => setTimeout(r, 10000));

    console.log('📡 Sending POST login trigger...');
    const loginUrl = 'http://127.0.0.1:8000/api/login';
    
    // We send Authorization header so it links to the existing user session!
    const response = await axios.post(loginUrl, {
      bookie: 'SportyBet',
      username: process.env.SCRAPER_USERNAME || '7068639238',
      password: process.env.SCRAPER_PASSWORD || 'Harkins20'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Response:', response.data);

    if (!response.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(response.data));
    }

    console.log('⏳ Polling sync status...');
    const statusUrl = 'http://127.0.0.1:8000/api/sync/status';
    
    // Poll status every 5 seconds until isSyncing is false
    let isSyncing = true;
    let attempts = 0;
    while (isSyncing && attempts < 100) {
      attempts++;
      await new Promise(r => setTimeout(r, 5000));
      
      const statusRes = await axios.get(statusUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      isSyncing = statusRes.data.isSyncing;
      
      const currentBets = await Bet.countDocuments({ userId: user.userId, bookie: 'SportyBet' });
      console.log(`Polling status... isSyncing: ${isSyncing} | Current bets in DB: ${currentBets}`);
      
      if (!isSyncing) break;
    }

    console.log('🎉 Sync completed. Checking final stats...');
    const finalBetsCount = await Bet.countDocuments({ userId: user.userId, bookie: 'SportyBet' });
    console.log(`✅ Final Bet Count in DB: ${finalBetsCount}`);

    // Verify token was stored
    const updatedUser = await User.findOne({ userId: user.userId });
    const updatedAccount = updatedUser.linkedAccounts.find(a => a.bookie.toLowerCase() === 'sportybet');
    console.log(`👤 Updated Account lastSync: ${updatedAccount.lastSync}`);
    console.log(`👤 Updated Account token: ${!!updatedAccount.encryptedSessionToken}`);

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    if (serverProcess) {
      console.log('🔌 Stopping server.js...');
      serverProcess.kill();
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB. Run complete.');
  }
}

runLoginTest();
