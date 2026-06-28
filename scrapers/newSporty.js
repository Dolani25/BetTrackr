import { chromium, devices } from 'playwright';
import { cleanMarket } from './utils/marketUtils.js';

const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10),
    pageSize: 50,
};

const STATUS_MAP = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };

function parseBet(bet) {
    const outcomes = bet.selections || bet.outcomes || bet.orderDetailList || [];
    let sportName = 'Unknown';
    let selectionNames = [];
    let market = 'Unknown';

    if (outcomes.length > 0) {
        const first = outcomes[0].outcome || outcomes[0].selection || outcomes[0];
        const sId = first.sportId;
        if (sId === 'sr:sport:1' || sId === '1') sportName = 'Soccer';
        else if (sId === 'sr:sport:2' || sId === '2') sportName = 'Basketball';
        else sportName = first.sportName || 'Other';

        selectionNames = outcomes.map(o =>
            (o.outcome || o.selection || o).outcomeDesc || 'Selection'
        );

        market = cleanMarket(
            outcomes[0].marketDesc ||
            outcomes[0].marketName ||
            outcomes[0].marketDescription ||
            (outcomes[0].outcome || outcomes[0].selection || outcomes[0]).marketDesc ||
            (outcomes[0].outcome || outcomes[0].selection || outcomes[0]).marketName ||
            'Unknown'
        );
    }

    return {
        ID: bet.shortId,
        Date: new Date(bet.createTime).toLocaleString(),
        Stake: bet.totalStake,
        Return: bet.totalWinnings,
        Status: STATUS_MAP[bet.winningStatus] || 'Settled',
        Selection: selectionNames.join(', '),
        Sport: sportName,
        Market: market,
    };
}

// ─── Fetch all pages using Playwright's context.request ───────────────────────
// WHY NOT AXIOS: CloudFront WAF fingerprints the TLS handshake + HTTP/2 header
// order. Node.js HTTP clients (axios/got/undici) have a different fingerprint
// from real Chrome — CloudFront detects this and returns a 403 HTML page even
// with valid session cookies. context.request reuses the live browser's HTTP
// stack (same TLS fingerprint, same HTTP/2 SETTINGS frame, same header order),
// so every request is indistinguishable from a real Chrome browser request.
// Cookies are inherited automatically from the context — no manual cookie
// string needed, no UA spoofing needed.
async function fetchAllBets(context) {
    const allBets = [];
    const seenIds = new Set();
    let lastId = null;
    let page = 0;

    // Only the custom business headers the API requires (from HAR).
    // DO NOT add cookie/user-agent — context handles those automatically.
    const extraHeaders = {
        'clientid': 'wap',
        'operid': '2',
        'platform': 'wap',
        'referer': 'https://www.sportybet.com/ng/m/my_accounts/open_bets/bet_history',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    };

    console.log("🚀 Starting cursor-paginated fetch via context.request...");

    while (true) {
        page++;

        const params = new URLSearchParams({
            pageSize: CONFIG.pageSize,
            isHistory: 0,
            isSettled: 1,
            _t: Date.now(),
            ...(lastId ? { lastId } : {}),
        });

        const url = `https://www.sportybet.com/api/ng/orders/order/v3/realbetlist?${params}`;
        console.log(`📄 Page ${page} — lastId: ${lastId || '(first page)'}`);

        let data;
        let attempts = 0;
        const maxAttempts = 5;
        const retryDelayMs = 5000;
        let success = false;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const res = await context.request.get(url, {
                    headers: extraHeaders,
                    timeout: 20000,
                });

                if (!res.ok()) {
                    const body = await res.text();
                    console.warn(`⚠️ HTTP ${res.status()} on page ${page}. Attempt ${attempts}/${maxAttempts}. Body: ${body.slice(0, 200)}`);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, retryDelayMs));
                    }
                    continue;
                }

                data = await res.json();
                const bizCode = data?.bizCode;
                if (bizCode === 10000 || bizCode === '10000' || bizCode === 0 || bizCode === '0') {
                    success = true;
                    break;
                } else {
                    console.warn(`⚠️ API rate limit or error (bizCode: ${bizCode}, msg: ${data?.message}). Attempt ${attempts}/${maxAttempts}.`);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, retryDelayMs));
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Request failed (${err.message}). Attempt ${attempts}/${maxAttempts}.`);
                if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, retryDelayMs));
                }
            }
        }

        if (!success) {
            console.error(`❌ Exhausted all retry attempts on page ${page}. Final response: ${JSON.stringify(data)}`);
            break;
        }

        const entities = data?.data?.entityList || data?.data?.orders || [];
        if (entities.length === 0) {
            console.log("✅ No more entities — done.");
            break;
        }

        let addedThisPage = 0;
        let hitDateLimit = false;

        for (const bet of entities) {
            const betTimeMs = typeof bet.createTime === 'number' ? bet.createTime : new Date(bet.createTime).getTime();
            if (CONFIG.lastBetDateMs > 0 && betTimeMs <= CONFIG.lastBetDateMs) {
                hitDateLimit = true;
                break;
            }
            if (seenIds.has(bet.shortId)) continue;
            seenIds.add(bet.shortId);
            allBets.push(parseBet(bet));
            addedThisPage++;
        }

        console.log(`   ✔ Added ${addedThisPage} bets (total: ${allBets.length})`);

        if (hitDateLimit) {
            console.log("📅 Reached lastBetDate cutoff — stopping.");
            break;
        }

        const nextLastId = data?.data?.lastId;
        if (!nextLastId) {
            console.log("✅ No nextLastId returned — reached last page.");
            break;
        }
        lastId = nextLastId;

        // Polite delay between pages
        await new Promise(r => setTimeout(r, 300));
    }

    return allBets;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
    console.log("🤖 Launching Playwright...");
    const browser = await chromium.launch({
        headless: true,
        channel: 'msedge',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Context stays open for the entire run — context.request needs it alive.
    const context = await browser.newContext({
        ...devices['Pixel 5'],
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    let balance = 0;
    let nickname = 'User';

    page.on('response', async (response) => {
        const url = response.url();
        try {
            if (url.includes('/api/ng/pocket/v1/wallet/assetsInfo')) {
                const data = await response.json();
                balance = (data?.data?.balance || 0) / 10000;
                console.log("💰 Captured Balance:", balance);
            }
            if (url.includes('/api/ng/patron/account/info')) {
                const data = await response.json();
                nickname = data?.data?.nickname || data?.data?.firstName || 'User';
                console.log("👤 Captured Nickname:", nickname);
            }
        } catch (_) {}
    });

    try {
        console.log("🚪 Connecting to SportyBet...");
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'domcontentloaded' });

        console.log("👆 Logging in...");
        const loginBtn = page.locator('div[data-op="nav-login"]');
        await loginBtn.waitFor({ state: 'visible', timeout: 30000 });
        await loginBtn.click();

        await page.locator('input[placeholder="Mobile Number"]').fill(CONFIG.phone);
        await page.locator('input[placeholder="Password"]').fill(CONFIG.password);

        console.log("⏳ Submitting login...");
        await Promise.all([
            page.waitForResponse(
                res => res.url().includes('/api/ng/patron/account/info'),
                { timeout: 60000 }
            ),
            page.locator('button[data-op="login-btn"]').click(),
        ]);

        console.log("===LOGIN_SUCCESS===");

        // Collect cookies + UA for logging / use by the calling process
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const userAgent = await page.evaluate(() => navigator.userAgent);

        // Navigate to /me to fire balance + profile API calls
        await page.goto('https://www.sportybet.com/ng/m/me', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        console.log("===BEGIN_TOKEN===\n" + cookieString + "\n===END_TOKEN===");
        console.log("===BEGIN_UA===\n" + userAgent + "\n===END_UA===");
        console.log(`===BEGIN_PROFILE===\n${nickname}\n===END_PROFILE===`);
        console.log(`===BEGIN_BALANCE===\n${balance}\n===END_BALANCE===`);

        // Close the page to free memory — the context (and its cookie jar + HTTP
        // stack) stays open so context.request continues to work below.
        await page.close();
        console.log("🔒 Page closed. Fetching bets via context.request...");

        const allBets = await fetchAllBets(context);

        console.log("\n📊 --- FINAL REPORT ---");
        console.log(`✅ Extracted ${allBets.length} new bets.`);
        console.log("===BEGIN_JSON===");
        console.log(JSON.stringify(allBets, null, 2));
        console.log("===END_JSON===");

    } catch (error) {
        console.error(`❌ Process Failed: ${error.message}`);
    } finally {
        await browser.close();
    }
})();