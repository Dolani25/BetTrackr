import fs from 'fs';
const filePath = 'public/assets/www.sportybet.com3.har';
const data = fs.readFileSync(filePath, 'utf8');
const har = JSON.parse(data);
const urls = har.log.entries
    .filter(e => e.request.url.includes('realbetlist'))
    .map(e => ({
        url: e.request.url.split('?')[1],
        headers: e.request.headers.map(h => `${h.name}: ${h.value}`)
    }));
fs.writeFileSync('har_headers.json', JSON.stringify(urls[0].headers, null, 2));
console.log('Saved to har_headers.json');
