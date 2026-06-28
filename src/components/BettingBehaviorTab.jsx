import React from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip, useMediaQuery, useTheme, Chip } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { sanitizeChartData } from '../utils/chartUtils';
import { cleanMarket } from '../utils/marketUtils';
import { HelpCircle, Zap } from 'lucide-react';
import BettingCalendar from './BettingCalendar';

const ClickableInfoTooltip = ({ title, content, children, color = 'inherit' }) => {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef(null);

  const handleOpen = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    handleOpen();
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, 3000);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="inherit" component="span">{title}</Typography>
      <MuiTooltip
        title={content}
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        arrow
        placement="top"
        disableFocusListener
        disableTouchListener
        enterTouchDelay={0}
      >
        <Box
          component="span"
          onClick={handleClick}
          sx={{
            display: 'flex',
            cursor: 'help',
            opacity: 0.7,
            '&:hover': { opacity: 1 }
          }}
        >
          <HelpCircle size={14} color={color} />
        </Box>
      </MuiTooltip>
      {children}
    </Box>
  );
};

const BettingBehaviorTab = ({ bets, isSyncing = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const safeBets = Array.isArray(bets) ? bets : [];

  // --- HELPER --
  const cleanNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

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
  const stakeBuckets = { '₦10-25': { count: 0, wins: 0 }, '₦25-50': { count: 0, wins: 0 }, '₦50-100': { count: 0, wins: 0 }, '₦100-250': { count: 0, wins: 0 }, '₦250+': { count: 0, wins: 0 } };
  safeBets.forEach(b => {
    const s = cleanNumber(b.Stake);
    const won = b.Status && b.Status.toLowerCase().includes('won');
    let key = '₦250+';
    if (s < 25) key = '₦10-25';
    else if (s < 50) key = '₦25-50';
    else if (s < 100) key = '₦50-100';
    else if (s < 250) key = '₦100-250';

    stakeBuckets[key].count++;
    if (won) stakeBuckets[key].wins++;
  });

  const stakeDistributionData = Object.keys(stakeBuckets).map(min => {
    const rawAvg = stakeBuckets[min].count ? (stakeBuckets[min].wins / stakeBuckets[min].count) * 100 : 0;
    return {
      range: min,
      frequency: stakeBuckets[min].count,
      avgWin: isFinite(rawAvg) ? Math.round(rawAvg) : 0
    };
  });

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

  // 4. DYNAMIC DATA CALCULATIONS
  const marketCounts = {};
  const marketWins = {};

  safeBets.forEach(b => {
    // Prefer Market field if available, otherwise use Sport
    const baseMarket = b.Market && b.Market !== 'Unknown' ? b.Market : (b.Sport || 'Unknown');
    const market = cleanMarket(baseMarket);
    const won = b.Status && b.Status.toLowerCase().includes('won');

    marketCounts[market] = (marketCounts[market] || 0) + 1;
    if (won) {
      marketWins[market] = (marketWins[market] || 0) + 1;
    }
  });

  const totalBetsForMarket = Object.values(marketCounts).reduce((a, b) => a + b, 0);
  const marketPreferenceData = Object.keys(marketCounts).map((market, index) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#A29BFE'];
    return {
      market,
      percentage: Math.round((marketCounts[market] / totalBetsForMarket) * 100),
      color: colors[index % colors.length]
    };
  });

  const winRateByMarketData = Object.keys(marketCounts).map(market => ({
    market,
    winRate: Math.round((marketWins[market] || 0) / marketCounts[market] * 100)
  }));

  // 5. BET SIZE VS CONFIDENCE (Stake as Proxy)
  // Logic: Inferred confidence based on stake normalized to average.
  const allStakes = safeBets.map(b => cleanNumber(b.Stake)).filter(s => s > 0);
  const avgStake = allStakes.length > 0 ? allStakes.reduce((a, b) => a + b, 0) / allStakes.length : 1;
  const maxStakeForConfidence = avgStake * 3;

  const betSizeConfidenceData = safeBets.map((b, i) => {
    const stake = cleanNumber(b.Stake);
    const won = b.Status && b.Status.toLowerCase().includes('won');
    // Confidence score 1-10 based on stake size relative to average
    const confidence = Math.min(10, Math.max(1, Math.round((stake / maxStakeForConfidence) * 10 * 10) / 10));
    return {
      id: i,
      betSize: stake,
      confidence: confidence,
      outcome: won ? 'Won' : 'Lost',
      color: won ? '#4CAF50' : '#FF5252'
    };
  }).filter(d => d.betSize > 0).sort((a, b) => a.confidence - b.confidence);

  // 6. WIN RATE BY CONFIDENCE CORRELATION
  const confidenceBuckets = {}; // confidence -> { count, wins }
  betSizeConfidenceData.forEach(d => {
    const c = Math.floor(d.confidence);
    if (!confidenceBuckets[c]) confidenceBuckets[c] = { count: 0, wins: 0 };
    confidenceBuckets[c].count++;
    if (d.outcome === 'Won') confidenceBuckets[c].wins++;
  });

  const winRateByConfidenceData = Object.keys(confidenceBuckets).map(c => ({
    confidence: `Level ${c}`,
    winRate: Math.round((confidenceBuckets[c].wins / confidenceBuckets[c].count) * 100),
    count: confidenceBuckets[c].count
  })).sort((a, b) => parseInt(a.confidence.split(' ')[1]) - parseInt(b.confidence.split(' ')[1]));

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
    const maxBets = Math.max(...timeHeatmapData.map(d => d.bets)) || 1;

    return (
      <Box sx={{ p: { xs: 0, sm: 2 }, width: '100%', overflowX: 'hidden' }}>
        <Box display="flex" mb={1}>
          <Box sx={{ width: { xs: 35, sm: 60 }, flexShrink: 0 }}></Box>
          {hours.map(hour => (
            <Box key={hour} sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{hour}</Typography>
            </Box>
          ))}
        </Box>
        {data.map(row => (
          <Box key={row.day} display="flex" mb={0.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: { xs: 35, sm: 60 }, flexShrink: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>{row.day}</Typography>
            </Box>
            {row.data.map((value, index) => (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  height: { xs: 25, sm: 35 },
                  margin: 0.25,
                  backgroundColor: value > 0 ? `rgba(25, 118, 210, ${Math.max(0.1, value / maxBets)})` : '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.05)', zIndex: 1 }
                }}
              >
                <Typography variant="caption" sx={{
                  color: value > maxBets / 2 ? 'white' : 'text.secondary',
                  fontSize: { xs: '0.6rem', sm: '0.75rem' }
                }}>
                  {value || ''}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
        {/* Legend */}
        <Box display="flex" justifyContent="center" mt={2} alignItems="center" gap={1}>
          <Typography variant="caption">Less</Typography>
          {[0.1, 0.4, 0.7, 1].map((op, i) => (
            <Box key={i} sx={{ width: 15, height: 15, borderRadius: 0.5, backgroundColor: `rgba(25, 118, 210, ${op})` }} />
          ))}
          <Typography variant="caption">More</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Betting Behavior Analysis
        </Typography>
        {isSyncing && (
          <Chip
            icon={<Zap size={14} />}
            label="Live Syncing..."
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Betting Frequency Heatmap */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Betting Frequency by Day & Time</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Shows how many bets you place by day of week and hour.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Frequency = Count of bets at Day/Hour
                  </Typography>
                </Box>
              }
            />
            <Box sx={{ minHeight: 350, display: 'flex', alignItems: 'center' }}>
              <HeatmapGrid />
            </Box>
          </CardContent>
        </Card>

        {/* Market Preference */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Market Preferences</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Share of your total bets by market.
                  </Typography>
                  <BlockMath math={"p_m = \\frac{B_m}{\\sum_k B_k} \\times 100\\%"} />
                  <Typography variant="caption" display="block">where <InlineMath math={"B_m"} /> is bets in market <InlineMath math={"m"} />.</Typography>
                </Box>
              }
            />
            <Box sx={{ position: 'relative', height: isMobile ? 220 : 280, mb: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={marketPreferenceData}
                    nameKey="market"
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 40 : 60}
                    outerRadius={isMobile ? 70 : 100}
                    paddingAngle={3}
                    dataKey="percentage"
                    label={isMobile ? false : ({ market, percentage }) => `${market}: ${percentage}%`}
                    labelLine={!isMobile}
                  >
                    {marketPreferenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Custom Vertical Legend that elongates naturally without a massive gap */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'center', 
              gap: 1,
              px: 2,
              mt: 2
            }}>
              {marketPreferenceData.map((entry, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    backgroundColor: `${entry.color}10`,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${entry.color}30`
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                    {entry.market} ({entry.percentage}%)
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Stake Distribution */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Stake Distribution & Win Rate</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Bars show frequency of stakes in each range; line shows win rate.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Win Rate = (Wins / Total Bets) * 100%
                  </Typography>
                </Box>
              }
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <BarChart data={sanitizeChartData(stakeDistributionData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value, name) => [name === 'Frequency' ? value : `${value}%`, name]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Bar dataKey="frequency" fill="#8884d8" name="Frequency" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="avgWin" stroke="#82ca9d" name="Win Rate %" strokeWidth={2} dot={{ r: 4 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bankroll Management */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Bankroll Management</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Tracks current bankroll versus high-water mark over time.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Drawdown from peak
                  </Typography>
                </Box>
              }
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <LineChart data={sanitizeChartData(bankrollData)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip formatter={(value) => [`₦${value}`, '']} contentStyle={{ fontSize: '12px' }} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="bankroll"
                  stroke="#1976d2"
                  strokeWidth={isMobile ? 2 : 3}
                  name="Current Bankroll"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="highWater"
                  stroke="#4CAF50"
                  strokeDasharray="5 5"
                  name="High Water Mark"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bet Size vs Confidence */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Bet Size vs Confidence Level</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Relationship between your confidence and bet size.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Correlation analysis
                  </Typography>
                </Box>
              }
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <ScatterChart data={sanitizeChartData(betSizeConfidenceData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="confidence" name="Confidence" unit="/10" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis dataKey="betSize" name="Bet Size" unit="₦" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value, name, props) => {
                    if (name === 'Bet Size') return [`₦${value}`, name];
                    if (name === 'Confidence') return [value, name];
                    return [value, name];
                  }}
                  labelFormatter={() => ''}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Scatter dataKey="betSize" name="Bets">
                  {betSizeConfidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence vs Outcome Correlation */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Confidence vs Outcome Correlation</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Validates the theory: Does higher "confidence" (stake) lead to higher win rates?
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Target: Positive slope/correlation.
                  </Typography>
                </Box>
              }
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 320}>
              <BarChart data={sanitizeChartData(winRateByConfidenceData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="confidence" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(value) => [`${value}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" fill="#4ECDC4" name="Win Rate %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win Rate by Market */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip
              title={<Typography variant="h6" gutterBottom>Win Rate by Market</Typography>}
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">
                    Win rate per market.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Win Ratio %
                  </Typography>
                </Box>
              }
            />
            <ResponsiveContainer width="100%" height={Math.max(isMobile ? 250 : 320, winRateByMarketData.length * (isMobile ? 25 : 35) + 60)}>
              <BarChart layout="vertical" data={sanitizeChartData(winRateByMarketData)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis type="category" dataKey="market" width={isMobile ? 80 : 120} tick={{ fontSize: isMobile ? 9 : 11 }} interval={0} />
                <Tooltip formatter={(v) => [`${v}%`, 'Win Rate']} contentStyle={{ fontSize: '12px' }} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Bar dataKey="winRate" fill="#82ca9d" name="Win Rate %" radius={[0, 4, 4, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Betting Activity Calendar */}
        <Card>
          <CardContent>
            <BettingCalendar bets={bets} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default BettingBehaviorTab;

