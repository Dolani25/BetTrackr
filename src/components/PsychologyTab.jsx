
import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Label, Cell
} from 'recharts';
import { sanitizeChartData } from '../utils/chartUtils';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Chip, Tooltip as MuiTooltip, useTheme, useMediaQuery } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Brain, TrendingDown, AlertTriangle, Target, Zap, Shield, HelpCircle } from 'lucide-react';

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

const PsychologyTab = ({ bets = [], isSyncing = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- HELPER FUNCTIONS ---
  const cleanNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  // 1. TILT DETECTION (Activity per Day)
  const betsByDate = {};
  bets.forEach(b => {
    const d = new Date(b.Date).toISOString().split('T')[0];
    if (!betsByDate[d]) betsByDate[d] = { count: 0, totalStake: 0 };
    betsByDate[d].count++;
    betsByDate[d].totalStake += cleanNumber(b.Stake);
  });

  const tiltDetectionData = Object.keys(betsByDate).sort().slice(-10).map(d => ({
    date: d,
    betsPerHour: betsByDate[d].count, // Using Count per Day as proxy for density
    avgStake: betsByDate[d].count ? Math.round(betsByDate[d].totalStake / betsByDate[d].count) : 0,
    emotionalState: betsByDate[d].count > 10 ? 'Tilted' : 'Calm'
  }));

  // 2. OVERCONFIDENCE (Bet Size after Win Streak)
  // We need to iterate chronologically
  const sortedBets = [...bets].sort((a, b) => new Date(a.Date) - new Date(b.Date));

  const streakData = {}; // streak_length -> { totalNextStake, count }
  let currentStreak = 0;

  for (let i = 0; i < sortedBets.length - 1; i++) {
    const isWin = sortedBets[i].Status && sortedBets[i].Status.toLowerCase().includes('won');

    if (isWin) {
      currentStreak++;
    } else {
      currentStreak = 0;
    }

    // Look at next bet
    const nextBetStake = cleanNumber(sortedBets[i + 1].Stake);

    if (currentStreak > 0) {
      if (!streakData[currentStreak]) streakData[currentStreak] = { sum: 0, count: 0 };
      streakData[currentStreak].sum += nextBetStake;
      streakData[currentStreak].count++;
    }
  }

  const overconfidenceData = Object.keys(streakData).map(k => {
    const rawAvg = streakData[k].count ? streakData[k].sum / streakData[k].count : 0;
    return {
      streak: parseInt(k),
      avgBetSize: isFinite(rawAvg) ? Math.round(rawAvg) : 0
    };
  }).sort((a, b) => a.streak - b.streak).slice(0, 10); // Limit to top streaks

  // 3. REVENGE BETTING (Loss -> Next Bet Size)
  const lossData = [];
  for (let i = 0; i < sortedBets.length - 1; i++) {
    const isLoss = sortedBets[i].Status && sortedBets[i].Status.toLowerCase().includes('lost');
    if (isLoss) {
      const lossAmount = cleanNumber(sortedBets[i].Stake);
      const nextStake = cleanNumber(sortedBets[i + 1].Stake);
      // If next stake is > 1.5x previous loss, flagging as potential revenge/chasing
      if (nextStake > lossAmount * 1.5) {
        lossData.push({
          session: `Bet ${i} `,
          initialLoss: -lossAmount,
          subsequentBets: 1, // simplified
          totalLoss: -nextStake // simplified visualization
        });
      }
    }
  }
  const revengeBettingData = lossData.slice(-5); // Last 5 detected instances

  // 4. EMOTIONAL STATE PERFORMANCE
  // Tilt state = bets per hour > 10
  // Calm state = bets per hour <= 10
  const emotionalStats = { Tilt: { wins: 0, total: 0 }, Calm: { wins: 0, total: 0 } };
  bets.forEach(b => {
    const date = new Date(b.Date).toISOString().split('T')[0];
    const isTilt = betsByDate[date] && betsByDate[date].count > 10;
    const isWin = b.Status && b.Status.toLowerCase().includes('won');
    const state = isTilt ? 'Tilt' : 'Calm';
    
    emotionalStats[state].total++;
    if (isWin) emotionalStats[state].wins++;
  });

  const emotionalStateData = Object.keys(emotionalStats).map(state => ({
    state,
    winRate: Math.round((emotionalStats[state].wins / (emotionalStats[state].total || 1)) * 100)
  }));

  // 5. REAL DISCIPLINE METRICS CALCULATION
  const stakeValues = bets.map(b => cleanNumber(b.Stake));
  const avgStakeValue = stakeValues.reduce((a, b) => a + b, 0) / (stakeValues.length || 1);
  const stakeStdDev = Math.sqrt(stakeValues.reduce((a, b) => a + Math.pow(b - avgStakeValue, 2), 0) / (stakeValues.length || 1));
  const stakeConsistency = Math.max(0, Math.min(100, 100 - (stakeStdDev / (avgStakeValue || 1)) * 100));

  // Determine emotional control based on win rate difference
  const calmWR = emotionalStateData.find(d => d.state === 'Calm')?.winRate || 0;
  const tiltWR = emotionalStateData.find(d => d.state === 'Tilt')?.winRate || 0;
  const emotionalControlScore = Math.max(0, Math.min(100, 100 - Math.max(0, calmWR - tiltWR) * 0.5));

  // Patience Level: Avg time between bets (Inverse of density)
  const avgBetsPerDay = Object.values(betsByDate).reduce((a, b) => a + b.count, 0) / (Object.keys(betsByDate).length || 1);
  const patienceScore = Math.max(0, Math.min(100, 100 - (avgBetsPerDay * 5)));

  // Revenge frequency indicator
  const revengeFrequency = revengeBettingData.length / (bets.length || 1);
  const ruleAdherenceScore = Math.max(0, Math.min(100, 100 - (revengeFrequency * 500)));

  const disciplineMetrics = [
    { metric: 'Bankroll Management', score: Math.round(stakeConsistency * 0.9) },
    { metric: 'Bet Sizing Consistency', score: Math.round(stakeConsistency) },
    { metric: 'Emotional Control', score: Math.round(emotionalControlScore) },
    { metric: 'Research Quality', score: Math.round(calmWR > 40 ? 80 : 60) }, // Proxy
    { metric: 'Patience Level', score: Math.round(patienceScore) },
    { metric: 'Rule Adherence', score: Math.round(ruleAdherenceScore) }
  ];

  const overallDisciplineScore = Math.round(disciplineMetrics.reduce((a, b) => a + b.score, 0) / disciplineMetrics.length);

  // 5. CONFIDENCE VS OUTCOME (Stake as Proxy)
  // Logic: Calculate confidence based on stake normalized to average.
  const allStakes = bets.map(b => cleanNumber(b.Stake));
  const avgStake = allStakes.reduce((a, b) => a + b, 0) / (allStakes.length || 1);
  
  const confidenceOutcomeData = bets.map(b => {
    const stake = cleanNumber(b.Stake);
    const win = b.Status && b.Status.toLowerCase().includes('won') ? 1 : 0;
    // Map relative stake to 1-10 scale. (avg stake = 5)
    let confidence = Math.min(10, Math.max(1, (stake / avgStake) * 5));
    return { confidence: Math.round(confidence * 10) / 10, outcome: win };
  }).sort((a, b) => a.confidence - b.confidence);

  // Aggregated version for better visualization in scatter (group by confidence tenth)
  const confidenceAggregated = {};
  confidenceOutcomeData.forEach(d => {
    const bucket = Math.floor(d.confidence);
    if (!confidenceAggregated[bucket]) confidenceAggregated[bucket] = { total: 0, wins: 0, confidence: bucket };
    confidenceAggregated[bucket].total++;
    if (d.outcome === 1) confidenceAggregated[bucket].wins++;
  });

  const confidenceTrendData = Object.values(confidenceAggregated).map(v => ({
    confidence: v.confidence,
    winRate: (v.wins / v.total),
    count: v.total
  })).sort((a,b) => a.confidence - b.confidence);


  const behavioralBiasData = [
    { bias: 'Overconfidence', severity: overconfidenceData.length > 5 ? 8 : 4, impact: 'High', description: 'Tendency to increase stakes during win streaks.' },
    { bias: 'Chasing Losses (Revenge)', severity: revengeBettingData.length > 3 ? 9 : 3, impact: 'High', description: 'Impulsive stake increases immediately following a loss.' },
    { bias: 'Stake-Confidence Sync', severity: confidenceTrendData.length > 0 ? 5 : 0, impact: 'Medium', description: 'Correlation between perceived confidence (stake) and actual win probability.' }
  ];

  const PsychologyMetricCard = ({ title, value, icon: Icon, color, description, content }) => (
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
              content={content || description} 
              color="textSecondary"
            />
            <Typography variant="h4" component="div" sx={{ color: color, fontWeight: '800', lineHeight: 1.1, opacity: 0.9 }}>
              {value}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>
              {description}
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
        <Box sx={{
          position: 'absolute',
          right: -10,
          top: -10,
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.05,
          filter: 'blur(30px)',
          zIndex: 0
        }} />
      </CardContent>
    </Card>
  );

  const BiasIndicator = ({ bias, severity, impact, description }) => {
    const getColor = (severity) => {
      if (severity >= 7) return '#F44336';
      if (severity >= 5) return '#FF9800';
      return '#4CAF50';
    };

    return (
      <div style={{ 
        padding: "24px", 
        borderRadius: "16px", 
        background: "#fff",
        boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
        marginBottom: "16px"
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{bias}</Typography>
          <Chip
            label={impact}
            color={impact === 'High' ? 'error' : impact === 'Medium' ? 'warning' : 'success'}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="textSecondary" mb={2}>
          {description}
        </Typography>
        <Box display="flex" alignItems="center">
          <Typography variant="body2" sx={{ minWidth: 80 }}>
            Severity: {severity}/10
          </Typography>
          <LinearProgress
            variant="determinate"
            value={severity * 10}
            sx={{
              flexGrow: 1,
              ml: 2,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getColor(severity)
              }
            }}
          />
        </Box>
      </div>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Psychological Betting Analysis
        </Typography>
        {isSyncing && (
          <Chip
            icon={<Zap size={14} />}
            label="Live Syncing..."
            color="primary"
            variant="outlined"
            size="small"
            sx={{ animation: 'pulse 2s infinite' }}
          />
        )}
      </Box>

      {/* Psychology Metrics Cards */}
      {/* Psychology Metrics Box */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
        <PsychologyMetricCard
          title="Tilt Risk"
          value={tiltDetectionData.some(d => d.betsPerHour > 10) ? "High" : "Low"}
          icon={AlertTriangle}
          color={tiltDetectionData.some(d => d.betsPerHour > 10) ? "#d32f2f" : "#2e7d32"}
          description="Based on betting frequency spikes"
          content={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Probability of emotional overbetting.</Typography>
              <BlockMath math={"z_t = \\frac{bph_t - \\mu_{bph}}{\\sigma_{bph}}"} />
              <Typography variant="caption" display="block">High risk when <InlineMath math={"z_t"} /> exceeds threshold.</Typography>
            </Box>
          }
        />
        <PsychologyMetricCard
          title="Discipline Score"
          value={`${overallDisciplineScore}/100`}
          icon={Shield}
          color={overallDisciplineScore >= 70 ? "#2e7d32" : overallDisciplineScore >= 50 ? "#9e9e9e" : "#d32f2f"}
          description="Overall rule adherence rating"
          content={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Composite score 0–100 from rule adherence.</Typography>
              <BlockMath math={"Score = \\sum_j w_j \\cdot s_j, \\quad \\sum_j w_j = 1"} />
            </Box>
          }
        />
        <PsychologyMetricCard
          title="Emotional Control"
          value={`${Math.round(emotionalControlScore)}%`}
          icon={Brain}
          color={emotionalControlScore >= 70 ? "#2e7d32" : emotionalControlScore >= 50 ? "#9e9e9e" : "#d32f2f"}
          description="Consistency in decision making"
          content={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">Consistency in maintaining stake policy.</Typography>
              <BlockMath math={"Control = 100\\% - VarDeviation\\times k"} />
            </Box>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Tilt Detection Chart */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Tilt Detection Analysis</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Detect spikes in activity and stake after losses.</Typography>
                  <BlockMath math={"z^{(bph)}_t = \\frac{bph_t - \\mu}{\\sigma}, \\quad \\Delta s_t = s_t - s_{t-1}"} />
                  <Typography variant="caption" display="block">Flag tilt when <InlineMath math={"z^{(bph)}_t > z_*"} /> and <InlineMath math={"\\Delta s_t > 0"} /> following a loss.</Typography>
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <AreaChart data={sanitizeChartData(tiltDetectionData)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Date" offset={-15} position="insideBottom" style={{ fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </XAxis>
                <YAxis yAxisId="left" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Bets per Hour" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Avg Stake (₦)" angle={90} position="insideRight" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="betsPerHour"
                  stackId="1"
                  stroke="#FF6B6B"
                  fill="#FF6B6B"
                  fillOpacity={0.6}
                  name="Bets per Hour"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgStake"
                  stroke="#1976d2"
                  strokeWidth={isMobile ? 2 : 3}
                  name="Avg Stake (₦)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Discipline Radar Chart */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Discipline Metrics</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Radar scores normalized to [0, 100].</Typography>
                  <BlockMath math={"score_j = 100 \\cdot \\frac{x_j - x_j^{min}}{x_j^{max} - x_j^{min}}"} />
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 300}>
              <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "60%" : "80%"} data={sanitizeChartData(disciplineMetrics)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: isMobile ? 8 : 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenge Betting Analysis */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Revenge Betting Patterns</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Total loss accumulation after an initial loss.</Typography>
                  <BlockMath math={"OF = \\frac{|TotalLoss|}{|InitialLoss|}"} />
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sanitizeChartData(revengeBettingData)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }} barSize={isMobile ? 30 : 50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="session" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Betting Session" offset={-15} position="insideBottom" style={{ fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </XAxis>
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Loss Amount (₦)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <Tooltip 
                  formatter={(value) => [`₦${Math.abs(value)} `, '']} 
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Bar dataKey="initialLoss" fill="#EF9A9A" name="Initial Loss" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalLoss" fill="#B71C1C" name="Total Loss" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence vs Outcome */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Confidence vs Outcome Correlation</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Relationship between confidence and win probability.</Typography>
                  <BlockMath math={"p(win|c) = \\sigma(\\alpha + \\beta c)"} />
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sanitizeChartData(confidenceTrendData)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="confidence" name="Confidence" unit="/10" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Confidence Level (1-10)" offset={-15} position="insideBottom" style={{ fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </XAxis>
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} unit="%">
                  <Label value="Win Rate (%)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <Tooltip
                  formatter={(value) => [`${Math.round(value * 100)}%`, 'Win Rate']}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="winRate" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3} 
                  name="Win Probability"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overconfidence Indicator */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Overconfidence Pattern</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Bet size as a function of win streak.</Typography>
                  <BlockMath math={"E[s|streak] = \\alpha + \\beta \\cdot streak"} />
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sanitizeChartData(overconfidenceData)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="streak" name="Win Streak" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Win Streak (Count)" offset={-15} position="insideBottom" style={{ fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </XAxis>
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Avg Bet Size (₦)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <Tooltip 
                  formatter={(value) => [`₦${value} `, 'Avg Bet Size']} 
                  contentStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="avgBetSize"
                  stroke="#FF6B6B"
                  strokeWidth={isMobile ? 2 : 3}
                  dot={{ fill: '#FF6B6B', strokeWidth: 2, r: isMobile ? 4 : 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Emotional State Performance */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Performance by Emotional State</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Win rate per emotional state.</Typography>
                  <BlockMath math={"WR_s = \\frac{Wins_s}{Wins_s + Losses_s} \\times 100\\%"} />
                </Box>
              } 
            />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sanitizeChartData(emotionalStateData)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }} barSize={isMobile ? 30 : 50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="state" tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Emotional State" offset={-15} position="insideBottom" style={{ fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </XAxis>
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }}>
                  <Label value="Win Rate (%)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: isMobile ? 10 : 12, fill: '#666' }} />
                </YAxis>
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ fontSize: isMobile ? '10px' : '12px' }}>{value}</span>}
                />
                <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                  {
                    sanitizeChartData(emotionalStateData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#2e7d32' : '#d32f2f'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Behavioral Bias Analysis */}
        <Card>
          <CardContent>
            <ClickableInfoTooltip 
              title={<Typography variant="h6" gutterBottom>Behavioral Bias Analysis</Typography>} 
              content={
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" display="block">Qualitative assessment of common cognitive biases.</Typography>
                  <BlockMath math={"S_{bias} \\in [0, 10]"} />
                  <Typography variant="caption" display="block">Each item displays description and severity 0–10.</Typography>
                </Box>
              } 
            />
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {behavioralBiasData.map((bias, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <BiasIndicator {...bias} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default PsychologyTab;

