import { chromium, devices } from 'playwright';
import fs from 'fs';

// 🔐 CONFIGURATION
const CONFIG = {
    // BC.Game often uses Email/Phone. Adjust selectors below if needed.
    email: process.env.SCRAPER_USERNAME || 'ccardsec@gmail.com',
    password: process.env.SCRAPER_PASSWORD || '*#Harkins20#*',
    target: 'sports', // 'sports' or 'casino' (BC.Game has two different histories)
    lastBetDateMs: parseInt(process.env.LAST_BET_DATE_MS || "0", 10)
};

(async () => {
    console.log("🤖 Launching Playwright (BC.Game Interceptor)...");

    // Launch with a persistent context to save login state if possible
    // We use a real Chrome user agent to avoid bot detection
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 412, height: 915 }, // Pixel 5 size
        userAgent: process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos'
    });

    const page = await context.newPage();

    // Store captured bets here
    let capturedBets = [];

    try {
        // --- 1. SETUP NETWORK LISTENER ---
        console.log("📡 Network Listener Active. Waiting for bet history...");

        page.on('response', async response => {
            const url = response.url();
            if ((url.includes('sptpub.com') && (url.includes('order') || url.includes('history'))) ||
                (url.includes('bc.game/api') && url.includes('bet'))) {

                try {
                    const json = await response.json();
                    const bets = json.data?.orders || json.data?.items || json.data;

                    if (Array.isArray(bets) && bets.length > 0) {
                        console.log(`\n📥 Intercepted Data from: ${url}`);
                        console.log(`   Found ${bets.length} items.`);

                        bets.forEach(bet => {
                            const normalized = normalizeBet(bet);
                            const originalMs = new Date(bet.createTime || bet.betTime || bet.created_at || 0).getTime();
                            if (originalMs > CONFIG.lastBetDateMs) {
                                capturedBets.push(normalized);
                            }
                        });
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        });

        // --- 2. LOGIN ROUTINE ---
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
        } else {
            console.log("🚪 Connecting to BC.Game...");
            await page.goto('https://bc.game/', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            const loginBtn = page.locator('button:has-text("Sign In"), .login-btn, [data-test="login-btn"]');
            if (await loginBtn.isVisible()) {
                console.log("👆 Clicking Sign In...");
                await loginBtn.first().click();

                console.log("⌨️ Entering credentials...");
                await page.getByPlaceholder('Email / Phone Number / Username').fill(CONFIG.email);
                await page.locator('input[type="password"]').fill(CONFIG.password);
                await page.locator('button[type="submit"], button.submit').click();

                console.log("⏳ Waiting for login... (Please solve CAPTCHA if it appears)");
                await page.waitForSelector('.user-info, .wallet-enter, .avatar', { timeout: 60000 });
                console.log("✅ Login Successful!");
                console.log("===LOGIN_SUCCESS===");

                const cookies = await context.cookies();
                const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                const userAgent = await page.evaluate(() => navigator.userAgent);

                console.log("===BEGIN_TOKEN===");
                console.log(cookieString);
                console.log("===END_TOKEN===");
                console.log("===BEGIN_UA===");
                console.log(userAgent);
                console.log("===END_UA===");
            } else {
                console.log("ℹ️ Already logged in (or Sign In button not found).");
            }

            // --- FETCH PROFILE & BALANCE ---
            console.log("💰 Fetching Profile and Balance from UI...");
            const profileData = await page.evaluate(() => {
                const nameEl = document.querySelector('.user-info .name') || 
                               document.querySelector('.nickname') ||
                               document.querySelector('[class*="UserInfo"] span');
                const balEl = document.querySelector('.balance .amount') || 
                              document.querySelector('[class*="Balance"] span');
                
                return {
                    nickname: nameEl?.innerText?.trim() || "User",
                    balance: balEl?.innerText?.replace(/[^0-9.]/g, '') || "0"
                };
            });

            console.log(`===BEGIN_PROFILE===\n${profileData.nickname}\n===END_PROFILE===`);
            console.log(`===BEGIN_BALANCE===\n${profileData.balance}\n===END_BALANCE===`);
        }

        // --- 3. NAVIGATE TO BETS ---
        console.log("🧭 Navigating to Bet History...");
        if (CONFIG.target === 'sports') {
            await page.goto('https://bc.game/sports/my-bets', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);
            const myBetsBtn = page.locator('text="My Bets"');
            if (await myBetsBtn.isVisible()) await myBetsBtn.click();
        } else {
            await page.goto('https://bc.game/user/bets', { waitUntil: 'domcontentloaded' });
        }

        // --- 4. SCROLL & CAPTURE ---
        console.log("📜 Scrolling to load more data...");
        const maxScrolls = 15; 
        for (let i = 0; i < maxScrolls; i++) {
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(2000);

            if (CONFIG.lastBetDateMs > 0 && capturedBets.length > 0) {
                const oldestInCapture = Math.min(...capturedBets.map(b => new Date(b.Date).getTime()));
                if (oldestInCapture <= CONFIG.lastBetDateMs) {
                    console.log(`🛑 Captured bets reach the incremental boundary. Stopping scroll.`);
                    break;
                }
            }
            console.log(`   Scroll ${i + 1}/${maxScrolls}...`);
        }
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error("❌ Process Error:", error.message);
        process.exit(1);
    } finally {
        await browser.close();

        // --- 5. OUTPUT REPORT ---
        if (capturedBets.length > 0) {
            const uniqueBets = [...new Map(capturedBets.map(item => [item.ID, item])).values()];
            console.log("\n📊 --- FINAL REPORT ---");
            console.log(`✅ Extracted ${uniqueBets.length} bets.`);
            console.log("===BEGIN_JSON===");
            console.log(JSON.stringify(uniqueBets));
            console.log("===END_JSON===");
        } else {
            console.log("⚠️ No bets captured.");
            console.log("===BEGIN_JSON===\n[]\n===END_JSON===");
        }
    }
})();

function normalizeBet(bet) {
    if (bet.orderId || bet.shortId) {
        let status = bet.status;
        if (bet.status === 0) status = 'Running';
        if (bet.status === 1) status = 'Won';
        if (bet.status === 2) status = 'Lost';

        return {
            ID: bet.orderId || bet.shortId,
            Date: new Date(bet.createTime || bet.betTime).toLocaleString(),
            Game: 'Sports',
            Stake: bet.stake || bet.amount,
            Return: bet.winnings || bet.payout || 0,
            Status: status
        };
    }

    return {
        ID: bet.id || 'N/A',
        Date: bet.created_at ? new Date(bet.created_at).toLocaleString() : 'N/A',
        Game: bet.game_name || 'Casino Game',
        Stake: bet.amount || 0,
        Return: bet.win_amount || 0,
        Status: (bet.win_amount > 0) ? 'Won' : 'Lost'
    };
}