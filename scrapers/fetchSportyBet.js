import { chromium, devices } from 'playwright';
import { cleanMarket } from './utils/marketUtils.js';

const CONFIG = {
    phone: process.env.SCRAPER_USERNAME || '7068639238',
    password: process.env.SCRAPER_PASSWORD || 'Harkins20',
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
};

(async () => {
    console.log("🤖 Launching Playwright (Stealth Intercept)...");
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        ...devices['Pixel 5'], locale: 'en-NG', timezoneId: 'Africa/Lagos'
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    let profileFetched = false;
    let balance = 0;
    let nickname = "User";
    let allBets = [];

    // 📡 INTERCEPTOR
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
                nickname = data?.data?.nickname || data?.data?.firstName || "User";
                console.log("👤 Captured Nickname:", nickname);
            }
            if (url.includes('/api/ng/orders/order/v3/realbetlist')) {
                const data = await response.json();
                const bets = data?.data?.entityList || data?.data?.orders || [];
                processBets(bets);
            }
        } catch (e) {
            // Ignore parse errors for non-target responses
        }
    });

    function processBets(bets) {
        if (!bets || bets.length === 0) return;
        bets.forEach(bet => {
            const betTimeMs = new Date(bet.createTime).getTime();
            if (betTimeMs <= CONFIG.lastBetDateMs) return;

            // Check for duplicates
            if (allBets.some(b => b.ID === bet.shortId)) return;

            const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
            const outcomes = bet.selections || bet.outcomes || bet.orderDetailList || [];
            let sportName = 'Unknown';
            let selectionNames = [];

            if (outcomes.length > 0) {
                const first = outcomes[0].outcome || outcomes[0].selection || outcomes[0];
                const sId = first.sportId;
                if (sId === 'sr:sport:1' || sId === '1') sportName = 'Soccer';
                else if (sId === 'sr:sport:2' || sId === '2') sportName = 'Basketball';
                else sportName = first.sportName || 'Other';
                selectionNames = outcomes.map(o => (o.outcome || o.selection || o).outcomeDesc || 'Selection');
            }

            allBets.push({
                ID: bet.shortId,
                Date: new Date(bet.createTime).toLocaleString(),
                Stake: bet.totalStake,
                Return: bet.totalWinnings,
                Status: statusMap[bet.winningStatus] || 'Settled',
                Selection: selectionNames.join(', '),
                Sport: sportName,
                Market: cleanMarket((outcomes.length > 0) ? (
                    outcomes[0].marketName || 
                    outcomes[0].marketDescription || 
                    (outcomes[0].outcome || outcomes[0].selection || outcomes[0]).marketName || 
                    (outcomes[0].outcome || outcomes[0].selection || outcomes[0]).marketDescription ||
                    'Unknown'
                ) : 'Unknown')
            });
        });
        console.log(`✅ Collected ${allBets.length} bets total...`);
    }

    try {
        console.log("🚪 Connecting to SportyBet...");
        await page.goto('https://www.sportybet.com/ng/m/', { waitUntil: 'networkidle' });

        console.log("👆 Logging in...");
        const loginBtn = page.locator('div[data-op="nav-login"]');
        await loginBtn.waitFor({ state: 'visible', timeout: 30000 });
        await loginBtn.click();

        await page.locator('input[placeholder="Mobile Number"]').fill(CONFIG.phone);
        await page.locator('input[placeholder="Password"]').fill(CONFIG.password);
        
        console.log("⏳ Submitting login and waiting for session...");
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/ng/patron/account/info'), { timeout: 60000 }),
            page.locator('button[data-op="login-btn"]').click()
        ]);
        
        console.log("===LOGIN_SUCCESS===");

        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log("===BEGIN_TOKEN===\n" + cookieString + "\n===END_TOKEN===");
        console.log("===BEGIN_UA===\n" + (await page.evaluate(() => navigator.userAgent)) + "\n===END_UA===");

        console.log("👤 Fetching more profile info...");
        await page.goto('https://www.sportybet.com/ng/m/me', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        console.log(`===BEGIN_PROFILE===\n${nickname}\n===END_PROFILE===`);
        console.log(`===BEGIN_BALANCE===\n${balance}\n===END_BALANCE===`);

        console.log("🚀 Navigating to Bet History...");
        await page.goto('https://www.sportybet.com/ng/m/my_accounts/open_bets/bet_history?isSettled=1', { waitUntil: 'networkidle' });
        
        // Scroll to load more
        console.log("📜 Scrolling to load more history...");
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
        }

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