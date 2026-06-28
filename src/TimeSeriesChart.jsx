import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

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
          />
          <YAxis 
            tick={{ fill: '#ffffff', fontSize: 12 }}
            axisLine={{ stroke: '#ffffff', opacity: 0.5 }}
            tickLine={{ stroke: '#ffffff', opacity: 0.5 }}
          />
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
          <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={3} dot={{ fill: '#ffffff', strokeWidth: 2, r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <button 
          onClick={isPlaying ? pauseAnimation : startAnimation}
          style={{
            backgroundColor: "#ffffff",
            color: "#667eea",
            border: "2px solid #667eea",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "1px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#667eea";
            e.target.style.color = "#ffffff";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#ffffff";
            e.target.style.color = "#667eea";
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
};

export default TimeSeriesChart;