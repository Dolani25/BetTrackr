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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={(tick) => new Date(tick).toLocaleDateString()} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="steelblue" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      
      <div>
        <button onClick={isPlaying ? pauseAnimation : startAnimation}>
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
};

export default TimeSeriesChart;