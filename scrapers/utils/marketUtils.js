/**
 * Utility to clean and normalize betting market names.
 * Designed to remove team names, event specifics, and handle variations
 * to group them into standard market categories (e.g., 1x2, Double Chance, Over/Under).
 * 
 * @param {string} rawMarket - The raw market name directly from the scraper.
 * @returns {string} - The cleaned, standardized market name.
 */
function cleanMarket(rawMarket) {
    if (!rawMarket || rawMarket === 'Unknown') return 'Unknown';
    
    let m = rawMarket.trim();

    // 1. Remove obvious separators that often prefix team names
    // Example: "Chelsea - 1X2" -> "1X2"
    // Example: "Man Utd vs Arsenal : Double Chance" -> "Double Chance"
    if (m.includes(' - ')) {
        const parts = m.split(' - ');
        // Usually the market is the last part, but let's be smart
        m = parts[parts.length - 1].trim();
    }
    if (m.includes(' : ')) {
        const parts = m.split(' : ');
        m = parts[parts.length - 1].trim();
    }

    // 2. Standardize common formats using regex/includes
    const lowerM = m.toLowerCase();

    // Match variations of 1X2 / Match Winner
    if (lowerM === '1x2' || lowerM === 'match winner' || lowerM === '1 x 2' || lowerM === 'winner') return '1X2';
    if (lowerM.includes('1x2 - ')) return '1X2'; 
    if (lowerM.includes('1st half result or match result') || lowerM.includes('winner (incl. overtime)')) return '1X2';
    
    // Match Double Chance & Combinations
    if (lowerM.includes('draw or gg')) return 'Double Chance / BTTS';
    if (lowerM.includes('double chance') || lowerM === 'dc') return 'Double Chance';

    // Match Over/Under Goals (Total Goals)
    if (lowerM.includes('over/under') || lowerM.includes('over / under') || lowerM.includes('total goals') || lowerM === 'o/u' || lowerM.includes('over ') || lowerM.includes('under ')) return 'Over/Under';
    if (lowerM.includes('total (incl. overtime')) return 'Over/Under';

    // Match Team specific goals 
    if (lowerM.includes('home team to score') || lowerM.includes('away team to score') || lowerM.includes('team to score')) return 'Team Goals';

    // Match Both Teams to Score (GG/NG)
    if (lowerM.includes('both teams to score') || lowerM === 'gg/ng' || lowerM === 'btts' || lowerM === 'goal / no goal' || lowerM.includes('gg / ng')) return 'GG/NG';

    // Match Draw No Bet
    if (lowerM.includes('draw no bet') || lowerM === 'dnb') return 'Draw No Bet';

    // Match Handicap
    if (lowerM.includes('handicap') || lowerM.includes('hc') || lowerM.includes('hcp')) return 'Handicap';

    // Match Half Time / Full Time
    if (lowerM.includes('half time/full time') || lowerM === 'ht/ft') return 'HT/FT';

    // Match Correct Score
    if (lowerM.includes('correct score') || lowerM.includes('exact score') || lowerM.includes('match to end')) return 'Correct Score';
    
    // Match Corners
    if (lowerM.includes('corner')) return 'Corners';

    // Match Cards/Bookings
    if (lowerM.includes('card') || lowerM.includes('booking')) return 'Cards';
    
    // Match odd/even
    if (lowerM.includes('odd/even') || lowerM.includes('odd / even')) return 'Odd/Even';

    // 3. Fallback: just return what's left after stripping prefixes
    // If it's still very long (likely containing team names without a clear separator),
    // we might just return the raw or a truncated version, but splitting by '-' usually covers it.
    
    // Capitalize first letter of each word if we fall back
    return m.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export { cleanMarket };
