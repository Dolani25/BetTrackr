
import "./Dashboard.css";
import UserPic from "/assets/i.jpeg";
import React, { useState, useEffect, useMemo } from "react";
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import TimeSeriesChart from "./TimeSeriesChart.jsx"

import OverviewTab from './components/OverviewTab';
import BettingBehaviorTab from './components/BettingBehaviorTab';
import PsychologyTab from './components/PsychologyTab';




import {FaArrowUp , FaPercent,FaHandHoldingUsd,  FaArrowDown,  FaCheck, FaPlus} from "react-icons/fa"

import { Trophy, History, Scale, Calculator, Landmark, Percent, Coins, Scissors } from 'lucide-react';

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

const data = [{name: 'Page A', uv: 400, pv: 2400, amt: 2400}, {name: 'Page B', uv: 200, pv: 1500, amt: 1300}, {name: 'Page C', uv: 300, pv: 1400, amt: 2700}];

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


// Data for the donut chart
const donutData = [
  { name: "Wins", value: 45 },
  { name: "Losses", value: 30 },
  { name: "Draws", value: 25 },
];

// Define gradient colors for the arcs
const GRADIENT_COLORS = [
  "url(#winGradient)",
  "url(#lossGradient)",
  "url(#drawGradient)",
];

const renderDonutChart = (
  <div id="Donut" style={{ fontFamily:"Playfair Display" , borderRadius:"6px", textTransform:"uppercase" , width: "100%", maxWidth: "2000px", padding:"0vmin", margin: "auto", position: "relative", backgroundImage:"linear-gradient(to right, #4facfe 0%, #00f2fe 100%)" }}>
          <p>Win/Loss Distribution</p>
    {/* SVG Gradients for Arc Colors */}
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

    {/* Donut Chart */}
    <ResponsiveContainer width="100%" height={300}>

      <PieChart>
        <Pie
          data={donutData}
          cx="50%"
          cy="50%"
          innerRadius={70} // Makes it a donut chart
          outerRadius={100}
          paddingAngle={2}
          cornerRadius={2}
          dataKey="value"
        >
          {donutData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>

    {/* Centered Text */}
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "16px",
        textTransform:"uppercase",
        color: "#333",
      }}
    >
      <div>Total games played</div>
      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>3519</div>
    </div>
  </div>
);

const renderLineChart = (
  <div style={{ marginBottom:"3vmin", fontFamily:"Playfair Display" , paddingTop:"3vmin" , borderRadius:"6px", backgroundImage:"linear-gradient(to top, #0ba360 0%, #3cba92 100%)" , height:"35vh", width: "100%", maxWidth: "100vw", overflowX: "auto" }}>
    <p style={{ marginBottom:"5vmin" ,marginLeft:"4vmin" ,fontWeight:"600", color:"#fff", fontSize:"", textTransform:"uppercase"}}> Chart</p>
    <LineChart style={{fontFamily:"Playfair Display"}} width={window.innerWidth * 0.9} height={200} data={data}>
      <Line type="monotone" dataKey="uv" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
    </LineChart>
  </div>
);

  // Format currency To display the Naira symbol (â‚¦) 

const formatCurrency = (amount) => {
  return '₦' + new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
};



const Card = ({ bg ,icon ,action, amount}) => (
  <div style={{ backgroundImage: bg }} className="Card">
    <span>
    <p>{action}</p>
    <h3>{formatCurrency(amount)}</h3>
    </span>
        <div className="CardIcon">{icon}</div>
  </div>
);

const Balance = () => (
  <div className="Balance">
    <h2>{formatCurrency(82737573.76)}</h2>
    <h5>YOUR BALANCE</h5>
  </div>
);

const User = () => (
  <div className="User">
    <div style={{ position: "relative", display: "inline-block" }}>
      <img id="UserPic" src={UserPic} alt="UserPic" />
      <div style={{
        position: "absolute",
        bottom: "2px",
        right: "2px",
        width: "18px",
        height: "18px",
        backgroundColor: "#283038",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid white"
      }}>
        <FaPlus style={{ fontSize: "10px", color: "#f1f1f1" }} />
      </div>
    </div>
    <p className="UserText"><span>What's Up,</span><span style={{fontWeight:"600"}} > Dolani</span></p>
    <img className="UserIcon" src="./assets/dice.png" alt="BetTrackr Logo" />
  </div>
);


const Dashboard = () => {
   const [data, setData] = useState([]);
   const [value, setValue] = useState(0);

   const handleChange = (event, newValue) => {
       setValue(newValue);
   };


   useEffect(() => {
      setData([
      { timestamp: "2024-03-01", value: 50 },



      { timestamp: "2024-03-02", value: 70 },
      { timestamp: "2024-03-03", value: 30 },
      { timestamp: "2024-03-04", value: 90 },
      { timestamp: "2024-03-05", value: 40 }
    ]);
  }, []);


  return (
    <div id="Dashboard" >
      <User />
      <Balance />

            {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="dashboard tabs"
          sx={{ 
            px: 3,
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-evenly'
            }
          }}
        >
          <Tab 
            label="Overview" 
            value={0}
            sx={{ 
              textTransform: 'none', 
              fontSize: '1rem',
              fontWeight: value === 0 ? 'bold' : 'normal'
            }}
          />
          <Tab 
            label="Betting Behavior" 
            value={1}
            sx={{ 
              textTransform: 'none', 
              fontSize: '1rem',
        fontWeight: value === 1 ? 'bold' : 'normal'
            }}
          />
          <Tab 
            label="Psychology" 
            value={2}
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
        {value === 0 && <OverviewTab />}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {value === 1 && <BettingBehaviorTab />}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {value === 2 && <PsychologyTab />}
      </TabPanel>
    
      
    </div>
  );
};

export default Dashboard;