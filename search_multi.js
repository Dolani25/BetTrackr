import fs from 'fs';

function bufferSearchWords(filePath, words) {
    const buffer = fs.readFileSync(filePath);
    console.log(`Searching for lines containing ALL of: [${words.join(', ')}] in ${filePath}...`);

    const content = buffer.toString('utf8');
    const lines = content.split('\n');
    let matchCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (words.every(word => line.includes(word))) {
            matchCount++;
            console.log(`\nMatch ${matchCount} at line ${i + 1}:`);
            console.log(line.trim().substring(0, 1000));
            if (matchCount >= 20) break;
        }
    }

    if (matchCount === 0) {
        console.log('No matches found.');
    }
}

const args = process.argv.slice(2);
const filePath = args[0];
const words = args.slice(1);
bufferSearchWords(filePath, words);
