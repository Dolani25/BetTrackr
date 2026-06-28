import fs from 'fs';
import readline from 'readline';

async function dumpFirstLines(filePath, count = 20) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log(`Dumping first ${count} lines of ${filePath}:`);
    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        console.log(`${lineNumber}: ${line.trim()}`);
        if (lineNumber >= count) break;
    }
}

async function search() {
    const filePath = process.argv[2];
    const keyword = process.argv[3];

    if (keyword === '--dump') {
        await dumpFirstLines(filePath);
        return;
    }

    if (!filePath || !keyword) {
        console.error('Usage: node search_raw.js <file> <keyword> | --dump');
        process.exit(1);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log(`Searching ${filePath} for "${keyword}" (case-insensitive)...`);
    let lineNumber = 0;
    let matchCount = 0;

    const lowerKeyword = keyword.toLowerCase();

    for await (const line of rl) {
        lineNumber++;
        if (line.toLowerCase().includes(lowerKeyword)) {
            matchCount++;
            console.log(`\nMatch ${matchCount} at line ${lineNumber}:`);
            console.log(line.trim().substring(0, 1000));
            if (matchCount >= 50) {
                console.log('\nStopping after 50 matches.');
                break;
            }
        }
    }

    if (matchCount === 0) {
        console.log('No matches found.');
    } else {
        console.log(`\nFound ${matchCount} matches.`);
    }
}

search().catch(err => {
    console.error(err);
    process.exit(1);
});
