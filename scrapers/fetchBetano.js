import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 CREDENTIALS
const CONFIG = {
    username: process.env.SCRAPER_USERNAME || '',
    password: process.env.SCRAPER_PASSWORD || '',
    maxPages: 3,
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
};

(async () => {
    if (!CONFIG.username || !CONFIG.password) {
        console.error("❌ Error: SCRAPER_USERNAME and SCRAPER_PASSWORD must be set.");
        process.exit(1);
    }

    console.log("🤖 Launching Playwright for Betano...");

    const browser = await chromium.launch({
        headless: false, // 📺 Visible for debugging
        slowMo: 100,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    // Anti-detection script
    await context.addInitScript(() => {
        // Overwrite the `webdriver` property
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

        // Mock chrome object
        window.chrome = { runtime: {} };

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

        // Mock languages
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });

    const page = await context.newPage();

    try {
        if (process.env.SCRAPER_COOKIES) {
            console.log("🍪 Using provided session cookies. Skipping login...");
            const cookieString = process.env.SCRAPER_COOKIES;
            const userAgent = process.env.SCRAPER_USER_AGENT || await page.evaluate(() => navigator.userAgent);

            console.log("===BEGIN_TOKEN===");
            console.log(cookieString);
            console.log("===END_TOKEN===");
            console.log("===BEGIN_UA===");
            console.log(userAgent);
            console.log("===END_UA===");
            console.log("===LOGIN_SUCCESS===");

            await fetchBetHistory(cookieString, userAgent);
            await browser.close();
            return;
        }

        console.log("🚪 Navigating to Betano (Desktop Mode for Stealth)...");
        await page.goto('https://www.betano.ng/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log("✅ Navigation successful.");

        // Wait a bit for JS to render
        await page.waitForTimeout(5000);


        console.log("🧹 Clearing potential blocking modals and banners...");
        await page.evaluate(() => {
            // Remove cookie banners
            const cookieButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('ACCEPT'));
            cookieButtons.forEach(b => b.click());

            // Remove modals/overlays that might block clicks
            const overlays = document.querySelectorAll('[role="dialog"], [data-testid="landing-modal"], .vfm, .lm-fixed, .tw-modal');
            overlays.forEach(el => el.remove());

            // Remove any backdrop/overlay classes from body
            document.body.classList.remove('vfm-open', 'modal-open');
            document.documentElement.style.overflow = 'auto';
            document.body.style.overflow = 'auto';
        });

        await page.waitForTimeout(1000);

        // Try clicking the main login button
        const loginBtnSelector = 'button[data-qa="login-button"], button:has-text("LOGIN")';
        const loginButton = page.locator(loginBtnSelector).first();

        if (await loginButton.isVisible()) {
            console.log("👆 Clicking main Login button...");
            await loginButton.click({ force: true });

            // Wait for the login form to actually appear
            console.log("⌛ Waiting for login form...");
            await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 })
                .catch(e => console.log("⚠️ Login form didn't appear after click, it might be an overlay..."));
            await page.waitForTimeout(1000);
        }

        console.log("⌨️ Filling credentials...");
        // Common selectors for Betano login fields
        const usernameSelectors = ['input[name="username"]', 'input[type="text"]', 'input[placeholder*="Username"]', 'input[placeholder*="Email"]'];
        const passwordSelectors = ['input[name="password"]', 'input[type="password"]', 'input[placeholder*="Password"]'];

        let usernameFilled = false;
        for (const selector of usernameSelectors) {
            try {
                const el = page.locator(selector).first();
                if (await el.isVisible()) {
                    await el.fill(CONFIG.username);
                    usernameFilled = true;
                    break;
                }
            } catch (e) { }
        }

        if (!usernameFilled) {
            console.log("⚠️ Could not find username field by selector, trying generic...");
            await page.locator('input').first().fill(CONFIG.username);
        }

        let passwordFilled = false;
        for (const selector of passwordSelectors) {
            try {
                const el = page.locator(selector).first();
                if (await el.isVisible()) {
                    await el.fill(CONFIG.password);
                    passwordFilled = true;
                    break;
                }
            } catch (e) { }
        }

        if (!passwordFilled) {
            console.log("⚠️ Could not find password field by selector, trying generic...");
            await page.locator('input[type="password"]').fill(CONFIG.password);
        }

        console.log("🚀 Submitting login form...");
        await page.keyboard.press('Enter');

        // Alternatives if Enter doesn't work
        const submitButton = page.locator('button[type="submit"], button:has-text("LOG IN")').first();
        if (await submitButton.isVisible()) {
            await submitButton.click();
        }

        // Wait for login to complete
        console.log("⌛ Waiting for authentication...");
        await page.waitForURL('**/myaccount/**', { timeout: 15000 }).catch(e => console.log("⚠️ URL did not change to myaccount, checking body content..."));
        await page.waitForTimeout(3000); // Buffer for cookies to persist

        // Refresh cookies
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log("===BEGIN_TOKEN===");
        console.log(cookieString);
        console.log("===END_TOKEN===");
        console.log("===BEGIN_UA===");
        console.log(userAgent);
        console.log("===END_UA===");

        // Verify login by checking for a logout button or user profile element
        const loginSuccess = await page.evaluate(() => {
            return document.body.innerText.toLowerCase().includes('logout') ||
                document.body.innerText.toLowerCase().includes('my account') ||
                document.cookie.includes('session') ||
                window.location.href.includes('myaccount');
        });

        if (!loginSuccess) {
            console.log("⚠️ Login might have failed or is taking too long. Proceeding to fetch bets regardless...");
        } else {
            console.log("✅ Logged in successfully!");
            console.log("===LOGIN_SUCCESS===");

            // --- FETCH PROFILE & BALANCE ---
            console.log("💰 Fetching Profile and Balance from UI...");
            const profileData = await page.evaluate(() => {
                const nameEl = document.querySelector('[data-qa="user-profile-button"] .username') || 
                               document.querySelector('.username') ||
                               document.querySelector('.user-info');
                const balEl = document.querySelector('[data-qa="user-balance"]') || 
                              document.querySelector('.balance');
                
                return {
                    nickname: nameEl?.innerText?.trim() || "User",
                    balance: balEl?.innerText?.replace(/[^0-9.]/g, '') || "0"
                };
            });

            console.log(`===BEGIN_PROFILE===\n${profileData.nickname}\n===END_PROFILE===`);
            console.log(`===BEGIN_BALANCE===\n${profileData.balance}\n===END_BALANCE===`);
        }

        // --- FETCH BET HISTORY ---
        await fetchBetHistory(cookieString, userAgent);

        await browser.close();

    } catch (error) {
        console.error(`❌ Process Failed: ${error.message}`);
        try {
            if (page) {
                const screenshotPath = path.join(__dirname, 'betano_error.png');
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`📸 Screenshot saved to ${screenshotPath}`);
            }
        } catch (screenshotError) {
            console.error(`⚠️ Could not capture screenshot: ${screenshotError.message}`);
        }
        if (browser) await browser.close();
        process.exit(1);
    }
})();

async function fetchBetHistory(cookieString, userAgent) {
    console.log("\n🚀 Starting Betano History Fetch...");
    let allBetsCount = 0;
    let stopFetching = false;

    // We focus on settled bets for incremental sync as they won't change after settlement
    // Unsettled bets (open) are usually few and can be fetched separately if needed, 
    // but for history tracking, settled is key.
    const categories = [
        { name: 'Settled', url: "https://www.betano.ng/myaccount/api/ma/bet/bet-history-v3?settled=true" },
        { name: 'Unsettled', url: "https://www.betano.ng/myaccount/api/ma/bet/bet-history-v3?settled=false" }
    ];

    for (const cat of categories) {
        if (stopFetching && cat.name === 'Settled') break; // Only stop the chain if we reached boundary in history
        
        let page = 1;
        let catStop = false;

        while (page <= CONFIG.maxPages && !catStop) {
            try {
                const url = `${cat.url}&page=${page}`;
                console.log(`📡 Fetching ${cat.name} Page ${page}...`);
                
                const response = await axios.get(url, {
                    headers: {
                        "User-Agent": userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                        "Cookie": cookieString,
                        "Accept": "application/json",
                        "Referer": "https://www.betano.ng/myaccount/bet-history"
                    }
                });

                const bets = response.data?.Result?.Bets || [];
                if (bets.length === 0) {
                    console.log(`ℹ️ No more ${cat.name} bets found.`);
                    break;
                }

                const processedBatch = [];

                for (const bet of bets) {
                    const betTimeMs = new Date(bet.PlacingDate || bet.Date).getTime();
                    
                    // Incremental Sync Check (Only for settled history)
                    if (cat.name === 'Settled' && CONFIG.lastBetDateMs > 0 && betTimeMs <= CONFIG.lastBetDateMs) {
                        console.log(`🛑 Reached incremental sync boundary (${new Date(betTimeMs).toLocaleString()}). Stopping.`);
                        catStop = true;
                        stopFetching = true; // Global stop for history
                        break;
                    }

                    let status = bet.StatusText || 'Settled';
                    if (bet.IsWon) status = 'Won';
                    else if (bet.IsLost) status = 'Lost';
                    else if (bet.IsVoid) status = 'Void';

                    processedBatch.push({
                        ID: bet.Id || bet.BetId,
                        Date: new Date(betTimeMs).toLocaleString(),
                        Stake: bet.Stake || 0,
                        Return: bet.PotentialReturn || bet.Payout || 0,
                        Status: status,
                        Selection: bet.BetSettlements ? bet.BetSettlements.map(s => s.MarketName).join(', ') : 'Betano Selection'
                    });
                }

                if (processedBatch.length > 0) {
                    console.log("===BEGIN_JSON===");
                    console.log(JSON.stringify(processedBatch));
                    console.log("===END_JSON===");
                    allBetsCount += processedBatch.length;
                }

                if (catStop) break;
                
                page++;
                await new Promise(r => setTimeout(r, 1000));

            } catch (error) {
                console.error(`💥 History Fetch Error (${cat.name} Page ${page}):`, error.message);
                catStop = true;
            }
        }
    }

    console.log(`\n📊 --- FINAL REPORT ---`);
    console.log(`✅ Processed ${allBetsCount} new bets from Betano.`);
}
