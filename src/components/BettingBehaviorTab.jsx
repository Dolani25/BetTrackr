import React from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip } from '@mui/material';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
// import BettingCalendar from './BettingCalendar';

const BettingBehaviorTab = ({ bets }) => {
  const safeBets = Array.isArray(bets) ? bets : [];

  // --- HELPER --
  const cleanNumber = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

  // 1. TIME HEATMAP
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const heatmapCounts = {}; // "Mon-9" -> count
  safeBets.forEach(b => {
    const d = new Date(b.Date);
    if (isNaN(d.getTime())) return;
    const dayName = daysMap[d.getDay()];
    const hour = d.getHours();
    // Bucket into 3-hour windows for the chart categories (9, 12, 15, 18, 21)
    // Or just map nearest. The chart expects specific hours.
    // Let's simplified mapping: <11 -> 9, <14 -> 12, <17 -> 15, <20 -> 18, else 21
    let bucket = 21;
    if (hour < 11) bucket = 9;
    else if (hour < 14) bucket = 12;
    else if (hour < 17) bucket = 15;
    else if (hour < 20) bucket = 18;

    const key = `${dayName}-${bucket}`;
    heatmapCounts[key] = (heatmapCounts[key] || 0) + 1;
  });

  const timeHeatmapData = [];
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
    [9, 12, 15, 18, 21].forEach(hour => {
      timeHeatmapData.push({
        day,
        hour,
        bets: heatmapCounts[`${day}-${hour}`] || 0
      });
    });
  });

  // 2. STAKE DISTRIBUTION
  const stakeBuckets = { '$10-25': { count: 0, wins: 0 }, '$25-50': { count: 0, wins: 0 }, '$50-100': { count: 0, wins: 0 }, '$100-250': { count: 0, wins: 0 }, '$250+': { count: 0, wins: 0 } };
  safeBets.forEach(b => {
    const s = cleanNumber(b.Stake);
    const won = b.Status && b.Status.toLowerCase().includes('won');
    let key = '$250+';
    if (s < 25) key = '$10-25';
    else if (s < 50) key = '$25-50';
    else if (s < 100) key = '$50-100';
    else if (s < 250) key = '$100-250';

    stakeBuckets[key].count++;
    if (won) stakeBuckets[key].wins++;
  });

  const stakeDistributionData = Object.keys(stakeBuckets).map(min => ({
    range: min,
    frequency: stakeBuckets[min].count,
    avgWin: stakeBuckets[min].count ? Math.round((stakeBuckets[min].wins / stakeBuckets[min].count) * 100) : 0
  }));

  // 3. BANKROLL TREND (Simplistic cumulative P&L)
  const sortedBets = [...safeBets].sort((a, b) => new Date(a.Date) - new Date(b.Date));
  let runningBal = 0;
  let maxBal = -Infinity;
  // Group by week approximated by every 10 bets or chunks
  const bankrollPoints = [];
  sortedBets.forEach((b, i) => {
    const s = cleanNumber(b.Stake);
    const r = cleanNumber(b.Return);
    const pnl = r - s; // Net
    runningBal += pnl;
    if (runningBal > maxBal) maxBal = runningBal;

    // Sample points every 10 bets or at end
    if (i % Math.max(1, Math.floor(sortedBets.length / 6)) === 0 || i === sortedBets.length - 1) {
      bankrollPoints.push({
        week: `B${i}`,
        bankroll: runningBal,
        highWater: maxBal
      });
    }
  });
  const bankrollData = bankrollPoints.slice(-10); // Show last 10 points

  // 4. PLACEHOLDERS (Data not available in generic scrape)
  const marketPreferenceData = [
    { market: 'Football', percentage: 100, color: '#FF6B6B' } // Defaulting to football since we mostly scrape football
  ];
  const winRateByMarketData = [
    { market: 'Football', winRate: sortedBets.length ? Math.round((sortedBets.filter(b => b.Status?.toLowerCase().includes('won')).length / sortedBets.length) * 100) : 0 }
  ];
  const betSizeConfidenceData = []; // No confidence data in scrape

  // Create heatmap grid data
  const createHeatmapGrid = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = ['9AM', '12PM', '3PM', '6PM', '9PM'];

    return days.map(day => ({
      day,
      data: hours.map(hour => {
        const hourNum = hour === '9AM' ? 9 : hour === '12PM' ? 12 : hour === '3PM' ? 15 : hour === '6PM' ? 18 : 21;
        const dataPoint = timeHeatmapData.find(d => d.day === day && d.hour === hourNum);
        return dataPoint ? dataPoint.bets : 0;
      })
    }));
  };

  const HeatmapGrid = () => {
    const data = createHeatmapGrid();
    const hours = ['9AM', '12PM', '3PM', '6PM', '9PM'];
    const maxBets = Math.max(...timeHeatmapData.map(d => d.bets));

    return (
      <Box sx={{ p: 2 }}>
        <Box display="flex" mb={1}>
          <Box width={60}></Box>
          {hours.map(hour => (
            <Box key={hour} width={60} textAlign="center">
              <Typography variant="caption">{hour}</Typography>
            </Box>
          ))}
        </Box>
        {data.map(row => (
          <Box key={row.day} display="flex" mb={1}>
            <Box width={60} display="flex" alignItems="center">
              <Typography variant="caption">{row.day}</Typography>
            </Box>
            {row.data.map((value, index) => (
              <Box
                key={index}
                width={50}
                height={30}
                margin={0.5}
                sx={{
                  backgroundColor: `rgba(25, 118, 210, ${value / maxBets})`,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="caption" sx={{ color: value > maxBets / 2 ? 'white' : 'black' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Betting Behavior Analysis
      </Typography>

      <Grid container spacing={3}>
        {/* Betting Frequency Heatmap */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Shows how many bets you place by day of week and hour.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                      Frequency = Count of bets at Day/Hour
                    </Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Betting Frequency by Day & Time (Temporarily Disabled)
                </Typography>
              </MuiTooltip>
              {/* <ChartShell height={350} minWidth={420}>
                <HeatmapGrid />
              </ChartShell> */}
              <Typography variant="caption" color="textSecondary">
                Feature under maintenance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Preference */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Share of your total bets by market.
                    </Typography>
                    <BlockMath math={"p_m = \\frac{B_m}{\\sum_k B_k} \\times 100\\%"} />
                    <Typography variant="caption" display="block">where <InlineMath math={"B_m"} /> is bets in market <InlineMath math={"m"} />.</Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Market Preferences
                </Typography>
              </MuiTooltip>
              <ChartShell height={350} minWidth={420}>
                <PieChart>
                  <defs>
                    <linearGradient id="footballGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#FF6B6B', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#FF8E8E', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="basketballGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#4ECDC4', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#7EDDD6', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="tennisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#45B7D1', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#6BC5DB', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="baseballGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#96CEB4', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#B3D9C6', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="othersGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#FFEAA7', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#FFECB3', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={marketPreferenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="percentage"
                    label={({ market, percentage }) => `${market}: ${percentage}%`}
                    labelLine={false}
                  >
                    <Cell fill="url(#footballGradient)" stroke="#fff" strokeWidth={2} />
                    <Cell fill="url(#basketballGradient)" stroke="#fff" strokeWidth={2} />
                    <Cell fill="url(#tennisGradient)" stroke="#fff" strokeWidth={2} />
                    <Cell fill="url(#baseballGradient)" stroke="#fff" strokeWidth={2} />
                    <Cell fill="url(#othersGradient)" stroke="#fff" strokeWidth={2} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                </PieChart>
              </ChartShell>
            </CardContent>
          </Card>
        </Grid>

        {/* Stake Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Bars show frequency of stakes in each range; line shows win rate.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                      Win Rate = (Wins / Total Bets) * 100%
                    </Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Stake Distribution & Win Rate
                </Typography>
              </MuiTooltip>
              <ChartShell height={320}>
                <BarChart data={stakeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                  <Bar dataKey="frequency" fill="#8884d8" name="Frequency" />
                  <Line type="monotone" dataKey="avgWin" stroke="#82ca9d" name="Win Rate %" />
                </BarChart>
              </ChartShell>
            </CardContent>
          </Card>
        </Grid>

        {/* Bankroll Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Tracks current bankroll versus high-water mark over time.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                      Drawdown from peak
                    </Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Bankroll Management
                </Typography>
              </MuiTooltip>
              <ChartShell height={320}>
                <LineChart data={bankrollData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                  <Line
                    type="monotone"
                    dataKey="bankroll"
                    stroke="#1976d2"
                    strokeWidth={3}
                    name="Current Bankroll"
                  />
                  <Line
                    type="monotone"
                    dataKey="highWater"
                    stroke="#4CAF50"
                    strokeDasharray="5 5"
                    name="High Water Mark"
                  />
                </LineChart>
              </ChartShell>
            </CardContent>
          </Card>
        </Grid>

        {/* Bet Size vs Confidence */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Relationship between your confidence and bet size.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                      Correlation analysis
                    </Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Bet Size vs Confidence Level
                </Typography>
              </MuiTooltip>
              <ChartShell height={320}>
                <ScatterChart data={betSizeConfidenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="confidence" name="Confidence" unit="/10" />
                  <YAxis dataKey="betSize" name="Bet Size" unit="$" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                  <Scatter dataKey="betSize" fill="#8884d8" name="Bets" />
                </ScatterChart>
              </ChartShell>
            </CardContent>
          </Card>
        </Grid>

        {/* Win Rate by Market */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">
                      Win rate per market.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                      Win Ratio %
                    </Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Win Rate by Market
                </Typography>
              </MuiTooltip>
              <ChartShell height={320}>
                <BarChart layout="horizontal" data={winRateByMarketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="market" width={100} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']} />
                  <Legend wrapperStyle={{ textAlign: 'center' }} />
                  <Bar dataKey="winRate" fill="#82ca9d" name="Win Rate %" />
                </BarChart>
              </ChartShell>
            </CardContent>
          </Card>
        </Grid>

        {/* Betting Calendar - TODO: Implement with real data */}
        {/* <Grid item xs={12}>
          <Card>
            <CardContent>
              <BettingCalendar />
            </CardContent>
          </Card>
        </Grid> */}
      </Grid>
    </Box>
  );
};

export default BettingBehaviorTab;

