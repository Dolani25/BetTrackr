import fs from 'fs';

const buffer = fs.readFileSync(process.argv[2]);
console.log(`First 500 bytes of ${process.argv[2]}:`);
let hex = '';
let text = '';
for (let i = 0; i < 500 && i < buffer.length; i++) {
    hex += buffer[i].toString(16).padStart(2, '0') + ' ';
    text += (buffer[i] >= 32 && buffer[i] <= 126) ? String.fromCharCode(buffer[i]) : '.';
    if ((i + 1) % 16 === 0) {
        console.log(`${hex} | ${text}`);
        hex = '';
        text = '';
    }
}
if (hex) {
    console.log(`${hex.padEnd(48)} | ${text}`);
}
