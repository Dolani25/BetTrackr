
import "./Dashboard.css";
import UserPic from "/assets/i.jpeg";
import React from "react";
import { useState, useEffect } from "react";
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import TimeSeriesChart from "./TimeSeriesChart.jsx"






import {FaArrowUp , FaPercent,FaHandHoldingUsd,  FaArrowDown,  FaCheck} from "react-icons/fa"

import { Trophy, History, Scale, Calculator, Landmark, Percent, Coins, Scissors } from 'lucide-react';

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

const data = [{name: 'Page A', uv: 400, pv: 2400, amt: 2400}, {name: 'Page B', uv: 200, pv: 1500, amt: 1300}, {name: 'Page C', uv: 300, pv: 1400, amt: 2700}];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
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
  <div style={{ fontFamily:"Playfair Display" , borderRadius:"6px", width: "100%", maxWidth: "400px", margin: "auto", position: "relative", backgroundImage:"linear-gradient(to right, #4facfe 0%, #00f2fe 100%)" }}>
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
  <img id="UserPic" src={UserPic} alt="UserPic" />
  <p className="UserText"><span>What's Up,</span><span style={{fontWeight:"600"}} > Dolani</span></p>
  <img className="UserIcon" src="./assets/dice.png" alt="BetTrackr Logo" />
</div>
);


const Dashboard = () => {
   const [data, setData] = useState([]);
   const [value, setValue] = useState('Overview');

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

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab value="Overview" label="Overview" />
          <Tab value="Statistics" label="Statistics" />
        </Tabs>
      </Box>

      <TabPanel value={"Overview"} index={"Overview"}>
        <Typography>Overview content goes here</Typography>
      </TabPanel>
      <TabPanel value={"Statistics"} index={"Statistics"}>
        <Typography>Statistics content goes here</Typography>
      </TabPanel>
      
      <Card bg="linear-gradient(to right top, #50c9c3, #64cec9, #76d4cf, #86d9d4, #96deda)" action="staked" amount="45195.16" icon={<Coins color="#50c9c3" />} />
      <Card bg="linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)" action="last win"  amount="80672.95" icon={<History color="#fbc2eb" />} />
      <Card bg="radial-gradient(circle 248px at center, #16d9e3 0%, #30c7ec 47%, #46aef7 100%)" action="Withdrawn" amount="29896.04" icon={<Landmark color="#46aef7" />} />
      <Card bg=" linear-gradient(120deg, #a6c0fe 0%, #f68084 100%)" action="money lost since last win" amount="36552.23" icon={<Scissors color="#f68084"/>} />

      <Card bg="linear-gradient(120deg, #f6d365 0%, #fda085 100%)" action="highest amount won"  amount="1562570.75" icon={<Trophy color="#ffd700"/>} />
      
      
      
      <Card bg="linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)" action="win to loss ratio" amount="300470" icon={<Scale color="#d4fc79"/>} />

       <Card bg="linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)" action="Kelly Criterion" amount="416" icon={<Calculator color="#e0c3fc" />} />

        
        <Card bg=" linear-gradient(to left bottom, #051937, #004d7a, #008793, #00bf72, #a8eb12)" action="odds" amount="300" icon={<Percent color="#f6d365" />} />
         <Card bg="linear-gradient(to right, #43e97b 0%, #38f9d7 100%)" action="staked" amount="45195.16" icon={<FaArrowUp color="#43e97b" />} />
          <Card bg="linear-gradient(-225deg, #A445B2 0%, #D41872 52%, #FF0066 100%)" action="Charts" amount="100"  icon={<FaCheck color="#A445b2" />} />
          
          {renderLineChart}
          
          {renderDonutChart}
          
          <TimeSeriesChart data={data} />
      
    </div>
  );
};

export default Dashboard;