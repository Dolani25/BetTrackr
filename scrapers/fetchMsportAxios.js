import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';

// 🔐 CREDENTIALS
const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '9011967988',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 55
};

(async () => {
    // --- PART 1: PLAYWRIGHT LOGIN ---
    console.log("🤖 Launching Playwright (Login Only)...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        ...devices['Pixel 5'],
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos'
    });

    const page = await context.newPage();

    // Set longer timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    let cookieString = "";
    let userAgent = "";

    try {
        console.log("🚪 Connecting to MSport...");
        await page.goto('https://www.msport.com/ng/mobile', { waitUntil: 'domcontentloaded' });

        // Login Flow
        const loginB = page.locator('.m-login-btn');
        await loginB.waitFor({ state: 'visible', timeout: 60000 });
        await loginB.click();

        await page.locator('input[type="tel"], input[placeholder*="Mobile"]').fill(CONFIG.phone);
        await page.locator('input[type="password"]').fill(CONFIG.password);

        console.log("👆 Clicking Login button...");
        await page.locator('.m-login-button').click();

        console.log("⏳ Verifying login...");
        await page.getByText(/my bets/i).first().waitFor({ state: 'visible', timeout: 30000 });
        console.log("✅ Logged in successfully!");

        // 🔐 EXTRACT CREDENTIALS
        const cookies = await context.cookies();
        cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // Get the specific User-Agent the browser was using (important for anti-bot)
        userAgent = await page.evaluate(() => navigator.userAgent);

        console.log("🍪 Cookies & Headers extracted. Closing Browser.");
        await browser.close();

        // --- PART 2: AXIOS FETCH ---
        await fetchWithAxios(cookieString, userAgent);

    } catch (error) {
        console.error("❌ Login Failed:", error.message);
        if (browser) await browser.close();
    }
})();

async function fetchWithAxios(validCookie, userAgent) {
    console.log("\n🚀 Starting Axios Fetch (Real-Sports Endpoint)...");

    let allBets = [];
    let lastOrderId = ''; // Pagination cursor
    let loopCount = 0;

    // ✅ THE CORRECT ENDPOINT (from your logs)
    const baseUrl = "https://www.msport.com/api/ng/orders/real-sports/list";

    while (loopCount < CONFIG.maxPages) {
        try {
            // ✅ THE CORRECT PARAMS (from your logs)
            const params = new URLSearchParams({
                'isSettled': '1',
                'isHistory': '1',
                '_t': Date.now().toString()
            });

            if (lastOrderId) params.append('lastOrderId', lastOrderId);

            console.log(`📡 Fetching Page ${loopCount + 1}...`);

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    // ✅ HEADERS MATCHING YOUR BROWSER LOGS
                    "Host": "www.msport.com",
                    "User-Agent": userAgent,
                    "Cookie": validCookie,
                    "Referer": "https://www.msport.com/ng/mobile/my_bets/history",

                    // Specific App Headers
                    "clientid": "wap",
                    "operid": "2",  // Critical: 2 = MSport NG
                    "platform": "WAP",
                    "apilevel": "2",

                    // Standard Headers
                    "Accept": "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                }
            });

            const result = response.data;

            // Validate Response
            // Usually success is defined by finding the data object
            if (!result.data) {
                console.error(`⚠️ API Returned unexpected structure:`, JSON.stringify(result).substring(0, 100));
                break;
            }

            // Extract List (checking both common locations)
            const bets = result.data.entityList || result.data.orders || [];

            if (bets.length === 0) {
                console.log("ℹ️ No more bets found (List empty).");
                break;
            }

            // Process Bets
            bets.forEach(bet => {
                let statusText = 'Unknown';
                const s = bet.winningStatus;
                if (s === 10) statusText = 'Running';
                else if (s === 20) statusText = 'Won';
                else if (s === 30) statusText = 'Lost';
                else if (s === 40) statusText = 'Void';
                else statusText = s;

                let sport = 'Unknown';
                // MSport typically puts selections in 'outcomes' or 'selections'
                const outcomes = bet.outcomes || bet.selections || [];
                if (outcomes.length > 0) {
                    sport = outcomes[0].sportName || outcomes[0].sportDesc || 'Unknown';
                }

                allBets.push({
                    ID: bet.shortId || bet.orderId,
                    Date: new Date(bet.createTime || bet.orderTime).toLocaleString(),
                    Stake: bet.stake || bet.totalStake,
                    Return: bet.toReturn || bet.totalWinnings || 0,
                    Status: statusText,
                    Sport: sport
                });
            });

            console.log(`✅ Found ${bets.length} bets.`);

            // Update Pagination Cursor
            const lastBet = bets[bets.length - 1];
            if (lastBet && lastBet.orderId) {
                lastOrderId = lastBet.orderId;
            } else {
                break;
            }

            loopCount++;
            // Small delay to prevent rate limiting
            await new Promise(r => setTimeout(r, 100));

        } catch (error) {
            console.error("💥 Axios Error:", error.message);
            if (error.response) {
                console.error("   Server responded:", error.response.status, error.response.statusText);
            }
            break;
        }
    }

    // Save Results
    if (allBets.length > 0) {
        fs.writeFileSync('msport_bets_axios.json', JSON.stringify(allBets, null, 2));

        console.log("\n📊 --- FINAL REPORT ---");
        console.table(allBets);
        console.log(`✅ Data saved to 'msport_bets_axios.json'`);
    } else {
        console.log("⚠️ No bets retrieved.");
    }
}