import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, Trophy } from 'lucide-react';

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
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {title}
            </Typography>
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
              <Typography variant="h6" gutterBottom>
                Monthly Profit & Loss
              </Typography>
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

        {/* Win/Loss Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Win/Loss Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bet Amount Distribution */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bet Amount Distribution
              </Typography>
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
              <Typography variant="h6" gutterBottom>
                ROI Trend (Weekly)
              </Typography>
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
    </Box>
  );
};

export default OverviewTab;

