import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 SETUP PATHS (Critical for Render)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 CREDENTIALS
const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 3
};

(async () => {
    console.log("🤖 Launching Playwright (Render Optimized)...");

    // 🎯 FIX: Added critical arguments for Docker/Render memory management
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // critical for docker memory
            '--disable-gpu'
        ]
    });

    const context = await browser.newContext({
        ...devices['Pixel 5'],
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos'
    });

    const page = await context.newPage();

    // ⚡ PERFORMANCE: Timeout set to 60s
    page.setDefaultTimeout(60000);

    // Block heavy resources
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort());

    // Monitor for page crashes
    page.on('crash', () => console.error("❌ Page crashed!"));
    page.on('pageerror', (err) => console.error(`❌ Page error: ${err.message}`));
    page.on('requestfailed', request => {
        console.log(`⚠️ Request failed: ${request.url()} ${request.failure()?.errorText}`);
    });

    try {
        // 1. DIRECT LOGIN PAGE
        console.log("🚪 Connecting to Login Page...");
        try {
            await page.goto('https://www.sportybet.com/ng/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (e) {
            throw new Error(`Failed to load login page: ${e.message}`);
        }

        const loginBtn = page.locator('div[data-op="nav-login"]');
        await loginBtn.waitFor({ state: 'visible', timeout: 30000 });
        await loginBtn.click();

        // 2. INPUT CREDENTIALS
        const phoneInput = page.locator('input[placeholder="Mobile Number"]');
        await phoneInput.waitFor({ state: 'visible', timeout: 30000 });
        await phoneInput.fill(CONFIG.phone);

        await page.locator('input[placeholder="Password"]').fill(CONFIG.password);

        // 3. CLICK LOGIN
        console.log("👆 Clicking Login button...");
        const loginBtn2 = page.locator('button[data-op="login-btn"]');
        await loginBtn2.waitFor({ state: 'visible', timeout: 10000 });
        await loginBtn2.click();

        // --- 🛡️ POPUP HANDLER (Optimized) ---
        console.log("👀 Checking for popups (5s check)...");
        try {
            // Reduced timeout from 50s to 5s. 
            // If it doesn't pop up in 5s, it probably won't.
            const closePopupBtn = page.locator('.close.icon-font-base').first();
            await closePopupBtn.waitFor({ state: 'visible', timeout: 5000 });

            console.log("   👉 Popup detected! Closing it...");
            await closePopupBtn.click();
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log("   ✅ No popup detected. Moving on...");
        }

        // 4. WAIT FOR SUCCESS
        console.log("⏳ Waiting for dashboard...");
        // Wait for URL to change back to home (indicates successful login)
        await page.waitForURL(/sportybet\.com\/ng\/m\/?$/, { timeout: 30000 });
        console.log("🔓 Login Successful! (URL is back to home)");

        // 5. EXTRACT COOKIES
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        await browser.close();

        // --- FETCH API ---
        await fetchHistoryWithCookies(cookieString);

    } catch (error) {
        console.error(`❌ Process Failed at step: ${error.stack}`);
        if (browser) await browser.close();
        process.exit(1);
    }
})();

// --- API FETCH FUNCTION ---
async function fetchHistoryWithCookies(validCookie) {
    console.log("\n🚀 Starting API Fetch...");
    let lastId = '';
    let allBets = [];
    let pageCount = 0;

    const baseUrl = "https://www.sportybet.com/api/ng/orders/order/v3/realbetlist";

    while (pageCount < CONFIG.maxPages) {
        try {
            const params = new URLSearchParams({
                'pageSize': '210', 'status': '-1', 'isSettled': '1', '_t': Date.now()
            });
            if (lastId) params.append('lastId', lastId);

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    "clientid": "wap", "operid": "2", "platform": "wap",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36",
                    "Referer": "https://www.sportybet.com/ng/m/my_accounts",
                    "Cookie": validCookie
                }
            });

            const result = response.data;
            if (result.bizCode !== 10000) { console.error(`API Error: ${result.message}`); break; }

            const bets = result.data.entityList || [];
            if (bets.length === 0) break;

            bets.forEach(bet => {
                const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
                allBets.push({
                    ID: bet.shortId,
                    Date: new Date(bet.createTime).toLocaleString(),
                    Stake: bet.totalStake,
                    Return: bet.totalWinnings,
                    Status: statusMap[bet.winningStatus] || bet.winningStatus
                });
            });

            console.log(`✅ Page ${pageCount + 1}: Found ${bets.length} bets`);
            if (result.data.lastId) { lastId = result.data.lastId; pageCount++; } else { break; }
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) { console.error("API Error:", error.message); break; }
    }

    if (allBets.length > 0) {
        // 🎯 FIX: Save to absolute path inside scrapers/ folder
        const outputPath = path.join(__dirname, 'my_bets.json');
        fs.writeFileSync(outputPath, JSON.stringify(allBets, null, 2));

        console.log("\n📊 --- FINAL REPORT ---");
        console.log(`✅ Data saved to '${outputPath}'`);
    } else {
        console.log("⚠️ No bets found to save.");
    }
}
