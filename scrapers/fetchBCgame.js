import { chromium, devices } from 'playwright';
import fs from 'fs';

// 🔐 CONFIGURATION
const CONFIG = {
    // BC.Game often uses Email/Phone. Adjust selectors below if needed.
    email: process.env.SCRAPER_USERNAME || 'ccardsec@gmail.com',
    password: process.env.SCRAPER_PASSWORD || '*#Harkins20#*',
    target: 'sports' // 'sports' or 'casino' (BC.Game has two different histories)
};

(async () => {
    console.log("🤖 Launching Playwright (BC.Game Interceptor)...");

    // Launch with a persistent context to save login state if possible
    // We use a real Chrome user agent to avoid bot detection
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 412, height: 915 }, // Pixel 5 size
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
        locale: 'en-NG',
        timezoneId: 'Africa/Lagos'
    });

    const page = await context.newPage();

    //await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort());

    // Store captured bets here
    let capturedBets = [];

    try {
        // --- 1. SETUP NETWORK LISTENER ---
        // We listen for BOTH Sportsbook (sptpub) and Casino (bc.game/api) APIs
        console.log("📡 Network Listener Active. Waiting for bet history...");

        page.on('response', async response => {
            const url = response.url();

            // FILTER: Look for URLs that typically contain bet history
            // 'order' or 'bet' or 'history' in the URL
            // BC Sports uses 'sptpub.com' | BC Casino uses 'bc.game/api'
            if ((url.includes('sptpub.com') && (url.includes('order') || url.includes('history'))) ||
                (url.includes('bc.game/api') && url.includes('bet'))) {

                try {
                    const json = await response.json();

                    // Check if response contains a list of bets
                    const bets = json.data?.orders || json.data?.items || json.data;

                    if (Array.isArray(bets) && bets.length > 0) {
                        console.log(`\n📥 Intercepted Data from: ${url}`);
                        console.log(`   Found ${bets.length} items.`);

                        // Add to our collection
                        bets.forEach(bet => capturedBets.push(normalizeBet(bet)));
                    }
                } catch (e) {
                    // Ignore JSON parse errors (some responses might be blobs)
                }
            }
        });

        // --- 2. LOGIN ROUTINE ---
        console.log("🚪 Connecting to BC.Game...");
        await page.goto('https://bc.game/', { waitUntil: 'domcontentloaded' });

        // Wait for page load
        await page.waitForTimeout(3000);

        // Click Sign In (Try multiple selectors as they change often)
        const loginBtn = page.locator('button:has-text("Sign In"), .login-btn, [data-test="login-btn"]');
        if (await loginBtn.isVisible()) {
            console.log("👆 Clicking Sign In...");
            await loginBtn.first().click();

            // Fill Credentials
            console.log("⌨️ Entering credentials...");
            // Matches any input where the placeholder contains the word "Email"
            await page.getByPlaceholder('Email / Phone Number / Username').fill(CONFIG.email);
            await page.locator('input[type="password"]').fill(CONFIG.password);

            // Click Submit
            await page.locator('button[type="submit"], button.submit').click();

            console.log("⏳ Waiting for login... (Please solve CAPTCHA if it appears)");

            // Wait for user to be logged in (Profile icon appears)
            await page.waitForSelector('.user-info, .wallet-enter, .avatar', { timeout: 60000 });
            console.log("✅ Login Successful!");
        } else {
            console.log("ℹ️ Already logged in (or Sign In button not found).");
        }

        // --- 3. NAVIGATE TO BETS ---
        console.log("🧭 Navigating to Bet History...");

        if (CONFIG.target === 'sports') {
            // Option A: Direct URL (Fastest)
            await page.goto('https://bc.game/sports/my-bets', { waitUntil: 'domcontentloaded' });

            // Option B: UI Navigation (Fallback)
            // Wait for the sportsbook to load
            await page.waitForTimeout(5000);

            // Sometimes "My Bets" is a button in the sports menu
            const myBetsBtn = page.locator('text="My Bets"');
            if (await myBetsBtn.isVisible()) {
                await myBetsBtn.click();
            }
        } else {
            // Casino Bets navigation
            await page.goto('https://bc.game/user/bets', { waitUntil: 'domcontentloaded' });
        }

        // --- 4. SCROLL & CAPTURE ---
        console.log("📜 Scrolling to load more data...");
        // Scroll down a few times to trigger lazy loading API calls
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(2000);
        }

        // Give it a final moment to capture everything
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error("❌ Process Error:", error.message);
    } finally {
        await browser.close();

        // --- 5. SAVE REPORT ---
        if (capturedBets.length > 0) {
            // Remove duplicates based on ID
            const uniqueBets = [...new Map(capturedBets.map(item => [item.ID, item])).values()];

            fs.writeFileSync('bc_game_bets.json', JSON.stringify(uniqueBets, null, 2));
            console.log("\n📊 --- FINAL REPORT ---");
            console.table(uniqueBets.slice(0, 10)); // Show top 10
            console.log(`✅ Saved ${uniqueBets.length} bets to 'bc_game_bets.json'`);
        } else {
            console.log("⚠️ No bets captured. Try increasing the timeout or navigating manually.");
        }
    }
})();

// Helper to normalize data from different BC.Game APIs (Sports vs Casino)
function normalizeBet(bet) {
    // 1. SPORTSBOOK FORMAT (sptpub)
    if (bet.orderId || bet.shortId) {
        let status = bet.status;
        // Map common status codes
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

    // 2. CASINO FORMAT (bc.game internal)
    return {
        ID: bet.id || 'N/A',
        Date: bet.created_at ? new Date(bet.created_at).toLocaleString() : 'N/A',
        Game: bet.game_name || 'Casino Game',
        Stake: bet.amount || 0,
        Return: bet.win_amount || 0,
        Status: (bet.win_amount > 0) ? 'Won' : 'Lost'
    };
}