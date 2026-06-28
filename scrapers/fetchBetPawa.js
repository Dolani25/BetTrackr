import { chromium, devices } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 CREDENTIALS
const CONFIG = {
    username: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    maxPages: 100,
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
};

(async () => {
    console.log("🤖 Launching Playwright (BetPawa Internal API)...");

    const browser = await chromium.launch({
        headless: true,
        channel: 'msedge',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
    });

    const page = await context.newPage();

    try {
        if (process.env.SCRAPER_COOKIES) {
            console.log("🍪 Using provided session cookies. Skipping login...");
            const cookieString = process.env.SCRAPER_COOKIES;
            const userAgent = process.env.SCRAPER_USER_AGENT || await page.evaluate(() => navigator.userAgent);
            
            // Try to extract UUID if it was saved in the "cookies" by our server
            let userUuid = process.env.SCRAPER_UUID;
            if (!userUuid) {
                const match = cookieString.match(/userUuid=([^;]+)/);
                if (match) userUuid = match[1];
            }

            console.log("===LOGIN_SUCCESS===");
            console.log("===BEGIN_TOKEN===");
            console.log(cookieString);
            console.log("===END_TOKEN===");
            console.log("===BEGIN_UA===");
            console.log(userAgent);
            console.log("===END_UA===");

            if (userUuid) {
                await fetchBetHistory(userUuid, cookieString, userAgent);
                await browser.close();
                return;
            } else {
                console.log("⚠️ No userUuid found in cookies or env. Proceeding to full login...");
            }
        }

        console.log("🚪 Authenticating with BetPawa API...");

        // We use Playwright to handle the initial visit and ensure cookies are set
        await page.goto('https://www.betpawa.ng/', { waitUntil: 'domcontentloaded' });

        // Direct API Authentication
        const loginUrl = 'https://www.betpawa.ng/api/user/v3/authenticate';
        const loginPayload = {
            username: CONFIG.username,
            password: CONFIG.password,
            rememberMe: true
        };

        const response = await page.evaluate(async ({ url, payload }) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Pawa-Brand': 'betpawa-nigeria',
                    'deviceType': 'smart_phone'
                },
                body: JSON.stringify(payload)
            });
            return res.json();
        }, { url: loginUrl, payload: loginPayload });

        if (!response.userUuid) {
            throw new Error(`Authentication failed: ${JSON.stringify(response)}`);
        }

        const userUuid = response.userUuid;
        console.log(`✅ Logged in successfully! UUID: ${userUuid}`);
        console.log("===LOGIN_SUCCESS===");

        // Extract cookies from browser context after login
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ') + `; userUuid=${userUuid}`;
        const userAgent = await page.evaluate(() => navigator.userAgent);

        console.log("===BEGIN_TOKEN===");
        console.log(cookieString);
        console.log("===END_TOKEN===");
        console.log("===BEGIN_UA===");
        console.log(userAgent);
        console.log("===END_UA===");

        // --- FETCH PROFILE & BALANCE ---
        const nickname = response.firstName || response.username || CONFIG.username;
        const balance = response.balance != null ? (response.balance / 100).toFixed(2) : '0';

        console.log(`===BEGIN_PROFILE===\n${nickname}\n===END_PROFILE===`);
        console.log(`===BEGIN_BALANCE===\n${balance}\n===END_BALANCE===`);

        await browser.close();

        // --- FETCH BET HISTORY ---
        await fetchBetHistory(userUuid, cookieString, userAgent);

    } catch (error) {
        console.error(`❌ Process Failed: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
})();

async function fetchBetHistory(uuid, validCookie, userAgent) {
    console.log("\n🚀 Starting BetPawa History Fetch...");
    let allBetsCount = 0;
    let skip = 0;
    const take = 50;
    let stopFetching = false;
    let pageCount = 0;

    const baseUrl = `https://www.betpawa.ng/api/fixed-odds-bets/v1/betslip/settled?status=ALL&uuid=${uuid}`;

    while (pageCount < CONFIG.maxPages && !stopFetching) {
        try {
            console.log(`📡 Fetching skip=${skip}, take=${take}...`);
            const response = await axios.get(`${baseUrl}&skip=${skip}&take=${take}`, {
                headers: {
                    "User-Agent": userAgent || "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36",
                    "Referer": "https://www.betpawa.ng/completed-bets",
                    "Cookie": validCookie,
                    "Accept": "application/json",
                    "X-Pawa-Brand": "betpawa-nigeria",
                    "deviceType": "smart_phone"
                }
            });

            const bets = response.data?.betslips || [];

            if (!Array.isArray(bets) || bets.length === 0) {
                console.log("ℹ️ No more bets found.");
                break;
            }

            const processedBatch = [];

            for (const bet of bets) {
                const betTimeMs = new Date(bet.placed || bet.date).getTime();
                
                // Incremental Sync Check
                if (CONFIG.lastBetDateMs > 0 && betTimeMs <= CONFIG.lastBetDateMs) {
                    console.log(`🛑 Reached incremental sync boundary (${new Date(betTimeMs).toLocaleString()}). Stopping.`);
                    stopFetching = true;
                    break;
                }

                let status = bet.status || 'Settled';
                if (status === 'WON' || status === 'Won') status = 'Won';
                else if (status === 'LOST' || status === 'Lost') status = 'Lost';

                processedBatch.push({
                    ID: bet.id || bet.uuid,
                    Date: new Date(betTimeMs).toLocaleString(),
                    Stake: bet.stake || bet.amount || 0,
                    Return: bet.payout?.payout || 0,
                    Status: status,
                    Selection: bet.selections ? bet.selections.map(s => s.eventName).join(', ') : 'BetPawa Selection'
                });
            }

            if (processedBatch.length > 0) {
                console.log("===BEGIN_JSON===");
                console.log(JSON.stringify(processedBatch));
                console.log("===END_JSON===");
                allBetsCount += processedBatch.length;
            }

            if (stopFetching) break;
            
            skip += take;
            pageCount++;
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error("💥 History Fetch Error:", error.message);
            break;
        }
    }

    console.log(`\n📊 --- FINAL REPORT ---`);
    console.log(`✅ Processed ${allBetsCount} new bets from BetPawa.`);
}
