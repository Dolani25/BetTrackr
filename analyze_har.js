import fs from 'fs';

function analyze(filePath, keyword) {
    console.log(`Analyzing ${filePath} for keyword: ${keyword}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = data.log.entries;

    const results = entries.filter(entry => {
        const url = entry.request.url;
        const method = entry.request.method;
        const body = entry.request.postData ? entry.request.postData.text : '';
        const responseText = entry.response.content.text || '';
        const matchesKeyword = url.includes(keyword) || body.includes(keyword) || responseText.includes(keyword);
        if (keyword === 'POST' || keyword === 'GET') {
            return method === keyword;
        }
        return matchesKeyword;
    });

    console.log(`Found ${results.length} matches.`);
    results.forEach((entry, index) => {
        console.log(`\n--- Match ${index + 1} ---`);
        console.log(`URL: ${entry.request.method} ${entry.request.url}`);
        console.log(`Headers: ${JSON.stringify(entry.request.headers, null, 2)}`);
        if (entry.request.postData) {
            console.log(`Post Data: ${entry.request.postData.text}`);
        }
        console.log(`Response Status: ${entry.response.status}`);
        console.log(`Response Content: ${entry.response.content.text ? entry.response.content.text.substring(0, 500) : 'N/A'}`);
    });
}

const file = process.argv[2];
const kw = process.argv[3];
analyze(file, kw);
