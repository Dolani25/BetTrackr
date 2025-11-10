import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent, Tooltip as MuiTooltip } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, Trophy, History, Scale, Calculator, Landmark, Percent, Coins, Scissors } from 'lucide-react';
import {FaArrowUp, FaPercent, FaHandHoldingUsd, FaArrowDown, FaCheck} from "react-icons/fa";
import TimeSeriesChart from '../TimeSeriesChart';

const OverviewTab = () => {
  // Sample data for demonstrations
  const monthlyPLData = [
    { month: 'Jan', profit: 1200, loss: -800, net: 400 },
    { month: 'Feb', profit: 1500, loss: -600, net: 900 },
    { month: 'Mar', profit: 800, loss: -1200, net: -400 },
    { month: 'Apr', profit: 2000, loss: -500, net: 1500 },
    { month: 'May', profit: 1800, loss: -900, net: 900 },
    { month: 'Jun', profit: 2200, loss: -700, net: 1500 }
  ];

  const winLossData = [
    { name: 'Wins', value: 65, color: '#4CAF50' },
    { name: 'Losses', value: 25, color: '#F44336' },
    { name: 'Draws', value: 10, color: '#FF9800' }
  ];

  const betAmountDistribution = [
    { range: '$10-50', count: 45 },
    { range: '$50-100', count: 32 },
    { range: '$100-200', count: 18 },
    { range: '$200-500', count: 12 },
    { range: '$500+', count: 8 }
  ];

  const roiTrendData = [
    { week: 'W1', roi: 5.2 },
    { week: 'W2', roi: 8.1 },
    { week: 'W3', roi: -2.3 },
    { week: 'W4', roi: 12.5 },
    { week: 'W5', roi: 7.8 },
    { week: 'W6', roi: 15.2 }
  ];

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
                  {title === 'Total Bets' && (
                    <>
                      <Typography variant="caption" display="block">Total number of bets placed.</Typography>
                      <BlockMath math={"TotalBets = \sum_{i=1}^{N} 1"} />
                    </>
                  )}
                  {title === 'Win Rate' && (
                    <>
                      <Typography variant="caption" display="block">Percentage of winning bets.</Typography>
                      <BlockMath math={"WR = \\frac{Wins}{Wins + Losses} \\times 100\\%"} />
                    </>
                  )}
                  {title === 'Total P&L' && (
                    <>
                      <Typography variant="caption" display="block">Sum of profits and losses.</Typography>
                      <BlockMath math={"P\\&L = \sum_i (P_i - L_i)"} />
                    </>
                  )}
                  {title === 'Avg Bet Amount' && (
                    <>
                      <Typography variant="caption" display="block">Average stake per bet.</Typography>
                      <BlockMath math={"\n\\bar{s} = \\frac{1}{N} \sum_{i=1}^{N} s_i"} />
                    </>
                  )}
                  {title === 'Best Streak' && (
                    <>
                      <Typography variant="caption" display="block">Longest consecutive wins.</Typography>
                      <Typography variant="caption" display="block">Computed from the longest run in outcomes.</Typography>
                    </>
                  )}
                  {title === 'Current Streak' && (
                    <>
                      <Typography variant="caption" display="block">Consecutive wins in latest run.</Typography>
                    </>
                  )}
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
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? <TrendingUp size={16} color="#4CAF50" /> : <TrendingDown size={16} color="#F44336" />}
                <Typography variant="body2" sx={{ ml: 0.5, color: trend > 0 ? '#4CAF50' : '#F44336' }}>
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
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
          <StatCard 
            title="Total Bets" 
            value="1,247" 
            icon={Target} 
            trend={12.5}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Win Rate" 
            value="65.2%" 
            icon={Trophy} 
            trend={3.2}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Total P&L" 
            value="$4,850" 
            icon={DollarSign} 
            trend={8.7}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Avg Bet Amount" 
            value="$125" 
            icon={DollarSign} 
            trend={-2.1}
            color="#9C27B0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Best Streak" 
            value="12 Wins" 
            icon={TrendingUp} 
            color="#00BCD4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Current Streak" 
            value="3 Wins" 
            icon={Calendar} 
            color="#8BC34A"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Monthly P&L Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Monthly net = Profit + Loss (loss values are negative).</Typography>
                    <BlockMath math={"Net_m = Profit_m + Loss_m"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Monthly Profit & Loss
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyPLData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stroke="#1976d2" 
                    fill="url(#colorNet)" 
                    name="Net P&L"
                  />
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        

        {/* Bet Amount Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Histogram of stake counts per range.</Typography>
                    <BlockMath math={"count(r) = \\sum_i 1\\{ s_i \\in r \\}"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Bet Amount Distribution
                </Typography>
              </MuiTooltip>
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

        {/* ROI Trend */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MuiTooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" display="block">Return on Investment per week.</Typography>
                    <BlockMath math={"ROI = \\frac{Profit - Stake}{Stake} \\times 100\\%"} />
                  </Box>
                }
              >
                <Typography variant="h6" gutterBottom>
                  ROI Trend (Weekly)
                </Typography>
              </MuiTooltip>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={roiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'ROI']} />
                  <Line 
                    type="monotone" 
                    dataKey="roi" 
                    stroke="#FF6B6B" 
                    strokeWidth={3}
                    dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Dashboard Cards - Original Styling (now with tooltips) */}
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
          <h3>₦45,195.16</h3>
        </span>
        <div className="CardIcon"><Coins color="#50c9c3" /></div>
      </div>
      </MuiTooltip>
      
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
          <h3>₦80,672.95</h3>
        </span>
        <div className="CardIcon"><History color="#fbc2eb" /></div>
      </div>
      </MuiTooltip>
      
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
          <p>Withdrawn</p>
          <h3>₦29,896.04</h3>
        </span>
        <div className="CardIcon"><Landmark color="#46aef7" /></div>
      </div>
      </MuiTooltip>
      
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
          <p>money lost since last win</p>
          <h3>₦36,552.23</h3>
        </span>
        <div className="CardIcon"><Scissors color="#f68084"/></div>
      </div>
      </MuiTooltip>
      
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
          <h3>₦1,562,570.75</h3>
        </span>
        <div className="CardIcon"><Trophy color="#ffd700"/></div>
      </div>
      </MuiTooltip>
      
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Ratio of wins to losses.</Typography>
            <BlockMath math={"W:L = \\frac{Wins}{Losses}"} />
            <Typography variant="caption" display="block">Related to win rate <InlineMath math={"WR = \\tfrac{Wins}{Wins+Losses}"}/>.</Typography>
          </Box>
        }
      >
      <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)" }}>
        <span>
          <p>win to loss ratio</p>
          <h3>₦300,470</h3>
        </span>
        <div className="CardIcon"><Scale color="#d4fc79"/></div>
      </div>
      </MuiTooltip>
      
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Optimal fraction to stake given edge and odds.</Typography>
            <BlockMath math={"f^* = \\frac{bp - q}{b}"} />
            <Typography variant="caption" display="block">where <InlineMath math={"b"}/> = odds−1, <InlineMath math={"p"}/> = win prob, <InlineMath math={"q=1-p"}/>.</Typography>
          </Box>
        }
      >
      <div className="Card" style={{ backgroundImage: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)" }}>
        <span>
          <p>Kelly Criterion</p>
          <h3>₦416</h3>
        </span>
        <div className="CardIcon"><Calculator color="#e0c3fc" /></div>
      </div>
      </MuiTooltip>
      
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
      <div className="Card" style={{ backgroundImage: "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)" }}>
        <span>
          <p>staked</p>
          <h3>₦45,195.16</h3>
        </span>
        <div className="CardIcon"><FaArrowUp color="#43e97b" /></div>
      </div>
      </MuiTooltip>
      
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Summary card showing chart-related KPI.</Typography>
          </Box>
        }
      >
      <div className="Card" style={{ backgroundImage: "linear-gradient(-225deg, #A445B2 0%, #D41872 52%, #FF0066 100%)" }}>
        <span>
          <p>Charts</p>
          <h3>₦100</h3>
        </span>
        <div className="CardIcon"><FaCheck color="#A445b2" /></div>
      </div>
      </MuiTooltip>
      
      {/* Line Chart - Original Styling (with tooltip) */}
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Generic time series display.</Typography>
            <Typography variant="caption" display="block">Change over time: <InlineMath math={"\\Delta x_t = x_t - x_{t-1}"}/></Typography>
          </Box>
        }
      >
      <div style={{ marginBottom:"3vmin", fontFamily:"Playfair Display" , paddingTop:"3vmin" , borderRadius:"6px", backgroundImage:"linear-gradient(to top, #0ba360 0%, #3cba92 100%)" , height:"auto", minHeight:"300px", width: "100%", maxWidth: "none", overflowX: "hidden", overflowY: "hidden", padding: "20px", boxSizing: "border-box" }}>
        <p style={{ marginBottom:"2vmin" ,marginLeft:"2vmin" ,fontWeight:"600", color:"#fff", fontSize:"", textTransform:"uppercase"}}> Chart</p>
        <ResponsiveContainer width="90%" height={250}>
          <LineChart data={[
            {name: 'Page A', uv: 400, pv: 2400, amt: 2400}, 
            {name: 'Page B', uv: 200, pv: 1500, amt: 1300}, 
            {name: 'Page C', uv: 300, pv: 1400, amt: 2700}
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
      
      {/* Donut Chart - Original Styling (with tooltip) */}
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Distribution of outcomes; segments sum to 100%.</Typography>
            <BlockMath math={"\\sum_k p_k = 1"} />
          </Box>
        }
      >
      <div id="Donut" style={{ fontFamily:"Playfair Display" , borderRadius:"6px", textTransform:"uppercase" , width: "100%", maxWidth: "2000px", padding:"0vmin", margin: "auto", position: "relative", backgroundImage:"linear-gradient(to right, #4facfe 0%, #00f2fe 100%)" }}>
        <p style={{ marginBottom:"2vmin", marginLeft:"2vmin", fontWeight:"600", color:"#fff", fontSize:"16px", textTransform:"uppercase", textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>Win/Loss Distribution</p>
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
          textTransform:"uppercase",
          color: "#333"
        }}>
          <div>Total games played</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>3519</div>
        </div>
      </div>
      </MuiTooltip>
      
      {/* Time Series Chart Container (with tooltip) */}
      <MuiTooltip
        arrow
        placement="top"
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" display="block">Time series of a KPI over dates.</Typography>
            <Typography variant="caption" display="block">Moving average: <InlineMath math={"MA_k(t) = \\frac{1}{k} \\sum_{i=0}^{k-1} x_{t-i}"}/></Typography>
          </Box>
        }
      >
      <div style={{ 
        marginTop:"3vmin",
        marginBottom:"3vmin", 
        fontFamily:"Playfair Display", 
        paddingTop:"3vmin", 
        borderRadius:"6px", 
        backgroundImage:"linear-gradient(to top, #667eea 0%, #764ba2 100%)", 
        height:"auto", 
        minHeight:"350px", 
        width: "100%", 
        maxWidth: "none", 
        overflowX: "hidden", 
        overflowY: "hidden", 
        padding: "20px", 
        boxSizing: "border-box" 
      }}>
        <p style={{ marginBottom:"2vmin", marginLeft:"2vmin", fontWeight:"600", color:"#ffffff", fontSize:"16px", textTransform:"uppercase", textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>Time Series Chart</p>
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
  );
};

export default OverviewTab;
