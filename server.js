import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from './models/User.js';
import Bet from './models/Bet.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ JWT Verify Error:", err.message);
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    if (req.url !== '/api/bets/all') {
      console.log("🔑 Authenticated User:", user);
    }
    req.user = user; // Contains userId
    next();
  });
};

// --- ENCRYPTION HELPER ---
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback_secret_for_development_only';
  return crypto.createHash('sha256').update(secret).digest();
};

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    console.error('❌ Decrypt failed: malformed ciphertext (expected iv:encrypted)');
    return null;
  }
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

// --- PROGRESS & SYNC STORES ---
const progressStore = {}; 
const activeSyncs = new Map(); // key: `${bookie}_${username}`

// --- HELPER FUNCTION ---
async function runScraper(scraperName, scriptPath, envVars = {}, progressKey = null, onLoginSuccess = null, onData = null) {
  if (progressKey && activeSyncs.has(progressKey)) {
    console.log(`[Lock] Sync already active for ${progressKey}. blocking.`);
    throw new Error("A sync is already in progress for this account.");
  }

  return new Promise((resolve, reject) => {
    console.log(`Running ${scraperName} scraper...`);
    if (progressKey) activeSyncs.set(progressKey, true);

    let totalProcessed = 0;
    const scraper = spawn('node', [scriptPath], {
      env: { ...process.env, ...envVars }
    });

    if (progressKey) {
      progressStore[progressKey] = { pct: 10, msg: 'Starting secure browser...' };
    }

    let output = '';
    let loginResolved = false;

    scraper.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`[${scraperName}] ${chunk.trim()}`);

      // Early Login Success Signal
      if (chunk.includes("===LOGIN_SUCCESS===") && !loginResolved) {
        loginResolved = true;
        if (onLoginSuccess) {
          // Try to extract token and UA right away if possible
          const tokenMatch = output.match(/===BEGIN_TOKEN===([\s\S]*?)===END_TOKEN===/);
          const uaMatch = output.match(/===BEGIN_UA===([\s\S]*?)===END_UA===/);
          
          const sessionToken = tokenMatch ? tokenMatch[1].trim() : null;
          const userAgent = uaMatch ? uaMatch[1].trim() : null;
          
          onLoginSuccess(sessionToken, userAgent);
        }
      }

      // --- INCREMENTAL BET IMPORTING (Buffering) ---
      let match;
      const jsonRegex = /===BEGIN_JSON===([\s\S]*?)===END_JSON===/g;
      while ((match = jsonRegex.exec(output)) !== null) {
          try {
              const batch = JSON.parse(match[1]);
              if (Array.isArray(batch)) {
                  totalProcessed += batch.length;
                  if (onData) {
                      onData(batch).catch(e => console.error(`[onData Error]`, e));
                  }
              }
          } catch (e) {
              console.error(`[JSON Parse Error]`, e.message);
          }
      }
      // Remove processed blocks to keep output buffer manageable
      output = output.replace(/===BEGIN_JSON===[\s\S]*?===END_JSON===\n?/g, '');
      jsonRegex.lastIndex = 0; // Reset regex state after string modification

      if (progressKey) {
        const lower = chunk.toLowerCase();
        if (lower.includes("connecting to login page")) progressStore[progressKey] = { pct: 20, msg: 'Navigating...' };
        else if (lower.includes("clicking login button")) progressStore[progressKey] = { pct: 40, msg: 'Entering credentials...' };
        else if (lower.includes("login successful")) progressStore[progressKey] = { pct: 70, msg: 'Login successful...' };
        else if (lower.includes("fetching") || lower.includes("history")) progressStore[progressKey] = { pct: 85, msg: 'Syncing bets...' };
      }
    });

    scraper.stderr.on('data', (data) => {
      console.error(`[${scraperName} ERROR] ${data.toString().trim()}`);
    });

    scraper.on('close', async (code) => {
      if (progressKey) {
        delete progressStore[progressKey];
      }
      
      if (code !== 0) {
        if (!loginResolved) {
          reject(new Error(`${scraperName} failed (${code})`));
        } else {
          console.warn(`[${scraperName}] Scraper exited with code ${code} after login was sent. Resolving with partial data.`);
          resolve({ bets: [], sessionToken: null, balance: 0, nickname: 'User', totalProcessed, success: false });
        }
        return;
      }

      let newBets = [];
      let balance = 0;
      let nickname = "User";
      let sessionToken = null;
      let userAgent = null;

      try {
        const jsonMatch = output.match(/===BEGIN_JSON===([\s\S]*?)===END_JSON===/);
        if (jsonMatch) newBets = JSON.parse(jsonMatch[1].trim());

        const tokenMatch = output.match(/===BEGIN_TOKEN===([\s\S]*?)===END_TOKEN===/);
        if (tokenMatch) sessionToken = tokenMatch[1].trim();

        const uaMatch = output.match(/===BEGIN_UA===([\s\S]*?)===END_UA===/);
        if (uaMatch) userAgent = uaMatch[1].trim();

        const balanceMatch = output.match(/===BEGIN_BALANCE===\n?([\s\S]*?)\n?===END_BALANCE===/);
        if (balanceMatch) balance = parseFloat(balanceMatch[1].trim()) || 0;

        const profileMatch = output.match(/===BEGIN_PROFILE===\n?([\s\S]*?)\n?===END_PROFILE===/);
        if (profileMatch) nickname = profileMatch[1].trim();
      } catch (err) {
        console.error("Failed to parse final output:", err.message);
      }

      // **SAFETY CHECK**: Even if exit code is 0, if login never succeeded, it's a failure.
      const isActuallySuccess = code === 0 && loginResolved;
      resolve({ 
        bets: newBets, 
        sessionToken, 
        userAgent,
        balance, 
        nickname, 
        totalProcessed, 
        success: isActuallySuccess 
      });
    });
  });
}

// Helper to handle commas and different number formats from scrapers
const cleanNumber = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const sanitized = val.toString().replace(/,/g, '').trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
};

// Normalize username (phone number cleanup, removing spaces, symbols, international code, converting 10-digit Nigerian numbers to lead-zero format)
const normalizeUsername = (username) => {
  if (typeof username !== 'string') return '';
  const clean = username.trim();
  const digitsOnly = clean.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return '0' + digitsOnly;
  }
  if (digitsOnly.length === 13 && digitsOnly.startsWith('234')) {
    return '0' + digitsOnly.slice(3);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly;
  }
  
  return clean.toLowerCase();
};


// --- SCRAPER CONFIG (single source of truth) ---
const SCRAPER_CONFIG = {
  'bcgame': { path: 'fetchBCgame.js', name: 'BC.Game' },
  'bc.game': { path: 'fetchBCgame.js', name: 'BC.Game' },
  'sportybet': { path: 'newSporty.js', name: 'SportyBet' },
  'sporty': { path: 'newSporty.js', name: 'SportyBet' },
  'msport': { path: 'fetchMsportAxios.js', name: 'MSport' },
  'football.com': { path: 'fetchFootball.js', name: 'Football.com' },
  'football': { path: 'fetchFootball.js', name: 'Football.com' },
  'betpawa': { path: 'fetchBetPawa.js', name: 'BetPawa' },
  'betano': { path: 'fetchBetano.js', name: 'Betano' }
};

const lookupScraper = (bookie) => SCRAPER_CONFIG[bookie.toLowerCase().replace(/\s+/g, '')];

// --- REAL LOGIN ENDPOINT ---
app.post('/api/login', async (req, res) => {
  const { bookie, password } = req.body;
  const username = normalizeUsername(req.body.username);
  const existingToken = req.headers['authorization']?.split(' ')[1];

  let loginSent = false;

  const selected = lookupScraper(bookie);
  if (!selected) return res.status(400).json({ success: false, message: 'Unsupported bookie' });
  const scriptPath = path.join(__dirname, 'scrapers', selected.path);
  const scraperName = selected.name;

  try {
    const progressKey = `${scraperName}_${username}`;

    // --- MULTI-ACCOUNT LINKING ---
    // Check if the user is already authenticated (linking a new account to existing profile)
    let existingUserId = null;
    if (existingToken) {
      try {
        const decoded = jwt.verify(existingToken, process.env.JWT_SECRET);
        existingUserId = decoded.userId;
        console.log(`[API] Existing session detected for userId: ${existingUserId}. Will link ${scraperName}/${username} to this user.`);
      } catch (e) {
        console.log(`[API] Provided token is invalid/expired. Will create or find user normally.`);
      }
    }
    
    // Find User to determine the last sync date for incremental fetching
    // First, try to find by existing userId (if linking), then fall back to bookie/username lookup
    let user = null;
    if (existingUserId) {
      user = await User.findOne({ userId: existingUserId });
      if (user) {
        // Check if this bookie/username combo is already linked
        const alreadyLinked = user.linkedAccounts.some(a => a.bookie === scraperName && normalizeUsername(a.username) === normalizeUsername(username));
        if (!alreadyLinked) {
          user.linkedAccounts.push({ bookie: scraperName, username: username });
          await user.save();
          console.log(`[API] Linked new account ${scraperName}/${username} to existing user ${existingUserId}`);
        } else {
          console.log(`[API] Account ${scraperName}/${username} already linked to user ${existingUserId}`);
        }
      }
    }

    // If no existing user found via token, look up by bookie/username (first-time login)
    if (!user) {
      user = await User.findOne({
        linkedAccounts: {
          $elemMatch: {
            bookie: scraperName,
            username: { $in: [username, normalizeUsername(username)] }
          }
        }
      });
    }
    
    // Default to 0 (fetch all time)
    let lastBetDateMs = 0; 
    if (user) {
        const linkedAcc = user.linkedAccounts.find(a => a.bookie === scraperName && normalizeUsername(a.username) === normalizeUsername(username));
        if (linkedAcc && linkedAcc.lastSync) {
            // Give a 7-day buffer to catch late-settling bets
            lastBetDateMs = linkedAcc.lastSync.getTime() - (7 * 24 * 60 * 60 * 1000);
            if (lastBetDateMs < 0) lastBetDateMs = 0;
            console.log(`[API] Incremental Sync: Found lastSync for ${scraperName}. Setting LAST_BET_DATE_MS to ${new Date(lastBetDateMs).toLocaleString()}`);
        } else {
             console.log(`[API] No previous sync date found for ${scraperName}. Fetching full history.`);
        }
    } else {
        console.log(`[API] New user detected for ${scraperName}. Fetching full history.`);
    }

    // Helper to find or create the user for this bookie/username (used in callbacks)
    const findOrCreateUser = async (sessionToken, userAgent) => {
      let u = null;
      if (existingUserId) {
        u = await User.findOne({ userId: existingUserId });
      }
      
      if (!u) {
        // Find user matching the bookie and username (either format)
        u = await User.findOne({
          linkedAccounts: {
            $elemMatch: {
              bookie: scraperName,
              username: { $in: [username, normalizeUsername(username)] }
            }
          }
        });
      }

      if (!u) {
        // Create new user
        u = new User({
          userId: new mongoose.Types.ObjectId().toString(),
          linkedAccounts: [{
            bookie: scraperName,
            username: username
          }]
        });
        await u.save();
      }

      // Now make sure the account is in the linkedAccounts list
      let accIndex = u.linkedAccounts.findIndex(a => a.bookie === scraperName && normalizeUsername(a.username) === normalizeUsername(username));
      if (accIndex === -1) {
        u.linkedAccounts.push({ bookie: scraperName, username: username });
        accIndex = u.linkedAccounts.length - 1;
        await u.save();
      }

      // Update session info if provided
      let updated = false;
      if (sessionToken) {
        const encrypted = encrypt(sessionToken);
        if (u.linkedAccounts[accIndex].encryptedSessionToken !== encrypted) {
          u.linkedAccounts[accIndex].encryptedSessionToken = encrypted;
          updated = true;
        }
      }
      if (userAgent && u.linkedAccounts[accIndex].userAgent !== userAgent) {
        u.linkedAccounts[accIndex].userAgent = userAgent;
        updated = true;
      }

      if (updated) {
        await u.save();
        console.log(`[API] Updated session token / userAgent for user ${u.userId}`);
      }

      return u;
    };

    const onData = async (batch) => {
      const user = await findOrCreateUser();
      if (user && batch.length > 0) {
        console.log(`[Incremental Sync] Detected batch of ${batch.length} bets.`);
        
        const ops = batch.map(bet => ({
          updateOne: {
            filter: { userId: user.userId, bookie: scraperName, betId: bet.ID || `${bet.Date}-${bet.Stake}` },
            update: { $set: { 
              sportsbookUsername: username, 
              date: bet.Date, 
              stake: cleanNumber(bet.Stake), 
              return: cleanNumber(bet.Return), 
              status: bet.Status, 
              selection: bet.Selection,
              sport: bet.Sport,
              market: bet.Market
            } },
            upsert: true
          }
        }));
        if (ops.length > 0) await Bet.bulkWrite(ops);
      }
    };

    // runScraper now returns the final data but can call our callback early
    runScraper(scraperName, scriptPath, {
      SCRAPER_USERNAME: username,
      SCRAPER_PASSWORD: password,
      LAST_BET_DATE_MS: lastBetDateMs.toString()
    }, progressKey, async (earlySessionToken, earlyUserAgent) => {
      if (loginSent) return;
      loginSent = true;

      // Create/Find User and Generate JWT early
      const user = await findOrCreateUser(earlySessionToken, earlyUserAgent);

      const authToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        message: 'Login successful',
        token: authToken,
        userId: user.userId,
        early: true // Hint to frontend to go to dashboard
      });
    }, onData).then(async (finalData) => {
      // Background Sync Completion
      console.log(`[Background Sync] ${scraperName} finished. Imported ${finalData.totalProcessed} bets.`);
      
      const user = await findOrCreateUser(finalData.sessionToken);
      if (user) {
        // Bulk upsert bets (for any remaining bets not sent via onData)
        const ops = finalData.bets.map(bet => ({
          updateOne: {
            filter: { userId: user.userId, bookie: scraperName, betId: bet.ID || `${bet.Date}-${bet.Stake}` },
            update: { $set: { 
              sportsbookUsername: username, 
              date: bet.Date, 
              stake: cleanNumber(bet.Stake), 
              return: cleanNumber(bet.Return), 
              status: bet.Status, 
              selection: bet.Selection,
              sport: bet.Sport,
              market: bet.Market
            } },
            upsert: true
          }
        }));
        if (ops.length > 0) await Bet.bulkWrite(ops);
        
        // Update lastSync, balance and nickname for this specific linked account
        const accIndex = user.linkedAccounts.findIndex(a => a.bookie === scraperName && normalizeUsername(a.username) === normalizeUsername(username));
        if (accIndex !== -1) {
          // **CRITICAL**: Only update lastSync if the sync was successful (success: true)
          // This prevents incremental sync from skipping bets if a run timeouts/crashes.
          if (finalData.success) {
            user.linkedAccounts[accIndex].lastSync = Date.now();
            user.linkedAccounts[accIndex].syncError = null; // Clear any previous error
            console.log(`[Background Sync] Success: Updated lastSync for ${scraperName}/${username}`);
          } else {
            user.linkedAccounts[accIndex].syncError = `Last sync failed: Scraper error after login.`;
            console.warn(`[Background Sync] Failed/Partial: skipping lastSync update for ${scraperName}/${username}`);
          }
          
          if (finalData.balance !== undefined) user.linkedAccounts[accIndex].balance = finalData.balance;
          if (finalData.nickname) user.linkedAccounts[accIndex].nickname = finalData.nickname;
          await user.save();
        }
      }

      if (!loginSent) {
        loginSent = true;
        const authToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token: authToken, userId: user.userId, count: finalData.bets.length });
      }

      // **CRITICAL FIX**: Remove from activeSyncs when done
      activeSyncs.delete(progressKey);

    }).catch(err => {
      if (progressKey) activeSyncs.delete(progressKey);
      
      // Update DB with a generic sync error
      const scraperName = progressKey.split('_')[0];
      const username = progressKey.split('_')[1];
      User.findOne({
        linkedAccounts: {
          $elemMatch: {
            bookie: scraperName,
            username: { $in: [username, normalizeUsername(username)] }
          }
        }
      }).then(user => {
        if (user) {
          const accIndex = user.linkedAccounts.findIndex(a => a.bookie === scraperName && normalizeUsername(a.username) === normalizeUsername(username));
          if (accIndex !== -1) {
            user.linkedAccounts[accIndex].syncError = `Background sync error: ${err.message}`;
            user.save().catch(e => console.error("Failed to save sync error:", e));
          }
        }
      });

      if (!loginSent) res.status(401).json({ success: false, message: err.message });
      else console.error(`[Background Error] ${err.message}`);
    });

  } catch (error) {
    if (!loginSent) res.status(500).json({ success: false, message: error.message });
  }
});

// --- MANUAL SYNC TRIGGER ---
app.post('/api/sync/trigger', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { forceFullSync } = req.body || {};

  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.linkedAccounts.length === 0) {
      return res.status(400).json({ success: false, message: 'No linked accounts to sync' });
    }

    const triggerResults = [];

    for (const account of user.linkedAccounts) {
      const { bookie, username, encryptedSessionToken, lastSync } = account;
      const scraper = lookupScraper(bookie);
      
      if (!scraper) {
        triggerResults.push({ bookie, username, success: false, message: 'Unsupported bookie' });
        continue;
      }

      const progressKey = `${scraper.name}_${username}`;
      if (activeSyncs.has(progressKey)) {
        triggerResults.push({ bookie, username, success: true, message: 'Sync already in progress' });
        continue;
      }

      const scriptPath = path.join(__dirname, 'scrapers', scraper.path);
      const sessionCookies = decrypt(encryptedSessionToken);
      
      // Default to 7 days before lastSync if it exists, unless forceFullSync is requested
      let lastBetDateMs = 0;
      if (lastSync && !forceFullSync) {
        lastBetDateMs = lastSync.getTime() - (7 * 24 * 60 * 60 * 1000);
        if (lastBetDateMs < 0) lastBetDateMs = 0;
      }

      const envVars = {
        SCRAPER_USERNAME: username,
        LAST_BET_DATE_MS: lastBetDateMs.toString()
      };

      if (sessionCookies) {
        envVars.SCRAPER_COOKIES = sessionCookies;
        if (account.userAgent) {
          envVars.SCRAPER_USER_AGENT = account.userAgent;
        }
      } else {
        triggerResults.push({ bookie, username, success: false, message: 'Session expired. Please login again.' });
        continue;
      }

      // Trigger background sync
      runScraper(scraper.name, scriptPath, envVars, progressKey, 
        null, 
        async (batch) => {
          const u = await User.findOne({ userId: user.userId });
          const ops = batch.map(bet => ({
            updateOne: {
              filter: { userId: u.userId, bookie: scraper.name, betId: bet.ID || `${bet.Date}-${bet.Stake}` },
              update: { $set: { 
                sportsbookUsername: username, 
                date: bet.Date, 
                stake: cleanNumber(bet.Stake), 
                return: cleanNumber(bet.Return), 
                status: bet.Status, 
                selection: bet.Selection,
                sport: bet.Sport,
                market: bet.Market
              } },
              upsert: true
            }
          }));
          if (ops.length > 0) await Bet.bulkWrite(ops);
        }
      ).then(async (finalData) => {
        console.log(`[Manual Sync Trigger] ${scraper.name} finished. success=${finalData.success}`);
        
        const u = await User.findOne({ userId: user.userId });
        const accIndex = u.linkedAccounts.findIndex(a => a.bookie === scraper.name && normalizeUsername(a.username) === normalizeUsername(username));
        if (accIndex !== -1) {
          if (finalData.success) {
            u.linkedAccounts[accIndex].lastSync = Date.now();
            u.linkedAccounts[accIndex].syncError = null;
          } else {
             u.linkedAccounts[accIndex].syncError = `Manual sync failed.`;
          }
          if (finalData.balance !== undefined) u.linkedAccounts[accIndex].balance = finalData.balance;
          if (finalData.nickname) u.linkedAccounts[accIndex].nickname = finalData.nickname;
          await u.save();
        }
        activeSyncs.delete(progressKey);
      }).catch(err => {
        console.error(`[Manual Sync Trigger Error] ${scraper.name}:`, err.message);
        activeSyncs.delete(progressKey);
        User.findOne({ userId: user.userId }).then(u => {
          const accIndex = u.linkedAccounts.findIndex(a => a.bookie === scraper.name && normalizeUsername(a.username) === normalizeUsername(username));
          if (accIndex !== -1) {
            u.linkedAccounts[accIndex].syncError = `Manual sync error: ${err.message}`;
            u.save().catch(e => console.error("Failed to save sync error:", e));
          }
        });
      });

      triggerResults.push({ bookie, username, success: true, message: 'Sync started' });
    }

    res.json({ success: true, results: triggerResults });

  } catch (error) {
    console.error("Manual sync trigger error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- PROGRESS ENDPOINT ---
app.get('/api/progress/:bookie/:username', (req, res) => {
  const { bookie } = req.params;
  const username = normalizeUsername(req.params.username);
  
  const found = lookupScraper(bookie);
  const scraperName = found ? found.name : bookie;

  const key = `${scraperName}_${username}`;
  const status = progressStore[key];
  if (status) {
    res.json({ success: true, progress: status.pct, message: status.msg });
  } else {
    res.json({ success: false, message: 'No active process' });
  }
});

// --- MANUAL SCRAPE ENDPOINT ---
app.get('/api/scrape/:bookie', async (req, res) => {
  const { bookie } = req.params;

  try {
    const selected = lookupScraper(bookie);
    if (!selected) return res.status(400).json({ error: `Unsupported bookie: ${bookie}` });

    const scriptPath = path.join(__dirname, 'scrapers', selected.path);
    const scraperName = selected.name;

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: `Scraper not found: ${scriptPath}` });
    }

    const finalData = await runScraper(scraperName, scriptPath);
    res.json({ success: true, bookie: scraperName, count: finalData.bets.length, data: finalData.bets });

  } catch (error) {
    console.error(`Error scraping ${bookie}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- GET ALL AGGREGATED BETS ---
app.get('/api/bets/all', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const isPoll = req.query.isPoll === 'true';

  try {
    if (!isPoll) {
      console.log(`🔍 [DEBUG] Fetching bets for userId: [${userId}] (type: ${typeof userId})`);
      const count = await Bet.countDocuments({ userId });
      console.log(`🔍 [DEBUG] countDocuments for this userId: ${count}`);
    }
    const bets = await Bet.find({ userId }).sort({ date: -1 });
    const user = await User.findOne({ userId });
    const isSyncing = user?.linkedAccounts.some(acc => {
      const scraper = lookupScraper(acc.bookie);
      const key = `${scraper ? scraper.name : acc.bookie}_${normalizeUsername(acc.username)}`;
      return activeSyncs.has(key);
    }) || false;

    if (!isPoll) {
      console.log(`📊 Found ${bets.length} bets in DB for this query.`);
    }
    const formattedBets = bets.map(b => ({
      ID: b.betId,
      Date: b.date,
      Stake: b.stake,
      Return: b.return,
      Status: b.status,
      Selection: b.selection,
      Sport: b.sport,
      Market: b.market,
      Bookie: b.bookie
    }));

    if (!isPoll) {
      console.log(`📊 Found ${formattedBets.length} bets in DB.`);
    }
    res.json({ success: true, data: formattedBets, isSyncing });
  } catch (error) {
    if (!isPoll) {
      console.error("❌ [API] Fetch Error:", error);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- GET EXISTING BETS (Deprecated due to JWT/MongoDB, keeping for safety) ---
app.get('/api/bets/:bookie', authenticateToken, async (req, res) => {
  const { bookie } = req.params;

  try {
    // Escape special regex chars to prevent injection
    const escapedBookie = bookie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bets = await Bet.find({
      userId: req.user.userId,
      bookie: { $regex: new RegExp(`^${escapedBookie}$`, 'i') }
    }).sort({ date: -1 });

    const formattedBets = bets.map(b => ({
      ID: b.betId,
      Date: b.date,
      Stake: b.stake,
      Return: b.return,
      Status: b.status,
      Selection: b.selection,
      Sport: b.sport,
      Market: b.market,
      Bookie: b.bookie
    }));

    res.json({ success: true, count: formattedBets.length, data: formattedBets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- LIST SCRAPERS ---
app.get('/api/scrapers', (req, res) => {
  const scrapersDir = path.join(__dirname, 'scrapers');
  const scrapers = [];

  if (fs.existsSync(scrapersDir)) {
    const files = fs.readdirSync(scrapersDir);
    const supportedFiles = ['fetchBCgame.js', 'fetchF.js', 'fetchMsportAxios.js', 'fetchFootball.js', 'fetchBetPawa.js', 'fetchBetano.js'];
    files.forEach(file => {
      if (file.endsWith('.js')) {
        scrapers.push({
          name: file.replace('.js', ''),
          file: file,
          supported: supportedFiles.includes(file)
        });
      }
    });
  }
  res.json({ scrapers });
});

// 2. GET API for Sync Status (Lightweight)
app.get('/api/sync/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.json({ success: true, isSyncing: false });

    const isSyncing = user.linkedAccounts.some(acc => {
      // Look up our internal scraper name for this bookie to match progressKey
      const scraper = lookupScraper(acc.bookie);
      const scraperName = scraper ? scraper.name : acc.bookie;
      const key = `${scraperName}_${normalizeUsername(acc.username)}`;
      return activeSyncs.has(key);
    });

    res.json({ success: true, isSyncing });
  } catch (err) {
    res.json({ success: false, isSyncing: false, error: err.message });
  }
});

// --- GET LINKED BOOKIES ---
app.get('/api/user/bookies', authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching bookies for userId:", req.user.userId);
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      console.warn("⚠️ User not found in DB for ID:", req.user.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return detailed account info (bookie + username) for multi-account support
    const accounts = user.linkedAccounts.map(account => ({
      bookie: account.bookie,
      username: account.username,
      lastSync: account.lastSync,
      syncError: account.syncError
    }));
    // Also return just the unique bookie names for backward compatibility
    const bookies = [...new Set(user.linkedAccounts.map(account => account.bookie))];
    res.json({ success: true, bookies, accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GET USER PROFILE (Aggregated) ---
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Aggregate balance from all linked accounts
    const totalBalance = user.linkedAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    // Use the latest or first nickname found
    const nickname = user.linkedAccounts.find(a => a.nickname)?.nickname || 'User';

    res.json({
      success: true,
      balance: totalBalance,
      nickname: nickname,
      accounts: user.linkedAccounts.map(a => ({
        bookie: a.bookie,
        username: a.username,
        balance: a.balance,
        lastSync: a.lastSync,
        syncError: a.syncError
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SERVE REACT FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/api/health', (req, res) => res.json({ status: 'Server running' }));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server starting...`);
  console.log(`PORT env var: ${process.env.PORT}`);
  console.log(`Scraper API server running on http://127.0.0.1:${PORT}`);
});
