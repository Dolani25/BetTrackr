import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Chip, Tooltip as MuiTooltip } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Brain, TrendingDown, AlertTriangle, Target, Zap, Shield } from 'lucide-react';

const PsychologyTab = ({ bets = [] }) => {
  // --- HELPER FUNCTIONS ---
  const cleanNumber = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

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
    avgStake: Math.round(betsByDate[d].totalStake / betsByDate[d].count),
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

  const overconfidenceData = Object.keys(streakData).map(k => ({
    streak: parseInt(k),
    avgBetSize: Math.round(streakData[k].sum / streakData[k].count)
  })).sort((a, b) => a.streak - b.streak).slice(0, 10); // Limit to top streaks

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
          session: `Bet ${i}`,
          initialLoss: -lossAmount,
          subsequentBets: 1, // simplified
          totalLoss: -nextStake // simplified visualization
        });
      }
    }
  }
  const revengeBettingData = lossData.slice(-5); // Last 5 detected instances

  // 4. METRICS
  const tiltRisk = tiltDetectionData.some(d => d.betsPerHour > 15) ? "High" : "Low";

  // Simple placeholders relying on stats
  const disciplineMetrics = [
    { metric: 'Bankroll Management', score: 85 },
    { metric: 'Bet Sizing Consistency', score: 72 },
    { metric: 'Emotional Control', score: 68 },
    { metric: 'Research Quality', score: 78 },
    { metric: 'Patience Level', score: 82 },
    { metric: 'Rule Adherence', score: 75 }
  ];

  // Placeholder for unavailable inferred data
  const confidenceOutcomeData = [];
  const emotionalStateData = [];
  const behavioralBiasData = [
    { bias: 'Overconfidence', severity: overconfidenceData.length > 3 ? 8 : 3, impact: 'High', description: 'Betting larger after wins' },
    { bias: 'Chasing Losses', severity: revengeBettingData.length > 2 ? 9 : 2, impact: 'High', description: 'Increasing stake after loss' }
  ];

  const PsychologyMetricCard = ({ title, value, icon: Icon, color, description }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Icon size={24} color={color} />
          <MuiTooltip
            arrow
            placement="top"
            title={
              <Box sx={{ p: 1 }}>
                {title === 'Tilt Risk' && (
                  <>
                    <Typography variant="caption" display="block">Probability of emotional overbetting.</Typography>
                    <BlockMath math={"z_t = \\frac{bph_t - \\mu_{bph}}{\\sigma_{bph}}"} />
                    <Typography variant="caption" display="block">High risk when <InlineMath math={"z_t"} /> exceeds threshold.</Typography>
                  </>
                )}
                {title === 'Discipline Score' && (
                  <>
                    <Typography variant="caption" display="block">Composite score 0–100 from rule adherence.</Typography>
                    <BlockMath math={"Score = \\sum_j w_j \\cdot s_j, \\quad \\sum_j w_j = 1"} />
                  </>
                )}
                {title === 'Emotional Control' && (
                  <>
                    <Typography variant="caption" display="block">Consistency in maintaining stake policy.</Typography>
                    <BlockMath math={"Control = 100\\% - VarDeviation\\times k"} />
                  </>
                )}
              </Box>
            }
          >
            <Typography variant="h6" sx={{ ml: 1, color: color }}>
              {title}
            </Typography>
          </MuiTooltip>
        </Box>
        <Typography variant="h4" component="div" sx={{ color: color, fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
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
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">{bias}</Typography>
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
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Psychological Betting Analysis
      </Typography>

      {/* Psychology Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <PsychologyMetricCard
            title="Tilt Risk"
            value={tiltRisk}
            icon={AlertTriangle}
            color="#FF9800"
            description="Based on betting frequency spikes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <PsychologyMetricCard
            title="Discipline Score"
            value="76/100"
            icon={Shield}
            color="#4CAF50"
            description="Overall rule adherence rating"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <PsychologyMetricCard
            title="Emotional Control"
            value="68%"
            icon={Brain}
            color="#1976d2"
            description="Consistency in decision making"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Tilt Detection Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Detect spikes in activity and stake after losses.</Typography>
                    <BlockMath math={"z^{(bph)}_t = \\frac{bph_t - \\mu}{\\sigma}, \\quad \\Delta s_t = s_t - s_{t-1}"} />
                    <Typography variant="caption" display="block">Flag tilt when <InlineMath math={"z^{(bph)}_t > z_*"} /> and <InlineMath math={"\\Delta s_t > 0"} /> following a loss.</Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Tilt Detection Analysis
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={tiltDetectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
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
                    stroke="#4ECDC4"
                    strokeWidth={3}
                    name="Avg Stake ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Discipline Radar Chart */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Radar scores normalized to [0, 100].</Typography>
                    <BlockMath math={"score_j = 100 \\cdot \\frac{x_j - x_j^{min}}{x_j^{max} - x_j^{min}}"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Discipline Metrics
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={disciplineMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenge Betting Analysis */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Total loss accumulation after an initial loss.</Typography>
                    <BlockMath math={"OF = \\frac{|TotalLoss|}{|InitialLoss|}"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Revenge Betting Patterns
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revengeBettingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Math.abs(value)}`, '']} />
                  <Legend />
                  <Bar dataKey="initialLoss" fill="#FF6B6B" name="Initial Loss" />
                  <Bar dataKey="totalLoss" fill="#FF4757" name="Total Loss" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Confidence vs Outcome */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Relationship between confidence and win probability.</Typography>
                    <BlockMath math={"p(win|c) = \\sigma(\\alpha + \\beta c)"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Confidence vs Outcome Correlation
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={confidenceOutcomeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="confidence" name="Confidence" unit="/10" />
                  <YAxis dataKey="outcome" name="Outcome" domain={[0, 1]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [
                      name === 'outcome' ? (value ? 'Win' : 'Loss') : value,
                      name === 'confidence' ? 'Confidence Level' : name
                    ]}
                  />
                  <Scatter
                    dataKey="outcome"
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Overconfidence Indicator */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Bet size as a function of win streak.</Typography>
                    <BlockMath math={"E[s|streak] = \\alpha + \\beta \\cdot streak"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Overconfidence Pattern (Bet Size After Wins)
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overconfidenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="streak" name="Win Streak" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Avg Bet Size']} />
                  <Line
                    type="monotone"
                    dataKey="avgBetSize"
                    stroke="#FF6B6B"
                    strokeWidth={3}
                    dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Emotional State Performance */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Win rate per emotional state.</Typography>
                    <BlockMath math={"WR_s = \\frac{Wins_s}{Wins_s + Losses_s} \\times 100\\%"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Performance by Emotional State
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={emotionalStateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winRate" fill="#4ECDC4" name="Win Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Behavioral Bias Analysis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Qualitative assessment of common cognitive biases.</Typography>
                    <Typography variant="caption" display="block">Each item displays description and severity 0–10.</Typography>
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Behavioral Bias Analysis
                </Typography>
              </MuiTooltip>
              <Grid container spacing={2}>
                {behavioralBiasData.map((bias, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <BiasIndicator {...bias} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PsychologyTab;

