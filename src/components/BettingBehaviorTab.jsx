import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import BettingCalendar from './BettingCalendar';

const BettingBehaviorTab = () => {
  // Reusable shell to avoid squished charts on narrow columns.
  // Ensures a sensible minimum width and enables horizontal scrolling if needed.
  const ChartShell = ({ children, minWidth = 420, height = 320 }) => (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ minWidth }}>
        <ResponsiveContainer width="100%" height={height} minHeight={height}>
          {children}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
  // Sample data for betting patterns
  const timeHeatmapData = [
    { day: 'Mon', hour: 9, bets: 5 }, { day: 'Mon', hour: 12, bets: 8 }, { day: 'Mon', hour: 15, bets: 12 },
    { day: 'Mon', hour: 18, bets: 15 }, { day: 'Mon', hour: 21, bets: 10 },
    { day: 'Tue', hour: 9, bets: 3 }, { day: 'Tue', hour: 12, bets: 6 }, { day: 'Tue', hour: 15, bets: 9 },
    { day: 'Tue', hour: 18, bets: 18 }, { day: 'Tue', hour: 21, bets: 14 },
    { day: 'Wed', hour: 9, bets: 7 }, { day: 'Wed', hour: 12, bets: 11 }, { day: 'Wed', hour: 15, bets: 16 },
    { day: 'Wed', hour: 18, bets: 20 }, { day: 'Wed', hour: 21, bets: 12 },
    { day: 'Thu', hour: 9, bets: 4 }, { day: 'Thu', hour: 12, bets: 9 }, { day: 'Thu', hour: 15, bets: 13 },
    { day: 'Thu', hour: 18, bets: 17 }, { day: 'Thu', hour: 21, bets: 11 },
    { day: 'Fri', hour: 9, bets: 8 }, { day: 'Fri', hour: 12, bets: 14 }, { day: 'Fri', hour: 15, bets: 19 },
    { day: 'Fri', hour: 18, bets: 25 }, { day: 'Fri', hour: 21, bets: 22 },
    { day: 'Sat', hour: 9, bets: 12 }, { day: 'Sat', hour: 12, bets: 18 }, { day: 'Sat', hour: 15, bets: 28 },
    { day: 'Sat', hour: 18, bets: 35 }, { day: 'Sat', hour: 21, bets: 30 },
    { day: 'Sun', hour: 9, bets: 10 }, { day: 'Sun', hour: 12, bets: 16 }, { day: 'Sun', hour: 15, bets: 24 },
    { day: 'Sun', hour: 18, bets: 28 }, { day: 'Sun', hour: 21, bets: 20 }
  ];

  const marketPreferenceData = [
    { market: 'Football', percentage: 45, color: '#FF6B6B' },
    { market: 'Basketball', percentage: 25, color: '#4ECDC4' },
    { market: 'Tennis', percentage: 15, color: '#45B7D1' },
    { market: 'Baseball', percentage: 10, color: '#96CEB4' },
    { market: 'Others', percentage: 5, color: '#FFEAA7' }
  ];

  const stakeDistributionData = [
    { range: '$10-25', frequency: 35, avgWin: 68 },
    { range: '$25-50', frequency: 28, avgWin: 72 },
    { range: '$50-100', frequency: 20, avgWin: 65 },
    { range: '$100-250', frequency: 12, avgWin: 58 },
    { range: '$250+', frequency: 5, avgWin: 45 }
  ];

  const bankrollData = [
    { week: 'W1', bankroll: 5000, highWater: 5200 },
    { week: 'W2', bankroll: 5300, highWater: 5400 },
    { week: 'W3', bankroll: 4900, highWater: 5400 },
    { week: 'W4', bankroll: 5600, highWater: 5600 },
    { week: 'W5', bankroll: 5800, highWater: 5900 },
    { week: 'W6', bankroll: 6100, highWater: 6200 }
  ];

  const betSizeConfidenceData = [
    { confidence: 3, betSize: 25, outcome: 'loss' },
    { confidence: 5, betSize: 50, outcome: 'win' },
    { confidence: 7, betSize: 100, outcome: 'win' },
    { confidence: 4, betSize: 30, outcome: 'loss' },
    { confidence: 8, betSize: 150, outcome: 'win' },
    { confidence: 6, betSize: 75, outcome: 'win' },
    { confidence: 9, betSize: 200, outcome: 'loss' },
    { confidence: 2, betSize: 20, outcome: 'loss' },
    { confidence: 7, betSize: 120, outcome: 'win' },
    { confidence: 5, betSize: 60, outcome: 'win' }
  ];

  const winRateByMarketData = [
    { market: 'Football', winRate: 68 },
    { market: 'Basketball', winRate: 72 },
    { market: 'Tennis', winRate: 65 },
    { market: 'Baseball', winRate: 58 },
    { market: 'Hockey', winRate: 62 }
  ];

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
                <Typography variant="caption" sx={{ color: value > maxBets/2 ? 'white' : 'black' }}>
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
                    <BlockMath math={"f(d, h) = \\sum_{i=1}^{N} 1\\{ bet_i^{(day)} = d, \\ bet_i^{(hour)} = h \\}"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Betting Frequency by Day & Time
                </Typography>
              </MuiTooltip>
              <ChartShell height={350} minWidth={420}>
                <HeatmapGrid />
              </ChartShell>
              <Typography variant="caption" color="textSecondary">
                Darker colors indicate higher betting frequency
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
                    <Typography variant="caption" display="block">where <InlineMath math={"B_m"}/> is bets in market <InlineMath math={"m"}/>.</Typography>
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
                    <BlockMath math={"WR = \\frac{Wins}{Wins + Losses} \\times 100\\%"} />
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
                    <BlockMath math={"DD_t = \\frac{HWM_t - Bankroll_t}{HWM_t}"} />
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
                    <BlockMath math={"betSize = \\alpha + \\beta \\cdot confidence + \\epsilon"} />
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
                    <BlockMath math={"WR_m = \\frac{Wins_m}{Wins_m + Losses_m} \\times 100\\%"} />
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

        {/* Betting Calendar */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <BettingCalendar />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BettingBehaviorTab;

