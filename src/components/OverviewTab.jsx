import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip } from '@mui/material';
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, Trophy, History, Scale, Calculator, Landmark, Percent, Coins, Scissors } from 'lucide-react';
import { FaArrowUp, FaPercent, FaHandHoldingUsd, FaArrowDown, FaCheck } from "react-icons/fa";
import TimeSeriesChart from '../TimeSeriesChart';

const OverviewTab = ({ bets = [] }) => {
  // --- CALCULATE METRICS FROM REAL DATA ---
  const cleanNumber = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
  // Sort bets chronologically
  const sortedBets = [...bets].sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // 1. Total Bets
  const totalBets = bets.length;

  // 2. Win Rate & Win/Loss Counts
  const wins = bets.filter(b => b.Status && b.Status.toLowerCase().includes('won')).length;
  const losses = bets.filter(b => b.Status && b.Status.toLowerCase().includes('lost')).length;
  const draws = totalBets - wins - losses;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : 0;

  // 3. Financials
  const totalStake = bets.reduce((acc, b) => acc + cleanNumber(b.Stake), 0);
  const totalReturn = bets.reduce((acc, b) => acc + cleanNumber(b.Return), 0);
  const totalPL = totalReturn - totalStake;
  const avgBet = totalBets > 0 ? (totalStake / totalBets).toFixed(0) : 0;

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

  // Max Win
  const maxWin = bets.length > 0
    ? Math.max(...bets.map(b => b.Status?.toLowerCase().includes('won') ? cleanNumber(b.Return) : 0))
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
    { range: '$10-50', count: bets.filter(b => cleanNumber(b.Stake) >= 10 && cleanNumber(b.Stake) < 50).length },
    { range: '$50-100', count: bets.filter(b => cleanNumber(b.Stake) >= 50 && cleanNumber(b.Stake) < 100).length },
    { range: '$100-200', count: bets.filter(b => cleanNumber(b.Stake) >= 100 && cleanNumber(b.Stake) < 200).length },
    { range: '$200-500', count: bets.filter(b => cleanNumber(b.Stake) >= 200 && cleanNumber(b.Stake) < 500).length },
    { range: '$500+', count: bets.filter(b => cleanNumber(b.Stake) >= 500).length }
  ];

  // 7. Sport Analysis (Granular Market Analysis)
  // Aggregate bets by Sport
  const sportStats = {};
  bets.forEach(b => {
    const s = b.Sport || 'Unknown';
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
    .map(s => ({
      ...s,
      winRate: s.bets > 0 ? ((s.wins / s.bets) * 100).toFixed(1) : 0
    }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];



  // Placeholder ROI
  const roiTrendData = [{ week: 'W1', roi: 0 }];

  const StatCard = ({ title, value, icon: Icon, trend, color = '#1976d2' }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <MuiTooltip
              arrow
              placement="top"
              title={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">{title} Metric</Typography>
                </Box>
              }
            >
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {title}
              </Typography>
            </MuiTooltip>
            <Typography variant="h4" component="div" sx={{ color: color, fontWeight: 'bold' }}>
              {value}
            </Typography>
          </Box>
          <Icon size={40} color={color} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total Bets" value={totalBets.toLocaleString()} icon={Target} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Win Rate" value={`${winRate}%`} icon={Trophy} color="#4CAF50" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total P&L" value={`$${totalPL.toLocaleString()}`} icon={DollarSign} color={totalPL >= 0 ? "#4CAF50" : "#F44336"} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Avg Bet Amount" value={`$${Number(avgBet).toLocaleString()}`} icon={DollarSign} color="#9C27B0" />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Monthly P&L Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Monthly Profit & Loss</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyPLData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="net" stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} name="Net P&L" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bet Amount Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Bet Amount Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={betAmountDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Analysis (Sport Breakdown) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Market Analysis: Sport Performance</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>Breakdown by Sport Volume & Profit</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" align="center">Volume by Sport</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sportAnalysisData}
                        dataKey="bets"
                        nameKey="sport"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        label={(entry) => entry.sport}
                      >
                        {sportAnalysisData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => [val, props.payload.sport]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" align="center">Profit/Loss by Sport</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sportAnalysisData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sport" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'P&L']} />
                      <ReferenceLine y={0} stroke="#000" />
                      <Bar dataKey="profit">
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
        </Grid>
      </Grid>

      {/* Custom Cards */}
      <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>

        {/* Staked */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Total amount staked across all bets.</Typography>
              <BlockMath math={"Stake_{tot} \\;=\\; \\sum_i s_i"} />
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(to right top, #50c9c3, #64cec9, #76d4cf, #86d9d4, #96deda)" }}>
            <span>
              <p>staked</p>
              <h3>₦{totalStake.toLocaleString()}</h3>
            </span>
            <div className="CardIcon"><Coins color="#50c9c3" /></div>
          </div>
        </MuiTooltip>

        {/* Last Win */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Amount from your most recent winning bet.</Typography>
              <Typography variant="caption" display="block">Derived from the last positive outcome.</Typography>
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)" }}>
            <span>
              <p>last win</p>
              <h3>₦{lastWinAmount.toLocaleString()}</h3>
            </span>
            <div className="CardIcon"><History color="#fbc2eb" /></div>
          </div>
        </MuiTooltip>

        {/* Total Return (Used as Withdrawn proxy) */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Total withdrawals from your bankroll.</Typography>
              <BlockMath math={"Withdrawn_{tot} \\;=\\; \\sum_j w_j"} />
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "radial-gradient(circle 248px at center, #16d9e3 0%, #30c7ec 47%, #46aef7 100%)" }}>
            <span>
              <p>Total Returned</p>
              <h3>₦{totalReturn.toLocaleString()}</h3>
            </span>
            <div className="CardIcon"><Landmark color="#46aef7" /></div>
          </div>
        </MuiTooltip>

        {/* Money Lost Since Last Win */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Money lost since the most recent win.</Typography>
              <BlockMath math={"Loss_{since} \\;=\\; Stake_{since} - Return_{since}"} />
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #a6c0fe 0%, #f68084 100%)" }}>
            <span>
              <p>lost since last win</p>
              <h3>₦{moneyLostSinceLastWin.toLocaleString()}</h3>
            </span>
            <div className="CardIcon"><Scissors color="#f68084" /></div>
          </div>
        </MuiTooltip>

        {/* Highest Amount Won */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Largest single win amount observed.</Typography>
              <BlockMath math={"max\\_win = \\max_i \\; win_i"} />
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)" }}>
            <span>
              <p>highest amount won</p>
              <h3>₦{maxWin.toLocaleString()}</h3>
            </span>
            <div className="CardIcon"><Trophy color="#ffd700" /></div>
          </div>
        </MuiTooltip>

        {/* Win/Loss Ratio */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Ratio of wins to losses.</Typography>
              <BlockMath math={"W:L = \\frac{Wins}{Losses}"} />
              <Typography variant="caption" display="block">Related to win rate <InlineMath math={"WR = \\tfrac{Wins}{Wins+Losses}"} />.</Typography>
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)" }}>
            <span>
              <p>Win:Loss Ratio</p>
              <h3>{losses > 0 ? (wins / losses).toFixed(2) : wins}</h3>
            </span>
            <div className="CardIcon"><Scale color="#d4fc79" /></div>
          </div>
        </MuiTooltip>

        {/* Kelly Criterion - Placeholder */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Optimal fraction to stake given edge and odds.</Typography>
              <BlockMath math={"f^* = \\frac{bp - q}{b}"} />
              <Typography variant="caption" display="block">where <InlineMath math={"b"} /> = odds−1, <InlineMath math={"p"} /> = win prob, <InlineMath math={"q=1-p"} />.</Typography>
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)" }}>
            <span>
              <p>Kelly Estimate</p>
              <h3>N/A</h3>
            </span>
            <div className="CardIcon"><Calculator color="#e0c3fc" /></div>
          </div>
        </MuiTooltip>

        {/* Odds - Placeholder */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Odds to implied probability conversion.</Typography>
              <BlockMath math={"p_{impl} = \\frac{1}{odds}"} />
            </Box>
          }
        >
          <div className="Card" style={{ backgroundImage: "linear-gradient(to left bottom, #051937, #004d7a, #008793, #00bf72, #a8eb12)" }}>
            <span>
              <p>odds</p>
              <h3>₦300</h3>
            </span>
            <div className="CardIcon"><Percent color="#f6d365" /></div>
          </div>
        </MuiTooltip>
      </Box>

      {/* --- RESTORED CHARTS SECTION --- */}
      <Box sx={{ mt: 4 }}>

        {/* Line Chart */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Generic time series display.</Typography>
              <Typography variant="caption" display="block">Change over time</Typography>
            </Box>
          }
        >
          <div style={{ marginBottom: "3vmin", fontFamily: "Playfair Display", paddingTop: "3vmin", borderRadius: "6px", backgroundImage: "linear-gradient(to top, #0ba360 0%, #3cba92 100%)", height: "auto", minHeight: "300px", width: "100%", maxWidth: "none", overflowX: "hidden", overflowY: "hidden", padding: "20px", boxSizing: "border-box" }}>
            <p style={{ marginBottom: "2vmin", marginLeft: "2vmin", fontWeight: "600", color: "#fff", fontSize: "", textTransform: "uppercase" }}> Chart</p>
            <ResponsiveContainer width="90%" height={250}>
              <LineChart data={[
                { name: 'Page A', uv: 400, pv: 2400, amt: 2400 },
                { name: 'Page B', uv: 200, pv: 1500, amt: 1300 },
                { name: 'Page C', uv: 300, pv: 1400, amt: 2700 }
              ]}>
                <Line type="monotone" dataKey="uv" stroke="#ffffff" strokeWidth={3} dot={{ fill: '#ffffff', strokeWidth: 2, r: 4 }} />
                <CartesianGrid stroke="#ffffff" strokeDasharray="5 5" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#ffffff', fontSize: 12 }}
                  axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
                  tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
                />
                <YAxis
                  tick={{ fill: '#ffffff', fontSize: 12 }}
                  axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
                  tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #0ba360',
                    borderRadius: '8px',
                    color: '#333'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </MuiTooltip>

        {/* Donut Chart */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Distribution of outcomes.</Typography>
            </Box>
          }
        >
          <div id="Donut" style={{ fontFamily: "Playfair Display", borderRadius: "6px", textTransform: "uppercase", width: "100%", maxWidth: "2000px", padding: "0vmin", margin: "auto", position: "relative", backgroundImage: "linear-gradient(to right, #4facfe 0%, #00f2fe 100%)" }}>
            <p style={{ marginBottom: "2vmin", marginLeft: "2vmin", fontWeight: "600", color: "#fff", fontSize: "16px", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Win/Loss Distribution</p>
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Wins", value: 45 },
                    { name: "Losses", value: 30 },
                    { name: "Draws", value: 25 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  cornerRadius={2}
                  dataKey="value"
                >
                  <Cell fill="url(#winGradient)" />
                  <Cell fill="url(#lossGradient)" />
                  <Cell fill="url(#drawGradient)" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "16px",
              textTransform: "uppercase",
              color: "#333"
            }}>
              <div>Total games played</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>3519</div>
            </div>
          </div>
        </MuiTooltip>

        {/* Time Series Chart */}
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Time series.</Typography>
            </Box>
          }
        >
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
            <p style={{ marginBottom: "2vmin", marginLeft: "2vmin", fontWeight: "600", color: "#ffffff", fontSize: "16px", textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>Time Series Chart</p>
            <TimeSeriesChart data={[
              { timestamp: "2024-03-01", value: 50 },
              { timestamp: "2024-03-02", value: 70 },
              { timestamp: "2024-03-03", value: 30 },
              { timestamp: "2024-03-04", value: 90 },
              { timestamp: "2024-03-05", value: 40 }
            ]} />
          </div>
        </MuiTooltip>
      </Box>
    </Box>
  );
};

export default OverviewTab;
