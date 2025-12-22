const axios = require('axios');

// ⚠️ IMPORTANT: Paste your FULL cookie string here.
// It must include 'accessToken', 'userId', and 'device-id'.
const YOUR_COOKIE = `PASTE_YOUR_FULL_COOKIE_STRING_HERE`;

const CONFIG = {
    // The exact URL found in your HAR file
    baseUrl: "https://www.sportybet.com/api/ng/orders/order/v3/realbetlist",
    cookie: YOUR_COOKIE,
    maxPages: 3
};

async function fetchBetHistory() {
    let lastId = '';
    let allBets = [];
    let pageCount = 0;

    console.log("🚀 Starting extraction using HAR-verified headers...");

    while (pageCount < CONFIG.maxPages) {
        try {
            // These parameters match exactly what your browser sends
            const params = new URLSearchParams({
                'offset': '0',
                'limit': '10',  // Browser asks for 10 at a time
                'status': '-1', // -1 usually means "All" (Settled + Running)
                'isSettled': 'true',
                '_t': Date.now() // Anti-caching timestamp
            });

            if (lastId) {
                params.append('lastId', lastId);
            }

            const response = await axios.get(`${CONFIG.baseUrl}?${params.toString()}`, {
                headers: {
                    // 🛡️ HEADERS EXTRACTED FROM YOUR HAR FILE
                    // These are what trick the server into thinking you are a mobile phone
                    "Host": "www.sportybet.com",
                    "Connection": "keep-alive",
                    "Accept": "application/json, text/plain, */*",
                    "clientid": "wap",     // 🚨 CRITICAL: Identifies as Mobile Web
                    "operid": "2",         // 🚨 CRITICAL: Identifies as Nigeria
                    "platform": "wap",     // 🚨 CRITICAL: Identifies as Mobile Platform
                    "appid": "unknown",    // Found in HAR
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": "https://www.sportybet.com/ng/m/my_accounts", // 🚨 CRITICAL: The page you "came from"
                    "Cookie": CONFIG.cookie
                }
            });

            const result = response.data;

            // Debugging: Print the raw code if it fails
            if (result.bizCode !== 10000) {
                console.error(`❌ API Error: ${result.message} (Code: ${result.bizCode})`);
                if (result.bizCode === 403 || result.bizCode === 401) {
                    console.log("💡 Fix: Your Cookie is expired or invalid. Refresh browser and copy a new one.");
                }
                break;
            }

            const bets = result.data.entityList || [];
            if (bets.length === 0) {
                console.log("🏁 No more bets found.");
                break;
            }

            // Extract Data
            bets.forEach(bet => {
                const statusMap = { 10: 'Running', 20: 'Won/Paid', 30: 'Lost' };
                // Extract Sport (Try outcomes first, then generic fallback)
                let sport = 'Unknown';
                if (bet.outcomes && bet.outcomes.length > 0) {
                    sport = bet.outcomes[0].sportName || 'Unknown';
                }

                allBets.push({
                    ID: bet.shortId,
                    Date: new Date(bet.createTime).toLocaleString(),
                    Stake: `₦${bet.totalStake}`,
                    Return: `₦${bet.totalWinnings}`,
                    Status: statusMap[bet.winningStatus] || bet.winningStatus,
                    Selections: bet.selectionSize,
                    Sport: sport
                });
            });

            console.log(`✅ Page ${pageCount + 1}: Fetched ${bets.length} bets.`);

            // Pagination Logic (SportyBet uses 'lastId' for the next page)
            if (result.data.lastId) {
                lastId = result.data.lastId;
                pageCount++;
            } else {
                break;
            }

            // Polite delay
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error("⚠️ Request Failed:", error.message);
            if (error.response) {
                console.error(`Server Response: ${error.response.status}`);
            }
            break;
        }
    }

    // --- DISPLAY TABLE ---
    if (allBets.length > 0) {
        console.log("\n📊 BETTING HISTORY");
        console.table(allBets);
    }
}

fetchBetHistory();