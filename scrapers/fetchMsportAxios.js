import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';

// 🔐 CREDENTIALS
const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '9011967988',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 55,
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
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
        if (process.env.SCRAPER_COOKIES) {
            console.log("🍪 Using provided session cookies. Skipping login...");
            cookieString = process.env.SCRAPER_COOKIES;
            userAgent = process.env.SCRAPER_USER_AGENT || await page.evaluate(() => navigator.userAgent);

            console.log("===LOGIN_SUCCESS===");
            console.log("===BEGIN_TOKEN===");
            console.log(cookieString);
            console.log("===END_TOKEN===");
            console.log("===BEGIN_UA===");
            console.log(userAgent);
            console.log("===END_UA===");

            await browser.close();
            await fetchWithAxios(cookieString, userAgent);
            return;
        }

        console.log("🚪 Connecting to MSport...");
        await page.goto('https://www.msport.com/ng/mobile', { waitUntil: 'domcontentloaded' });

        // Login Flow
        const loginB = page.locator('.m-login-btn');
        await loginB.waitFor({ state: 'visible', timeout: 60000 });

        // Handle MSport promotional overlays if they appear
        const overlaySelectors = ['.m-bubble-ball-pop-mask', '.tw-overlay', '.m-close-img', '.m-pop-close'];
        for (const selector of overlaySelectors) {
            try {
                const el = page.locator(selector).first();
                if (await el.isVisible()) {
                    console.log(`🛡️ Found blocking overlay (${selector}), attempting to close...`);
                    await el.click({ timeout: 5000 }).catch(() => { });
                }
            } catch (e) { }
        }

        console.log("👆 Clicking Login button (forced)...");
        await loginB.click({ force: true }).catch(async () => {
            // Fallback
            await page.click('.m-login-btn', { force: true });
        });

        await page.locator('input[type="tel"], input[placeholder*="Mobile"]').fill(CONFIG.phone);
        await page.locator('input[type="password"]').fill(CONFIG.password);

        console.log("👆 Clicking Login button...");
        await page.locator('.m-login-button').click();

        console.log("⏳ Verifying login...");
        await page.getByText(/my bets/i).first().waitFor({ state: 'visible', timeout: 30000 });
        console.log("✅ Logged in successfully!");
        console.log("===LOGIN_SUCCESS===");

        // 🔐 EXTRACT CREDENTIALS
        const cookies = await context.cookies();
        cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log("===BEGIN_TOKEN===");
        console.log(cookieString);
        console.log("===END_TOKEN===");
        console.log("===BEGIN_UA===");
        console.log(userAgent);
        console.log("===END_UA===");

        // Get the specific User-Agent the browser was using (important for anti-bot)
        userAgent = await page.evaluate(() => navigator.userAgent);

        console.log("🍪 Cookies & Headers extracted. Closing Browser.");
        await browser.close();

        // --- PART 2: AXIOS FETCH ---
        await fetchWithAxios(cookieString, userAgent);

    } catch (error) {
        console.error("❌ Login Failed:", error.message);
        if (browser) await browser.close();
        process.exit(1);
    }
})();

async function fetchWithAxios(validCookie, userAgent) {
    console.log("\n🚀 Starting Axios Fetch (Real-Sports Endpoint)...");

    // --- FETCH PROFILE & BALANCE ---
    console.log("💰 Fetching Profile and Balance securely via API...");
    let balance = 0;
    let nickname = "User";

    try {
        let csrfToken = '';
        const match = validCookie.match(/csrf-token=([^;]+)/);
        if (match) csrfToken = match[1];

        const apiHeaders = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "clientid": "wap",
            "operid": "2",
            "platform": "wap",
            "origin": "https://www.msport.com",
            "referer": "https://www.msport.com/ng/mobile/me",
            "user-agent": userAgent,
            "Cookie": validCookie
        };

        if (csrfToken) {
            apiHeaders["csrf-token"] = csrfToken;
        }

        // Fetch Balance
        const balanceResponse = await axios.get(`https://www.msport.com/api/ng/pocket/v1/wallet/assetsInfo?_t=${Date.now()}`, {
            headers: apiHeaders
        });
        if (balanceResponse.data && balanceResponse.data.data) {
            const rawBalance = balanceResponse.data.data.balance || 0;
            balance = rawBalance / 10000;
        }

        // Fetch Profile
        const profileResponse = await axios.get(`https://www.msport.com/api/ng/patron/account/info?_t=${Date.now()}`, {
            headers: apiHeaders
        });

        if (profileResponse.data && profileResponse.data.data) {
            nickname = profileResponse.data.data.nickname || profileResponse.data.data.firstName || "User";
        }

        console.log(`===BEGIN_PROFILE===\n${nickname}\n===END_PROFILE===`);
        console.log(`===BEGIN_BALANCE===\n${balance}\n===END_BALANCE===`);
    } catch (err) {
        console.log("⚠️ Could not fetch balance or profile via MSport API", err.message);
    }

    let allBetsCount = 0;
    let lastOrderId = ''; // Pagination cursor
    let loopCount = 0;
    let stopFetching = false;

    // ✅ THE CORRECT ENDPOINT (from your logs)
    const baseUrl = "https://www.msport.com/api/ng/orders/real-sports/list";

    while (loopCount < CONFIG.maxPages && !stopFetching) {
        try {
            // ✅ THE CORRECT PARAMS (from your logs)
            const params = new URLSearchParams({
                'isSettled': '1',
                'isHistory': '1',
                '_t': Date.now().toString()
            });

            if (lastOrderId) params.append('lastOrderId', lastOrderId);

            console.log(`📡 Fetching Page ${loopCount + 1}...`);

            let response;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    response = await axios.get(`${baseUrl}?${params.toString()}`, {
                        headers: {
                            "Host": "www.msport.com",
                            "User-Agent": userAgent,
                            "Cookie": validCookie,
                            "Referer": "https://www.msport.com/ng/mobile/my_bets/history",
                            "clientid": "wap",
                            "operid": "2",
                            "platform": "WAP",
                            "apilevel": "2",
                            "Accept": "application/json, text/plain, */*",
                            "Content-Type": "application/json"
                        },
                        timeout: 15000
                    });
                    break;
                } catch (err) {
                    retryCount++;
                    console.error(`⚠️ API Error on Page ${loopCount + 1} (Attempt ${retryCount}): ${err.message}`);
                    if (retryCount >= maxRetries) throw err;
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            const result = response.data;

            // Validate Response
            if (!result.data) {
                console.error(`⚠️ API Returned unexpected structure:`, JSON.stringify(result).substring(0, 100));
                break;
            }

            // Extract List
            const bets = result.data.entityList || result.data.orders || [];

            if (bets.length === 0) {
                console.log("ℹ️ No more bets found (List empty).");
                break;
            }

            // Process Bets
            if (bets.length > 0 && loopCount === 0) {
                console.log("🐛 DEBUG (First Bet Object):", JSON.stringify(bets[0], null, 2));
            }

            const processedBatch = [];

            for (const bet of bets) {
                // Check Incremental Boundary
                const betTimeMs = bet.createTime || bet.orderTime || bet.createDate;
                if (betTimeMs && CONFIG.lastBetDateMs > 0 && betTimeMs <= CONFIG.lastBetDateMs) {
                    console.log(`🛑 Reached incremental sync boundary (${new Date(betTimeMs).toLocaleString()}). Stopping.`);
                    stopFetching = true;
                    break;
                }

                let statusText = 'Unknown';
                const s = bet.winningStatus;
                if (s === 10) statusText = 'Running';
                else if (s === 20) statusText = 'Won';
                else if (s === 30) statusText = 'Lost';
                else if (s === 40) statusText = 'Void';
                else statusText = s;

                let sport = 'Unknown';
                let market = 'Unknown';
                let selection = 'Unknown';

                const outcomes = bet.outcomes || bet.selections || bet.selectionList || bet.outcomeList || bet.orderDetailList || [];

                if (outcomes.length > 0) {
                    const first = outcomes[0];
                    const item = first.outcome || first.selection || first;
                    const marketRaw = item.marketName || item.marketDesc || item.market || item.marketDescription || first.marketName || first.marketDescription || 'Unknown';

                    const marketMap = {
                        '1': '1X2',
                        '2': 'Double Chance',
                        '10': 'GG/NG',
                        '18': 'Over/Under',
                        '21': 'Draw No Bet',
                        '29': 'Handicap',
                        '16': 'Correct Score',
                        '17': 'Half Time/Full Time'
                    };
                    market = marketMap[marketRaw] || marketRaw;

                    selection = item.selectionName || item.outcomeName || item.selectionDesc ||
                        item.selection || first.selectionName || first.outcomeName ||
                        item.choiceName || first.choiceName || 'Unknown';

                    const sName = item.sportName || item.sportDesc || item.sport || first.sportName;
                    if (sName) {
                        sport = sName;
                    } else {
                        const sId = item.sportId || first.sportId || '';
                        if (sId.includes(':1') || sId === '1') sport = 'Soccer';
                        else if (sId.includes(':2') || sId === '2') sport = 'Basketball';
                        else if (sId.includes(':5') || sId === '5') sport = 'Tennis';
                        else sport = sId || 'Unknown';
                    }

                    if (outcomes.length > 1 && selection !== 'Unknown') {
                        selection = `${selection} + ${outcomes.length - 1} more`;
                    }
                } else if (bet.betContent) {
                    selection = bet.betContent;
                }

                processedBatch.push({
                    ID: bet.shortId || bet.orderId,
                    Date: new Date(betTimeMs).toLocaleString(),
                    Stake: bet.stake || bet.totalStake || 0,
                    Return: bet.toReturn || bet.totalWinnings || bet.winnings || 0,
                    Status: statusText,
                    Sport: sport,
                    Market: market,
                    Selection: selection
                });
            }

            if (processedBatch.length > 0) {
                console.log("===BEGIN_JSON===");
                console.log(JSON.stringify(processedBatch));
                console.log("===END_JSON===");
                allBetsCount += processedBatch.length;
            }

            console.log(`✅ Found ${bets.length} bets.`);

            if (stopFetching) break;

            // Update Pagination Cursor
            const lastBet = bets[bets.length - 1];
            if (lastBet && lastBet.orderId) {
                lastOrderId = lastBet.orderId;
            } else {
                break;
            }

            loopCount++;
            await new Promise(r => setTimeout(r, 100));

        } catch (error) {
            console.error("💥 Axios Error:", error.message);
            break;
        }
    }

    console.log(`\n📊 --- FINAL REPORT ---`);
    console.log(`✅ Processed ${allBetsCount} new bets.`);
}