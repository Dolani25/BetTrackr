import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to run scraper and parse JSON
async function runScraper(scraperName, scriptPath, envVars = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${scraperName} scraper...`);

    // Run the scraper script with environment variables
    const scraper = spawn('node', [scriptPath], {
      env: { ...process.env, ...envVars }
    });
    let output = '';
    let error = '';

    scraper.stdout.on('data', (data) => {
      output += data.toString();
    });

    scraper.stderr.on('data', (data) => {
      error += data.toString();
    });

    scraper.on('close', (code) => {
      if (code !== 0) {
        console.error(`${scraperName} scraper failed:`, error);
        reject(new Error(`${scraperName} scraper failed: ${error}`));
        return;
      }

      // Parse the JSON output file
      let jsonFile;
      switch (scraperName) {
        case 'BC.Game':
          jsonFile = 'bc_game_bets.json';
          break;
        case 'SportyBet':
          jsonFile = 'my_bets.json';
          break;
        case 'MSport':
          jsonFile = 'msport_bets_axios.json';
          break;
        case 'Football':
          jsonFile = 'my_bets.json'; // Same as SportyBet
          break;
        default:
          jsonFile = 'my_bets.json';
      }

      // Check in root first, then scrapers folder
      let jsonPath = path.join(__dirname, jsonFile);
      if (!fs.existsSync(jsonPath)) {
        jsonPath = path.join(__dirname, 'scrapers', jsonFile);
      }

      if (!fs.existsSync(jsonPath)) {
        reject(new Error(`JSON output file not found: ${jsonPath}`));
        return;
      }

      try {
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const bets = JSON.parse(jsonData);
        resolve(bets);
      } catch (err) {
        reject(new Error(`Failed to parse JSON for ${scraperName}: ${err.message}`));
      }
    });
  });
}
// Real Login Endpoint - Triggers Scraper
app.post('/api/login', async (req, res) => {
  const { bookie, username, password } = req.body;
  console.log(`Login attempt for ${bookie}: ${username}`);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  // Map bookie to script
  let scriptPath;
  let scraperName;

  switch (bookie.toLowerCase()) {
    case 'bcgame':
    case 'bc.game':
    case 'fetchbcgame':
      scriptPath = path.join(__dirname, 'scrapers', 'fetchBCgame.js');
      scraperName = 'BC.Game';
      break;
    case 'football.com':
    case 'football':
    case 'fetchfootball':
      scriptPath = path.join(__dirname, 'scrapers', 'fetchFootball.js');
      scraperName = 'Football.com';
      break;
    case 'sportybet':
    case 'fetchf':
      scriptPath = path.join(__dirname, 'scrapers', 'fetchF.js');
      scraperName = 'SportyBet';
      break;
    case 'msport':
    case 'fetchmsportaxios':
      scriptPath = path.join(__dirname, 'scrapers', 'fetchMsportAxios.js');
      scraperName = 'MSport';
      break;
    case 'football':
    case 'fetchfootball':
      scriptPath = path.join(__dirname, 'scrapers', 'fetchFootball.js');
      scraperName = 'Football';
      break;
    default:
      return res.status(400).json({ success: false, message: 'Unsupported bookie' });
  }

  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ success: false, message: 'Scraper script not found' });
  }

  try {
    console.log(`Starting ${scraperName} scraper for ${username}...`);

    // Pass credentials to scraper via environment variables
    const bets = await runScraper(scraperName, scriptPath, {
      SCRAPER_USERNAME: username,
      SCRAPER_PASSWORD: password
    });

    res.json({ success: true, message: 'Login and sync successful', count: bets.length });

  } catch (error) {
    console.error(`Login failed for ${bookie}:`, error);
    res.status(401).json({ success: false, message: `Login failed: ${error.message}` });
  }
});

// API Routes
app.get('/api/scrape/:bookie', async (req, res) => {
  const { bookie } = req.params;

  try {
    let scriptPath;
    let scraperName;

    switch (bookie.toLowerCase()) {
      case 'bcgame':
      case 'bc.game':
      case 'fetchbcgame':
        scriptPath = path.join(__dirname, 'scrapers', 'fetchBCgame.js');
        scraperName = 'BC.Game';
        break;
      case 'sportybet':
      case 'fetchf':
        scriptPath = path.join(__dirname, 'scrapers', 'fetchF.js');
        scraperName = 'SportyBet';
        break;
      case 'msport':
      case 'fetchmsportaxios':
        scriptPath = path.join(__dirname, 'scrapers', 'fetchMsportAxios.js');
        scraperName = 'MSport';
        break;
      case 'football':
      case 'fetchfootball':
        scriptPath = path.join(__dirname, 'scrapers', 'fetchFootball.js');
        scraperName = 'Football';
        break;
      default:
        console.log(`Unsupported bookie requested: ${bookie}`);
        return res.status(400).json({ error: `Unsupported bookie: ${bookie}` });
    }

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: `Scraper not found: ${scriptPath}` });
    }

    const bets = await runScraper(scraperName, scriptPath);
    res.json({
      success: true,
      bookie: scraperName,
      count: bets.length,
      data: bets
    });

  } catch (error) {
    console.error(`Error scraping ${bookie}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get existing bets without scraping
app.get('/api/bets/:bookie', (req, res) => {
  const { bookie } = req.params;
  console.log(`Fetching bets for: ${bookie}`);
  let scraperName;
  let jsonFile;

  switch (bookie.toLowerCase()) {
    case 'bcgame':
    case 'bc.game':
    case 'fetchbcgame':
      scraperName = 'BC.Game';
      jsonFile = 'bc_game_bets.json';
      break;
    case 'sportybet':
    case 'fetchf':
      scraperName = 'SportyBet';
      jsonFile = 'my_bets.json';
      break;
    case 'msport':
    case 'fetchmsportaxios':
      scraperName = 'MSport';
      jsonFile = 'msport_bets_axios.json';
      break;
    case 'football':
    case 'football.com':
    case 'fetchfootball':
      scraperName = 'Football.com';
      jsonFile = 'my_bets.json';
      break;
    default:
      console.log(`Unsupported bookie requested for data: ${bookie}`);
      return res.status(400).json({ error: 'Unsupported bookie' });
  }

  // Check in root first, then scrapers folder
  let jsonPath = path.join(__dirname, jsonFile);
  if (!fs.existsSync(jsonPath)) {
    jsonPath = path.join(__dirname, 'scrapers', jsonFile);
  }

  if (!fs.existsSync(jsonPath)) {
    console.log(`Data file not found: ${jsonPath}`);
    return res.json({ success: true, count: 0, data: [] });
  }

  try {
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const bets = JSON.parse(jsonData);
    console.log(`Sending ${bets.length} bets for ${bookie}`);
    res.json({
      success: true,
      bookie: scraperName,
      count: bets.length,
      data: bets
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all available scrapers
app.get('/api/scrapers', (req, res) => {
  const scrapersDir = path.join(__dirname, 'scrapers');
  const scrapers = [];

  if (fs.existsSync(scrapersDir)) {
    const files = fs.readdirSync(scrapersDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        scrapers.push({
          name: file.replace('.js', ''),
          file: file,
          supported: ['fetchBCgame.js', 'fetchF.js', 'fetchMsportAxios.js', 'fetchFootball.js'].includes(file)
        });
      }
    });
  }

  res.json({ scrapers });
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date().toISOString() });
});

// Mock Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: ${username}`);

  // For demo purposes, accept any login or check specific credentials
  // You can customize this to check against a database or environment variables
  if (username && password) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Catch-all route to serve the React app for any request not handled by the API
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Scraper API server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/scrape/:bookie - Run scraper for specific bookie');
  console.log('  GET /api/scrapers - List available scrapers');
  console.log('  GET /api/health - Health check');
});
