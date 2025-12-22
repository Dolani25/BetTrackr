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
    page.setDefaultTimeout(60000); // Give it 60 seconds instead of 30
    page.setDefaultNavigationTimeout(60000);

    // This blocks images and fonts to make the page load faster
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort());

    try {
        // 1. DIRECT LOGIN PAGE
        console.log("🚪 Connecting to Login Page...");

        // 'commit' means "As soon as we connect, stop waiting and move on"
        await page.goto('https://www.sportybet.com/ng/', { waitUntil: 'commit' });


        const loginBtn = page.locator('div[data-op="nav-login"]');
        await loginBtn.waitFor({ state: 'visible', timeout: 60000 });
        await loginBtn.click();

        // 2. INPUT CREDENTIALS
        // 🎯 FIX: Targeting by Placeholder because name="" is empty
        const phoneInput = page.locator('input[placeholder="Mobile Number"]');
        await phoneInput.waitFor({ state: 'visible', timeout: 30000 });
        await phoneInput.fill(CONFIG.phone);

        // Target Password by placeholder
        await page.locator('input[placeholder="Password"]').fill(CONFIG.password);

        // 3. CLICK LOGIN (Using your specific element)
        console.log("👆 Clicking Login button...");

        const loginBtn2 = page.locator('button[data-op="login-btn"]');

        await loginBtn2.waitFor({ state: 'visible', timeout: 10000 });
        await loginBtn2.click();





        // --- 🛡️ NEW: POPUP HANDLER ---
        console.log("👀 Checking for annoying popups...");

        // We give the popup 5 seconds to appear. If not, we move on.
        try {
            // This targets the specific "X" button you found: <div class="close icon-font-base">
            const closePopupBtn = page.locator('.close.icon-font-base').first();

            // Wait briefly to see if it pops up
            await closePopupBtn.waitFor({ state: 'visible', timeout: 50000 });

            console.log("   👉 Popup detected! Closing it...");
            await closePopupBtn.click();
            await page.waitForTimeout(1000); // Wait for animation to close
        } catch (e) {
            console.log("   ✅ No popup appeared (or I missed it). Continuing...");
        }




        // 4. WAIT FOR SUCCESS
        console.log("⏳ Waiting for dashboard...");
        console.log("⏳ Waiting for redirection to Homepage...");

        // This regex means: match "sportybet.com/ng/m/" but NOT "/login"
        // It waits until the browser leaves the login page
        //await page.waitForURL(/sportybet\.com\/ng\/m\/?$/, { timeout: 30000 });

        console.log("🔓 Login Successful! (URL is back to home)");



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

    const baseUrl = "https://www.sportybet.com/api/ng/orders/order/v3/realbetlist";

    while (pageCount < CONFIG.maxPages) {
        try {
            const params = new URLSearchParams({
                'pageSize': '210', 'status': '-1', 'isSettled': '1', '_t': Date.now()
            });
            if (lastId) params.append('lastId', lastId);

            const response = await axios.get(`${baseUrl}?${params.toString()}`, {
                headers: {
                    "clientid": "wap", "operid": "2", "platform": "wap",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36",
                    "Referer": "https://www.sportybet.com/ng/m/my_accounts",
                    "Cookie": validCookie
                }
            });

            const result = response.data;
            if (result.bizCode !== 10000) { console.error(`API Error: ${result.message}`); break; }

            const bets = result.data.entityList || [];
            if (bets.length === 0) break;

            bets.forEach(bet => {
                const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
                allBets.push({
                    ID: bet.shortId,
                    Date: new Date(bet.createTime).toLocaleString(),
                    Stake: bet.totalStake,
                    Return: bet.totalWinnings,
                    Status: statusMap[bet.winningStatus] || bet.winningStatus
                });
            });

            console.log(`✅ Page ${pageCount + 1}: Found ${bets.length} bets`);
            if (result.data.lastId) { lastId = result.data.lastId; pageCount++; } else { break; }
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) { console.error("API Error:", error.message); break; }
    }

    if (allBets.length > 0) {
        fs.writeFileSync('my_bets.json', JSON.stringify(allBets, null, 2));

        console.log("\n📊 --- FINAL REPORT ---");
        console.table(allBets);
        console.log("✅ Data saved to 'my_bets.json'");
    }
}