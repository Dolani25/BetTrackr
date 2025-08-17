import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, AppBar, Toolbar, Avatar, Button } from '@mui/material';
import { LogOut, User } from 'lucide-react';
import OverviewTab from './components/OverviewTab';
import BettingBehaviorTab from './components/BettingBehaviorTab';
import PsychologyTab from './components/PsychologyTab';
import UserPic from "/assets/i.jpeg";
import './Dashboard.css';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

const EnhancedDashboard = ({ onLogout }) => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const formatCurrency = (amount) => {
    return '₦' + new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: '#1976d2', boxShadow: 'none' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="./assets/dice.png" 
              alt="BetTrackr Logo" 
              style={{ width: 32, height: 32, marginRight: 16 }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              BetTrackr
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Your Balance
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(82737573.76)}
              </Typography>
            </Box>
            
            <Avatar 
              src={UserPic} 
              alt="User" 
              sx={{ width: 40, height: 40 }}
            />
            
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                What's Up,
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Dolani
              </Typography>
            </Box>
            
            <Button
              color="inherit"
              onClick={onLogout}
              startIcon={<LogOut size={16} />}
              sx={{ ml: 2 }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="dashboard tabs"
          sx={{ px: 3 }}
        >
          <Tab 
            label="Overview" 
            {...a11yProps(0)}
            sx={{ 
              textTransform: 'none', 
              fontSize: '1rem',
              fontWeight: value === 0 ? 'bold' : 'normal'
            }}
          />
          <Tab 
            label="Betting Behavior" 
            {...a11yProps(1)}
            sx={{ 
              textTransform: 'none', 
              fontSize: '1rem',
              fontWeight: value === 1 ? 'bold' : 'normal'
            }}
          />
          <Tab 
            label="Psychology" 
            {...a11yProps(2)}
            sx={{ 
              textTransform: 'none', 
              fontSize: '1rem',
              fontWeight: value === 2 ? 'bold' : 'normal'
            }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={value} index={0}>
        <OverviewTab />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <BettingBehaviorTab />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <PsychologyTab />
      </TabPanel>
    </Box>
  );
};

export default EnhancedDashboard;

