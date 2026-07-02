import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from "recharts";
import { Play, Pause } from "lucide-react";

const TimeSeriesChart = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = React.useRef(null);

  // Start animation
  const startAnimation = () => {
    if (isPlaying) return;
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex < data.length - 1) {
          return prevIndex + 1;
        } else {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prevIndex;
        }
      });
    }, 500);
  };

  // Pause animation
  const pauseAnimation = () => {
    setIsPlaying(false);
    clearInterval(intervalRef.current);
  };

  // Stop interval when component unmounts
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const getTimeSpan = () => {
    if (data.length < 2) return 0;
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  };
  const isShortSpan = getTimeSpan() < 24 * 60 * 60 * 1000;

  const currentData = data.slice(0, currentIndex + 1);
  const tsMax = Math.max(...currentData.map(d => d.value), 0);
  const tsMin = Math.min(...currentData.map(d => d.value), 0);
  const offTs = tsMax <= 0 ? 0 : tsMin >= 0 ? 1 : tsMax / (tsMax - tsMin);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data.slice(0, currentIndex + 1)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.3} />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(tick) => {
              const d = new Date(tick);
              return isShortSpan 
                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                : d.toLocaleDateString();
            }}
            tick={{ fill: '#ffffff', fontSize: 12 }}
            axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
            tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
          >
            <Label value="Time" offset={-5} position="insideBottom" style={{ fontSize: 12, fill: '#ffffff', opacity: 0.8 }} />
          </XAxis>
          <YAxis 
            tick={{ fill: '#ffffff', fontSize: 12 }}
            axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
            tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
          >
            <Label value="Profit/Loss (₦)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: 12, fill: '#ffffff', opacity: 0.8 }} />
          </YAxis>
          <Tooltip 
            labelFormatter={(label) => new Date(label).toLocaleString()}
            formatter={(value) => [
              <span style={{ color: value >= 0 ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
                ₦{Number(value).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>, 
              'Profit/Loss'
            ]}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
              border: '2px solid #667eea',
              borderRadius: '8px',
              color: '#333',
              fontSize: '13px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          />
          <defs>
            <linearGradient id="colorTs" x1="0" y1="0" x2="0" y2="1">
              <stop offset={offTs} stopColor="#4CAF50" stopOpacity={1}/>
              <stop offset={offTs} stopColor="#F44336" stopOpacity={1}/>
            </linearGradient>
          </defs>
          <Line type="monotone" dataKey="value" stroke="url(#colorTs)" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <button 
          onClick={isPlaying ? pauseAnimation : startAnimation}
          title={isPlaying ? "Pause" : "Play"}
          style={{
            backgroundColor: "#ffffff",
            color: "#667eea",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#667eea";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.color = "#667eea";
          }}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
        </button>
      </div>
    </div>
  );
};

export default TimeSeriesChart;