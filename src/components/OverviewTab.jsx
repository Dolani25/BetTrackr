import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip, useTheme, useMediaQuery, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, Trophy, History, Scale, Calculator, Landmark, Percent, Coins, Scissors, HelpCircle, Zap } from 'lucide-react';
import { FaArrowUp, FaPercent, FaHandHoldingUsd, FaArrowDown, FaCheck } from "react-icons/fa";
import TimeSeriesChart from '../TimeSeriesChart';
import { sanitizeChartData } from '../utils/chartUtils';

const ClickableInfoTooltip = ({ title, content, children, color = 'inherit', iconSize = 14, sx = {} }) => {
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      {title}
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
          <HelpCircle size={iconSize} color={color} />
        </Box>
      </MuiTooltip>
      {children}
    </Box>
  );
};

const OverviewTab = ({ bets = [], isSyncing = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- CALCULATE METRICS FROM REAL DATA ---
  const cleanNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };
  // Sort bets chronologically
  const sortedBets = [...bets].sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // 1. Total Bets
  const totalBets = bets.length;

  // 2. Win Rate & Win/Loss Counts
  const wins = bets.filter(b => b.Status && b.Status.toLowerCase().includes('won')).length;
  const losses = bets.filter(b => b.Status && b.Status.toLowerCase().includes('lost')).length;
  const draws = totalBets - wins - losses;
  const winRateRaw = totalBets > 0 ? ((wins / totalBets) * 100) : 0;
  const winRate = isFinite(winRateRaw) ? winRateRaw.toFixed(1) : "0.0";

  // 3. Financials
  const totalStake = bets.reduce((acc, b) => acc + cleanNumber(b.Stake), 0);
  const totalReturn = bets.reduce((acc, b) => acc + cleanNumber(b.Return), 0);
  const totalPL = totalReturn - totalStake;
  const avgBetRaw = totalBets > 0 ? (totalStake / totalBets) : 0;
  const avgBet = isFinite(avgBetRaw) ? avgBetRaw.toFixed(0) : "0";

  // 4. Advanced Metrics
  // Last Win
  let lastWinAmount = 0;
  let lastWinIndex = -1;
  // Find last win (iterate backwards)
  for (let i = sortedBets.length - 1; i >= 0; i--) {
    if (sortedBets[i].Status && sortedBets[i].Status.toLowerCase().includes('won')) {
      lastWinAmount = cleanNumber(sortedBets[i].Return);
      lastWinIndex = i;
      break;
    }
  }

  // Money lost since last win
  let moneyLostSinceLastWin = 0;
  if (lastWinIndex !== -1 && lastWinIndex < sortedBets.length - 1) {
    for (let i = lastWinIndex + 1; i < sortedBets.length; i++) {
      if (sortedBets[i].Status && sortedBets[i].Status.toLowerCase().includes('lost')) {
        moneyLostSinceLastWin += cleanNumber(sortedBets[i].Stake);
      }
    }
  }

  // Max Win & Highest Odds
  let highestWonOdds = 0;
  const maxWin = bets.length > 0
    ? Math.max(...bets.map(b => {
        const isWon = b.Status?.toLowerCase().includes('won');
        if (isWon) {
          const stake = cleanNumber(b.Stake);
          const ret = cleanNumber(b.Return);
          if (stake > 0) {
            const odds = ret / stake;
            if (odds > highestWonOdds) highestWonOdds = odds;
          }
          return ret;
        }
        return 0;
      }))
    : 0;

  // 5. Monthly P&L Data
  const monthlyData = {};
  bets.forEach(b => {
    const date = new Date(b.Date);
    if (!isNaN(date)) {
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { profit: 0, loss: 0, net: 0 };
      const pnl = cleanNumber(b.Return) - cleanNumber(b.Stake);
      if (pnl >= 0) monthlyData[monthKey].profit += pnl;
      else monthlyData[monthKey].loss += pnl;
      monthlyData[monthKey].net += pnl;
    }
  });

  const monthlyPLData = Object.keys(monthlyData).map(m => ({
    month: m,
    profit: monthlyData[m].profit,
    loss: monthlyData[m].loss,
    net: monthlyData[m].net
  }));

  // 6. Bet Amount Distribution
  const betAmountDistribution = [
    { range: '₦10-50', count: bets.filter(b => cleanNumber(b.Stake) >= 10 && cleanNumber(b.Stake) < 50).length },
    { range: '₦50-100', count: bets.filter(b => cleanNumber(b.Stake) >= 50 && cleanNumber(b.Stake) < 100).length },
    { range: '₦100-200', count: bets.filter(b => cleanNumber(b.Stake) >= 100 && cleanNumber(b.Stake) < 200).length },
    { range: '₦200-500', count: bets.filter(b => cleanNumber(b.Stake) >= 200 && cleanNumber(b.Stake) < 500).length },
    { range: '₦500+', count: bets.filter(b => cleanNumber(b.Stake) >= 500).length }
  ];

  // 7. Sport Analysis (Granular Market Analysis)
  // Aggregate bets by Sport
  const sportStats = {};
  
  // Comprehensive Sport ID to Name mapping
  const sportMap = {
    'sr:sport:1': 'Soccer',
    '1': 'Soccer',
    'sr:sport:2': 'Basketball',
    '2': 'Basketball',
    'sr:sport:5': 'Tennis',
    '5': 'Tennis',
    'sr:sport:4': 'Ice Hockey',
    '4': 'Ice Hockey',
    'sr:sport:3': 'Baseball',
    '3': 'Baseball',
    'sr:sport:6': 'Handball',
    '6': 'Handball',
    'sr:sport:23': 'Volleyball',
    'sr:sport:12': 'Rugby',
    'sr:sport:24': 'Darts',
    'sr:sport:31': 'Table Tennis'
  };

  bets.forEach(b => {
    const rawSport = b.Sport || 'Unknown';
    const s = sportMap[rawSport] || rawSport;
    if (!sportStats[s]) {
      sportStats[s] = { sport: s, bets: 0, wins: 0, losses: 0, profit: 0, stake: 0, return: 0 };
    }
    sportStats[s].bets += 1;
    sportStats[s].stake += cleanNumber(b.Stake);
    const ret = cleanNumber(b.Return);
    sportStats[s].return += ret;
    sportStats[s].profit += (ret - cleanNumber(b.Stake));
    if (b.Status && b.Status.toLowerCase().includes('won')) sportStats[s].wins += 1;
    if (b.Status && b.Status.toLowerCase().includes('lost')) sportStats[s].losses += 1;
  });

  const sportAnalysisData = Object.values(sportStats)
    .sort((a, b) => b.bets - a.bets) // Sort by volume
    .map(s => {
      const winRateRaw = s.bets > 0 ? ((s.wins / s.bets) * 100) : 0;
      return {
        ...s,
        winRate: isFinite(winRateRaw) ? winRateRaw.toFixed(1) : "0.0"
      };
    });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];



  // Placeholder ROI
  const roiTrendData = [{ week: 'W1', roi: 0 }];

  // 8. Cumulative P&L Data (for Line Chart)
  const getTimeSpan = () => {
    if (sortedBets.length < 2) return 0;
    const start = new Date(sortedBets[0].Date).getTime();
    const end = new Date(sortedBets[sortedBets.length - 1].Date).getTime();
    return end - start;
  };
  const isShortSpan = getTimeSpan() < 24 * 60 * 60 * 1000;

  let runningPL = 0;
  const cumulativePLData = sortedBets.map(b => {
    runningPL += (cleanNumber(b.Return) - cleanNumber(b.Stake));
    const d = new Date(b.Date);
    return {
      name: isShortSpan 
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
        : d.toLocaleDateString(),
      value: runningPL,
      fullDate: d.toLocaleString() // For tooltip better context
    };
  });

  // 9. Time Series Data (for Time Series Chart, showing individual bet P&L)
  const timeSeriesData = sortedBets.map(b => ({
    timestamp: b.Date,
    value: cleanNumber(b.Return) - cleanNumber(b.Stake)
  }));

  const StatCard = ({ title, value, icon: Icon, trend, color = '#1976d2' }) => (
    <Card sx={{ 
      height: '100%', 
      borderRadius: '12px',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`, 
      border: `1px solid ${color}25`,
      boxShadow: `0 8px 32px -4px ${color}20`,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 40px -4px ${color}35`,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}0a 100%)`, 
        borderColor: `${color}40`,
      },
      position: 'relative',
      overflow: 'hidden'
    }}>
      <CardContent sx={{ p: '24px !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="start">
          <Box>
            <ClickableInfoTooltip 
              title={
                <Typography 
                  variant="overline" 
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: '700', 
                    letterSpacing: '0.08em',
                    lineHeight: 1.2,
                    display: 'block',
                    mb: 0.5,
                    opacity: 0.6,
                    fontSize: '0.65rem'
                  }}
                >
                  {title}
                </Typography>
              } 
              content={<Typography variant="caption">{title} Metric</Typography>} 
              color="textSecondary"
            />
            <Typography variant="h4" component="div" sx={{ color: color, fontWeight: '800', lineHeight: 1.1, opacity: 0.9 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ 
            width: 48,
            height: 48,
            borderRadius: '10px', 
            backgroundColor: `${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: `0 6px 12px -3px ${color}50`,
            flexShrink: 0
          }}>
            <Icon size={24} strokeWidth={2} />
          </Box>
        </Box>
        {/* Subtle background abstract shape */}
        <Box sx={{
          position: 'absolute',
          right: -10,
          top: -10,
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.05,
          filter: 'blur(30px)',
          zIndex: 0
        }} />
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Dashboard Overview
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
      {/* KPI Cards */}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
      <StatCard title="Total Bets" value={totalBets.toLocaleString()} icon={Target} color="#1976d2" />
      <StatCard title="Win Rate" value={`${winRate}%`} icon={Trophy} color="#4CAF50" />
      <StatCard title="Total P&L" value={`₦${totalPL.toLocaleString()}`} icon={DollarSign} color={totalPL >= 0 ? "#4CAF50" : "#F44336"} />
      <StatCard title="Avg Bet Amount" value={`₦${Number(avgBet).toLocaleString()}`} icon={DollarSign} color="#9C27B0" />
    </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Monthly P&L Chart */}
        <Card sx={{ width: '100%', maxWidth: 'none' }}>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Monthly Profit & Loss</Typography>} 
              content={<Typography variant="caption">Net performance aggregated by month.</Typography>} 
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <AreaChart data={sanitizeChartData(monthlyPLData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip 
                  formatter={(value) => [`₦${value.toLocaleString()}`, '']} 
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Area type="monotone" dataKey="net" stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} name="Net P&L" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bet Amount Distribution */}
        <Card sx={{ width: '100%', maxWidth: 'none' }}>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Bet Amount Distribution</Typography>} 
              content={<Typography variant="caption">Frequency of bets within specific stake ranges.</Typography>} 
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={sanitizeChartData(betAmountDistribution)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Analysis (Sport Breakdown) */}
        <Card sx={{ width: '100%', maxWidth: 'none' }}>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Market Analysis: Sport Performance</Typography>} 
              content={<Typography variant="caption">Analysis of your volume and profitability across different sports.</Typography>} 
            />
            <Typography variant="body2" color="textSecondary" gutterBottom>Breakdown by Sport Volume & Profit</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" align="center">Volume by Sport</Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={sanitizeChartData(sportAnalysisData)}
                      dataKey="bets"
                      nameKey="sport"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 60 : 100}
                      fill="#8884d8"
                      label={false}
                    >
                      {sportAnalysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [val, props.payload.sport]} contentStyle={{ fontSize: '12px' }} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" align="center">Profit/Loss by Sport</Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                  <BarChart data={sanitizeChartData(sportAnalysisData)} margin={{ top: 10, right: 10, left: isMobile ? -30 : -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="sport" 
                      tick={{ fontSize: isMobile ? 9 : 12 }} 
                      interval={0}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip 
                      formatter={(value) => [`₦${value.toLocaleString()}`, 'P&L']} 
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {sportAnalysisData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#4CAF50' : '#F44336'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Custom Cards */}
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Staked Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(to right top, #50c9c3, #64cec9, #76d4cf, #86d9d4, #96deda)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>STAKED</p>} 
              content={<Typography variant="caption">Total amount staked across all bets.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>₦{totalStake.toLocaleString()}</h3>
          </span>
          <div className="CardIcon"><Coins color="#50c9c3" /></div>
        </div>

        {/* Last Win Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>LAST WIN</p>} 
              content={<Typography variant="caption">Amount from your most recent winning bet.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>₦{lastWinAmount.toLocaleString()}</h3>
          </span>
          <div className="CardIcon"><History color="#fbc2eb" /></div>
        </div>

        {/* Withdrawn Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "radial-gradient(circle 248px at center, #16d9e3 0%, #30c7ec 47%, #46aef7 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>WITHDRAWN</p>} 
              content={<Typography variant="caption">Total returns or withdrawals from your bankroll.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>₦{totalReturn.toLocaleString()}</h3>
          </span>
          <div className="CardIcon"><Landmark color="#46aef7" /></div>
        </div>

        {/* Money Lost Since Last Win Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(120deg, #a6c0fe 0%, #f68084 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>MONEY LOST SINCE LAST WIN</p>} 
              content={<Typography variant="caption">Money lost since the most recent win.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>₦{moneyLostSinceLastWin.toLocaleString()}</h3>
          </span>
          <div className="CardIcon"><Scissors color="#f68084" /></div>
        </div>

        {/* Highest Amount Won Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>HIGHEST AMOUNT WON</p>} 
              content={<Typography variant="caption">Largest single win amount observed.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>₦{maxWin.toLocaleString()}</h3>
          </span>
          <div className="CardIcon"><Trophy color="#ffd700" /></div>
        </div>

        {/* Win Rate Ratio Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>WIN TO LOSS RATIO</p>} 
              content={<Typography variant="caption">Ratio of wins to losses.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>{losses > 0 ? (wins / losses).toFixed(2) : wins}</h3>
          </span>
          <div className="CardIcon"><Scale color="#d4fc79" /></div>
        </div>

        {/* Kelly Criterion Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>KELLY CRITERION</p>} 
              content={<Typography variant="caption">Optimal fraction to stake given edge and odds.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>N/A</h3>
          </span>
          <div className="CardIcon"><Calculator color="#e0c3fc" /></div>
        </div>

        {/* Odds Card */}
        <div className="Card" style={{ width: '100%', backgroundImage: "linear-gradient(to left bottom, #051937, #004d7a, #008793, #00bf72, #a8eb12)" }}>
          <span>
            <ClickableInfoTooltip 
              title={<p style={{ textTransform: "uppercase" }}>HIGHEST ODDS WON</p>} 
              content={<Typography variant="caption">Highest odds among your winning bets.</Typography>} 
              color="#fff"
              iconSize={12}
            />
            <h3>{highestWonOdds > 0 ? highestWonOdds.toFixed(2) : '0.00'}</h3>
          </span>
          <div className="CardIcon"><Percent color="#f6d365" /></div>
        </div>
      </Box>

      {/* --- RESTORED CHARTS SECTION --- */}
      <Box sx={{ mt: 4 }}>

        {/* Line Chart */}
        <div style={{ marginBottom: "3vmin", fontFamily: "Playfair Display", paddingTop: "3vmin", borderRadius: "6px", backgroundImage: "linear-gradient(to top, #0ba360 0%, #3cba92 100%)", height: "auto", minHeight: "300px", width: "100%", maxWidth: "none", overflowX: "hidden", overflowY: "hidden", padding: "20px", boxSizing: "border-box" }}>
          <Box sx={{ mb: 2, ml: 2 }}>
            <ClickableInfoTooltip 
              title={<p style={{ marginBottom: "2vmin", fontWeight: "600", color: "#fff", fontSize: isMobile ? "14px" : "16px", textTransform: "uppercase" }}>Profit Line Chart</p>} 
              content={<Typography variant="caption">Net performance over time (Cumulative P&L).</Typography>} 
              color="#fff"
            />
          </Box>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <LineChart data={cumulativePLData.length > 0 ? cumulativePLData : [{ name: 'No Data', value: 0 }]} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={isMobile ? 2 : 3} dot={false} />
                <CartesianGrid stroke="#ffffff" strokeDasharray="5 5" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#ffffff', fontSize: isMobile ? 10 : 12 }}
                  axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
                  tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: '#ffffff', fontSize: isMobile ? 10 : 12 }}
                  axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
                  tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
                />
                <Tooltip
                  labelFormatter={(label, items) => {
                    const item = items?.[0]?.payload;
                    return item?.fullDate || label;
                  }}
                  formatter={(value) => [
                    <span style={{ color: value >= 0 ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
                      ₦{Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>, 
                    'Profit/Loss'
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #0ba360',
                    borderRadius: '8px',
                    color: '#333',
                    fontSize: '13px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

      {/* Donut Chart */}
      <ClickableInfoTooltip 
        title="" 
        content={<Typography variant="caption">Distribution of wins, losses, and draws.</Typography>} 
      >
        <div id="Donut" style={{ fontFamily: "Playfair Display", borderRadius: "6px", textTransform: "uppercase", width: "100%", maxWidth: "2000px", padding: "0vmin", margin: "auto", position: "relative", backgroundImage: "linear-gradient(to right, #4facfe 0%, #00f2fe 100%)" }}>
          <Box sx={{ mb: 2, ml: 2, pt: 2 }}>
            <ClickableInfoTooltip 
              title={<p style={{ marginBottom: "2vmin", fontWeight: "600", color: "#fff", fontSize: isMobile ? "14px" : "16px", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Win/Loss Distribution</p>} 
              content={<Typography variant="caption">Percentage breakdown of game outcomes.</Typography>} 
              color="#fff"
            />
          </Box>
            <svg width="0" height="0">
              <defs>
                <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#ff4b1f", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#ff9068", stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#1fa2ff", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#12d8fa", stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="drawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#f9d423", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#ffde70", stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Wins", value: wins },
                    { name: "Losses", value: losses },
                    { name: "Draws", value: draws }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 50 : 70}
                  outerRadius={isMobile ? 80 : 100}
                  paddingAngle={2}
                  cornerRadius={2}
                  dataKey="value"
                >
                  <Cell fill="url(#winGradient)" />
                  <Cell fill="url(#lossGradient)" />
                  <Cell fill="url(#drawGradient)" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -40%)",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: isMobile ? "12px" : "14px",
              textTransform: "uppercase",
              color: "#333"
            }}>
              <div>Games</div>
              <div style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: "bold", color: "#000" }}>{totalBets.toLocaleString()}</div>
            </div>
          </div>
        </ClickableInfoTooltip>

        <div style={{
          marginTop: "3vmin",
          marginBottom: "3vmin",
          fontFamily: "Playfair Display",
          paddingTop: "3vmin",
          borderRadius: "6px",
          backgroundImage: "linear-gradient(to top, #667eea 0%, #764ba2 100%)",
          height: "auto",
          minHeight: "350px",
          width: "100%",
          maxWidth: "none",
          overflowX: "hidden",
          overflowY: "hidden",
          padding: "20px",
          boxSizing: "border-box"
        }}>
          <Box sx={{ mb: 2, ml: 2 }}>
            <ClickableInfoTooltip 
              title={<p style={{ marginBottom: "2vmin", fontWeight: "600", color: "#ffffff", fontSize: "16px", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Time Series Chart</p>} 
              content={<Typography variant="caption">Individual bet performance over time.</Typography>} 
              color="#fff"
            />
          </Box>
          <TimeSeriesChart data={timeSeriesData.length > 0 ? timeSeriesData : [
            { timestamp: new Date().toISOString(), value: 0 }
          ]} />
        </div>
      </Box>
    </Box>
  );
};

export default OverviewTab;
