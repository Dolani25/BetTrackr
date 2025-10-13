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

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data.slice(0, currentIndex + 1)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.3} />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(tick) => new Date(tick).toLocaleDateString()} 
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
              border: '1px solid #667eea',
              borderRadius: '8px',
              color: '#333'
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