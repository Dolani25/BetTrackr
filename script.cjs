const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'OverviewTab.jsx');
let code = fs.readFileSync(filePath, 'utf8');

function getBlock(startStr, endStr) {
    const startIdx = code.indexOf(startStr);
    if (startIdx === -1) throw new Error("Could not find start: " + startStr);
    const endIdx = code.indexOf(endStr, startIdx);
    if (endIdx === -1) throw new Error("Could not find end: " + endStr);
    return code.slice(startIdx, endIdx);
}

const lineChart = getBlock('{/* Line Chart */}', '<div id="Donut"');
const donutChart = getBlock('<div id="Donut"', '<div style={{\n          marginTop: "3vmin"');
const timeSeries = getBlock('<div style={{\n          marginTop: "3vmin"', '      </Box>\n    </Box>\n  );\n};');

// 1. Remove RESTORED CHARTS SECTION completely
const restoredStart = code.indexOf('{/* --- RESTORED CHARTS SECTION --- */}');
const restoredEnd = code.indexOf('    </Box>\n  );\n};', restoredStart);
code = code.slice(0, restoredStart) + code.slice(restoredEnd);

// 2. Insert Line Chart at the top of the Grid
const gridOpen = code.indexOf('{/* We will move the Line Chart here shortly */}');
const lineChartGridItem = `
        {/* Row 1: Full Width Line Chart */}
        <Grid size={{ xs: 12 }}>
${lineChart}        </Grid>
`;
code = code.replace('{/* We will move the Line Chart here shortly */}', lineChartGridItem);

// 3. Insert Donut Chart after Monthly P&L
const monthlyPLEnd = code.indexOf('        {/* Row 3: Bet Amount Distribution and Market Analysis */}');
const donutChartGridItem = `
        <Grid size={{ xs: 12, md: 6 }}>
${donutChart}        </Grid>

`;
code = code.slice(0, monthlyPLEnd) + donutChartGridItem + code.slice(monthlyPLEnd);

// 4. Insert Time Series after Market Analysis
// Find end of Market Analysis which is before the end of the Grid container.
const marketAnalysisStart = code.indexOf('{/* Market Analysis (Sport Breakdown) */}');
const marketAnalysisEnd = code.indexOf('      </Grid>\n\n      {/* Custom Cards */}'); // Wait, Custom Cards were moved above!
// So what comes after Market analysis? The Grid closes, then the outer Box closes.
// Wait, the Charts Section Grid closes right here:
const chartsGridClose = code.indexOf('      </Grid>', marketAnalysisStart);
const timeSeriesGridItem = `
        {/* Row 4: Full Width Time Series */}
        <Grid size={{ xs: 12 }}>
${timeSeries}        </Grid>
`;
code = code.slice(0, chartsGridClose) + timeSeriesGridItem + '\n' + code.slice(chartsGridClose);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Success');
