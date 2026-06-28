import fs from 'fs';

const filePath = process.argv[2];
const buffer = fs.readFileSync(filePath);

console.log(`Dumping first 10,000 bytes of ${filePath}:`);
process.stdout.write(buffer.slice(0, 10000).toString('utf8').replace(/\0/g, '.'));
