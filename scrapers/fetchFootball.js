import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import { cleanMarket } from './utils/marketUtils.js';

// 🔐 CREDENTIALS
const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 100, // Increased to fetch all history
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
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

    // This blocks images to make the page load faster, but allows fonts and SVGs which are required by the loader
    await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort());

    try {
        if (process.env.SCRAPER_COOKIES) {
            console.log("🍪 Using provided session cookies. Skipping login...");
            const cookieString = process.env.SCRAPER_COOKIES;
            const userAgent = process.env.SCRAPER_USER_AGENT || await page.evaluate(() => navigator.userAgent);
            
            console.log("===LOGIN_SUCCESS===");
            console.log("===BEGIN_TOKEN===");
            console.log(cookieString);
            console.log("===END_TOKEN===");
            console.log("===BEGIN_UA===");
            console.log(userAgent);
            console.log("===END_UA===");
            
            await fetchHistoryWithCookies(cookieString, userAgent);
            await browser.close();
            return;
        }

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
        console.log("===LOGIN_SUCCESS===");

        // 5. EXTRACT COOKIES
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const userAgent = await page.evaluate(() => navigator.userAgent);

        console.log("===BEGIN_TOKEN===");
        console.log(cookieString);
        console.log("===END_TOKEN===");
        console.log("===BEGIN_UA===");
        console.log(userAgent);
        console.log("===END_UA===");

        console.log("💰 Fetching Profile and Balance securely via API...");
        let balance = 0;
        let nickname = "Unknown";

        try {
            let csrfToken = '';
            const match = cookieString.match(/csrf-token=([^;]+)/);
            if (match) csrfToken = match[1];

            const apiHeaders = {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "clientid": "wap",
                "operid": "8",
                "platform": "wap",
                "origin": "https://www.football.com",
                "referer": "https://www.football.com/ng/m/my_accounts",
                "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": '"Android"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": userAgent,
                "Cookie": cookieString
            };

            if (csrfToken) {
                apiHeaders["csrf-token"] = csrfToken;
                apiHeaders["content-type"] = "application/json";
            }

            // Fetch Balance
            const balanceResponse = await axios.get(`https://www.football.com/api/ng/pocket/v1/wallet/assetsInfo?_t=${Date.now()}`, {
                headers: apiHeaders
            });
            
            if (balanceResponse.data && balanceResponse.data.data) {
                const rawBalance = balanceResponse.data.data.balance || 0;
                balance = rawBalance / 10000;
            }

            // Fetch Profile
            const profileResponse = await axios.get(`https://www.football.com/api/ng/patron/account/info?_t=${Date.now()}`, {
                headers: apiHeaders
            });

            if (profileResponse.data && profileResponse.data.data) {
                nickname = profileResponse.data.data.nickname || profileResponse.data.data.firstName || "User";
            }

            console.log(`===BEGIN_PROFILE===\n${nickname}\n===END_PROFILE===`);
            console.log(`===BEGIN_BALANCE===\n${balance}\n===END_BALANCE===`);
        } catch (err) {
            console.log("⚠️ Could not fetch balance or profile via API", err.message);
        }

        console.log("\n🚀 Starting Fast Axios Fetch...");
        await browser.close();

        // --- FETCH API ---
        await fetchHistoryWithCookies(cookieString, userAgent);

    } catch (error) {
        console.error("❌ Process Failed:", error.message);
        try {
            await page.screenshot({ path: 'fast_error.png' });
            console.log("📸 Saved screenshot to 'fast_error.png'");
        } catch (e) {
            console.log("⚠️ Could not take screenshot (Browser might be closed)");
        }
        if (browser) await browser.close();
        process.exit(1);
    }
})();

// --- API FETCH FUNCTION ---
async function fetchHistoryWithCookies(validCookie, userAgent) {
    console.log("\n🚀 Starting API Fetch...");
    let allBets = [];
    const seenIds = new Set();
    const modes = ['0', '1'];

    // Updated API Endpoint (v2 instead of v3 based on HAR)
    const baseUrl = "https://www.football.com/api/ng/orders/order/v2/realbetlist";

    for (const isHistory of modes) {
        console.log(`\n--- Fetching Mode: isHistory=${isHistory} ---`);
        let lastId = '';
        let pageCount = 0;

        while (pageCount < CONFIG.maxPages) {
            try {
                // Updated params based on HAR file analysis
                const params = new URLSearchParams({
                    'pageSize': '20',       // Safe page size
                    'isSettled': '1',       // From HAR
                    'isHistory': isHistory, // From HAR
                    'onlyWinnings': '0',    // From HAR
                    '_t': Date.now()
                });
                if (lastId) params.append('lastId', lastId);

                console.log(`📡 Fetching isHistory=${isHistory} page ${pageCount + 1}... (lastId: ${lastId || 'none'})`);

                const reqHeaders = {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "clientid": "wap",
                    "operid": "8",
                    "platform": "wap",
                    "priority": "u=1, i",
                    "referer": "https://www.football.com/ng/m/my_accounts/open_bets/bet_history",
                    "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
                    "sec-ch-ua-mobile": "?1",
                    "sec-ch-ua-platform": '"Android"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "same-origin",
                    "sec-fetch-site": "same-origin",
                    "user-agent": userAgent,
                    "Cookie": validCookie
                };

                // CSRF Handling
                const match = validCookie.match(/csrf-token=([^;]+)/);
                if (match) reqHeaders["csrf-token"] = match[1];

                let response;
                let result;
                let attempts = 0;
                const maxAttempts = 5;
                const retryDelayMs = 5000;

                while (attempts < maxAttempts) {
                    try {
                        attempts++;
                        response = await axios.get(`${baseUrl}?${params.toString()}`, {
                            headers: reqHeaders,
                            timeout: 30000
                        });

                        result = response.data;
                        if (result && result.bizCode === 10000) {
                            break; // Success
                        } else {
                            const errMsg = result ? result.message : 'No data response';
                            const bizCode = result ? result.bizCode : 'N/A';
                            console.warn(`⚠️ API rate limit or error (bizCode: ${bizCode}, msg: ${errMsg}). Attempt ${attempts}/${maxAttempts}. Retrying in 5s...`);
                            if (attempts < maxAttempts) {
                                await new Promise(r => setTimeout(r, retryDelayMs));
                            }
                        }
                    } catch (err) {
                        console.warn(`⚠️ Axios/Network request failed (${err.message}). Attempt ${attempts}/${maxAttempts}. Retrying in 5s...`);
                        if (attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, retryDelayMs));
                        } else if (attempts >= maxAttempts) {
                            // If last attempt failed with network error, throw it so it is caught below
                            throw err;
                        }
                    }
                }

                if (!result || result.bizCode !== 10000) {
                    console.error(`API Error: Exhausted all ${maxAttempts} retry attempts. Final response: ${JSON.stringify(result)}`);
                    break;
                }

                const bets = result.data.entityList || result.data.orders || [];

                if (bets.length === 0) {
                    console.log(`ℹ️ No more bets found for mode ${isHistory}.`);
                    break;
                }

                let stopFetching = false;

                bets.forEach(bet => {
                    if (stopFetching) return;

                    const betTimeMs = new Date(bet.createTime).getTime();
                    if (betTimeMs <= CONFIG.lastBetDateMs) {
                        stopFetching = true;
                        return;
                    }

                    const internalId = bet.orderId || bet.id; // Avoid shortId for deduplication
                    if (internalId && seenIds.has(internalId)) {
                        return;
                    }
                    if (internalId) seenIds.add(internalId);

                    const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
                    // Adoption of a more universal extraction pattern (similar to MSport/SportyBet)
                    const outcomes = bet.selections || bet.outcomes || bet.selectionList || bet.outcomeList || bet.orderDetailList || [];
                    let sport = 'Unknown';
                    let selectionsArr = [];
                    
                    if (outcomes.length > 0) {
                        const first = outcomes[0];
                        const item = first.outcome || first.selection || first;

                        const sId = item.sportId || first.sportId;
                        if (sId === 'sr:sport:1' || sId === '1') sport = 'Soccer';
                        else if (sId === 'sr:sport:2' || sId === '2') sport = 'Basketball';
                        else if (sId === 'sr:sport:5' || sId === '5') sport = 'Tennis';
                        else sport = item.sportName || item.sportDesc || first.sportName || sId || 'Unknown';
                        
                        selectionsArr = outcomes.map(o => {
                            const i = o.outcome || o.selection || o;
                            return i.outcomeDesc || i.outcomeName || i.selectionName || i.selectionDesc || i.marketName || i.marketDesc || 'Selection';
                        });
                    }

                    allBets.push({
                        ID: bet.orderId || bet.shortId, 
                        Date: new Date(bet.createTime).toLocaleString(),
                        Stake: bet.totalStake,
                        Return: bet.totalWinnings,
                        Status: statusMap[bet.winningStatus] || bet.winningStatus,
                        Selection: selectionsArr.join(', '),
                        Sport: sport,
                        Market: cleanMarket((outcomes.length > 0) ? (
                                    (outcomes[0]?.outcome || outcomes[0]?.selection || outcomes[0])?.marketName || 
                                    (outcomes[0]?.outcome || outcomes[0]?.selection || outcomes[0])?.marketDesc || 
                                    (outcomes[0]?.outcome || outcomes[0]?.selection || outcomes[0])?.marketDescription || 
                                    outcomes[0]?.marketName || 'Unknown'
                                ) : 'Unknown')
                    });
                });

                console.log(`✅ Mode ${isHistory} | Page ${pageCount + 1}: Found ${bets.length} bets (${allBets.length} total)`);

                if (stopFetching) {
                    console.log("🛑 Reached previously saved bets. Stopping pagination.");
                    break;
                }

                const nextLastId = bets[bets.length - 1].orderId || bets[bets.length - 1].id;
                
                if (!nextLastId || nextLastId === lastId) {
                    console.log(`ℹ️ Pagination ID did not change or is missing (${nextLastId}). Stopping.`);
                    break;
                }
                
                lastId = nextLastId;
                pageCount++;
                
                if (bets.length < 20) break;

                const delay = 3000 + Math.random() * 2000;
                await new Promise(r => setTimeout(r, delay));

            } catch (error) {
                console.error("API Error:", error.message);
                break;
            }
        }
    }

    if (allBets.length > 0) {
        console.log("\n📊 --- FINAL REPORT ---");
        console.table(allBets);
        console.log(`✅ Extracted ${allBets.length} bets.`);
        console.log("===BEGIN_JSON===");
        console.log(JSON.stringify(allBets));
        console.log("===END_JSON===");
    } else {
        console.log("⚠️ No bets retrieved.");
        console.log("===BEGIN_JSON===");
        console.log("[]");
        console.log("===END_JSON===");
    }
}