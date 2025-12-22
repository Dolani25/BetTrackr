import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';

// 🔐 CREDENTIALS
const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 3
};

(async () => {
    console.log("🤖 Launching Playwright (Fast Mode)...");

    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
        ...devices['Pixel 5'],
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos'
    });

    const page = await context.newPage();

    // ⚡ PERFORMANCE HACK: Set longer timeouts & Block heavy files
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // This blocks images and fonts to make the page load faster
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort());

    try {
        // 1. DIRECT LOGIN PAGE (Updated for Football.com)
        console.log("🚪 Connecting to Login Page...");

        // 'commit' means "As soon as we connect, stop waiting and move on"
        // Updated URL based on HAR file
        await page.goto('https://www.football.com/ng/m/', { waitUntil: 'commit' });

        const loginBtn = page.locator('div[data-op="nav-login"]');
        await loginBtn.waitFor({ state: 'visible', timeout: 60000 });
        await loginBtn.click();

        // 2. INPUT CREDENTIALS
        const phoneInput = page.locator('input[placeholder="Mobile Number"]');
        await phoneInput.waitFor({ state: 'visible', timeout: 30000 });
        await phoneInput.fill(CONFIG.phone);

        // Target Password by placeholder
        await page.locator('input[placeholder="Password"]').fill(CONFIG.password);

        // 3. CLICK LOGIN
        console.log("👆 Clicking Login button...");

        const loginBtn2 = page.locator('button[data-op="login-btn"]');

        await loginBtn2.waitFor({ state: 'visible', timeout: 10000 });
        await loginBtn2.click();

        // --- 🛡️ NEW: POPUP HANDLER ---
        console.log("👀 Checking for annoying popups...");

        try {
            const closePopupBtn = page.locator('.close.icon-font-base').first();
            // Wait briefly to see if it pops up
            await closePopupBtn.waitFor({ state: 'visible', timeout: 5000 }); // Reduced timeout for popup check

            console.log("   👉 Popup detected! Closing it...");
            await closePopupBtn.click();
            await page.waitForTimeout(1000);
        } catch (e) {
            console.log("   ✅ No popup appeared (or I missed it). Continuing...");
        }

        // 4. WAIT FOR SUCCESS
        console.log("⏳ Waiting for redirection to Homepage...");

        // Wait for URL to stabilize or specific element to ensure login success
        await page.waitForTimeout(5000);

        console.log("🔓 Login Successful! (Processing cookies...)");

        // 5. EXTRACT COOKIES
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        await browser.close();

        // --- FETCH API ---
        await fetchHistoryWithCookies(cookieString);

    } catch (error) {
        console.error("❌ Process Failed:", error.message);
        try {
            await page.screenshot({ path: 'fast_error.png' });
            console.log("📸 Saved screenshot to 'fast_error.png'");
        } catch (e) {
            console.log("⚠️ Could not take screenshot (Browser might be closed)");
        }
        if (browser) await browser.close();
    }
})();

// --- API FETCH FUNCTION ---
async function fetchHistoryWithCookies(validCookie) {
    console.log("\n🚀 Starting API Fetch...");
    let lastId = '';
    let allBets = [];
    let pageCount = 0;

    // Updated API Endpoint (v2 instead of v3 based on HAR)
    const baseUrl = "https://www.football.com/api/ng/orders/order/v2/realbetlist";

    while (pageCount < CONFIG.maxPages) {
        try {
            // Updated params based on HAR file analysis
            const params = new URLSearchParams({
                'pageSize': '210',       // Adjusted page size
                'isSettled': '1',       // From HAR
                'isHistory': '0',       // From HAR (appears to be 0 for recent list)
                'onlyWinnings': '0',    // From HAR
                '_t': Date.now()
            });
            if (lastId) params.append('lastId', lastId);

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    // Updated Headers for football.com
                    "clientid": "wap",
                    "operid": "8",      // Changed from 2 to 8 (found in HAR)
                    "platform": "wap",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36",
                    "Referer": "https://www.football.com/ng/m/my_accounts/open_bets/bet_history", // Updated Referer
                    "Cookie": validCookie
                }
            });

            const result = response.data;

            // Check for business code success (usually 10000)
            if (result.bizCode !== 10000) {
                console.error(`API Error: ${result.message || 'Unknown error'}`);
                break;
            }

            // Fallback for list location (v2 might use orders or entityList)
            const bets = result.data.entityList || result.data.orders || [];

            if (bets.length === 0) {
                console.log("ℹ️ No more bets found.");
                break;
            }

            bets.forEach(bet => {
                const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
                let sport = 'Unknown';
                if (bet.outcomes && bet.outcomes.length > 0) {
                    sport = bet.outcomes[0].sportName || 'Unknown';
                }

                allBets.push({
                    ID: bet.shortId,
                    Date: new Date(bet.createTime).toLocaleString(),
                    Stake: bet.totalStake,
                    Return: bet.totalWinnings,
                    Status: statusMap[bet.winningStatus] || bet.winningStatus,
                    Sport: sport
                });
            });

            console.log(`✅ Page ${pageCount + 1}: Found ${bets.length} bets`);

            // Handle pagination
            if (result.data.lastId) {
                lastId = result.data.lastId;
                pageCount++;
            } else {
                break;
            }

            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error("API Error:", error.message);
            break;
        }
    }

    if (allBets.length > 0) {
        fs.writeFileSync('my_bets.json', JSON.stringify(allBets, null, 2));

        console.log("\n📊 --- FINAL REPORT ---");
        console.table(allBets);
        console.log("✅ Data saved to 'my_bets.json'");
    } else {
        console.log("⚠️ No bets retrieved.");
    }
}