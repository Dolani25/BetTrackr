import fs from 'fs';

function bufferSearch(filePath, keyword) {
    const buffer = fs.readFileSync(filePath);
    const searchBuf = Buffer.from(keyword, 'utf8');

    console.log(`Searching for [${keyword}] in ${filePath}...`);

    let offset = 0;
    let matchCount = 0;

    while (true) {
        const index = buffer.indexOf(searchBuf, offset);
        if (index === -1) break;

        matchCount++;
        console.log(`\nMatch ${matchCount} at offset ${index}:`);

        const start = Math.max(0, index - 50);
        const end = Math.min(buffer.length, index + searchBuf.length + 500);
        const snippet = buffer.slice(start, end);

        console.log(snippet.toString('utf8').replace(/\0/g, '.'));

        offset = index + 1;
        if (matchCount >= 10) break;
    }

    if (matchCount === 0) {
        console.log('No matches found.');
    }
}

bufferSearch(process.argv[2], process.argv[3]);
