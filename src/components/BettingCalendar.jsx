import React from 'react';
import { Box, Typography, Tooltip as MuiTooltip } from '@mui/material';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const BettingCalendar = ({ bets }) => {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  
  // Config to match D3 look
  const gap = 1; // unit in SVG space
  const cell = 11; // unit in SVG space (scales with viewBox)
  const marginTop = 16; // room for month labels
  const marginLeft = 20; // room for weekday labels inside SVG

  // Process data and find available years
  const { processedData, availableYears } = React.useMemo(() => {
    if (!bets || !Array.isArray(bets)) return { processedData: [], availableYears: [new Date().getFullYear()] };
    
    const dailyMap = new Map();
    const yearsSet = new Set();
    
    bets.forEach(bet => {
      const d = new Date(bet.Date);
      if (isNaN(d.getTime())) return;
      
      const year = d.getFullYear();
      yearsSet.add(year);
      
      const dateStr = d.toDateString();
      const status = bet.Status?.toLowerCase() || '';
      const isWin = status.includes('won');
      const isLoss = status.includes('lost');
      
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { date: new Date(d), wins: 0, losses: 0, count: 0, year });
      }
      
      const dayData = dailyMap.get(dateStr);
      dayData.count++;
      if (isWin) dayData.wins++;
      if (isLoss) dayData.losses++;
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    if (years.length === 0) years.push(new Date().getFullYear());

    const data = Array.from(dailyMap.values()).map(d => ({
      date: d.date,
      result: d.wins >= d.losses ? 'win' : 'loss',
      count: d.count,
      year: d.year
    }));

    return { processedData: data, availableYears: years };
  }, [bets]);

  // Set initial year to most recent if current year has no data
  React.useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  // Quick lookup map by date string for SELECTED YEAR ONLY
  const dataMap = React.useMemo(() => {
    const map = new Map();
    processedData.filter(d => d.year === selectedYear).forEach((d) => {
      map.set(d.date.toDateString(), d);
    });
    return map;
  }, [processedData, selectedYear]);

  // Compute all days covering full weeks of the selected year
  const start = new Date(selectedYear, 0, 1);
  const end = new Date(selectedYear, 11, 31);
  const startSunday = new Date(start);
  startSunday.setDate(start.getDate() - ((start.getDay() + 7) % 7));
  const endSaturday = new Date(end);
  endSaturday.setDate(end.getDate() + (6 - end.getDay()));

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal = Math.round((endSaturday - startSunday) / msPerDay) + 1;
  const totalWeeks = Math.ceil(daysTotal / 7);

  // Collect all dates for the year only (for cells)
  const allDays = [];
  for (let dt = new Date(startSunday); dt <= endSaturday; dt.setDate(dt.getDate() + 1)) {
    const date = new Date(dt);
    const daysFromStart = Math.floor((date - startSunday) / msPerDay);
    const weekday = date.getDay(); // 0..6
    const weekIndex = Math.floor(daysFromStart / 7);
    const d = dataMap.get(date.toDateString());
    // Signed value: wins positive, losses negative; magnitude = count
    const value = d ? (d.result === 'win' ? d.count : -d.count) : 0;
    allDays.push({ date, weekday, weekIndex, data: d, value });
  }

  // Month label anchors -> week index for first day of month
  const monthAnchors = Array.from({ length: 12 }, (_, m) => {
    const first = new Date(selectedYear, m, 1);
    const weekIndex = Math.floor((first - startSunday) / msPerDay / 7);
    return { m, weekIndex, name: first.toLocaleDateString('en-US', { month: 'short' }) };
  });

  // SVG viewBox sizing (responsive via width:100%)
  const gridWidth = totalWeeks * (cell + gap) - gap;
  const svgWidth = marginLeft + gridWidth;
  const svgHeight = marginTop + 7 * (cell + gap) - gap;

  // Continuous diverging color scale centered at 0
  const maxCount = Math.max(1, ...Array.from(dataMap.values()).map(d => d.count));
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const hexToRgb = (hex) => {
    const v = hex.replace('#','');
    const n = parseInt(v.length===3 ? v.split('').map(c=>c+c).join('') : v, 16);
    return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
  };
  const rgbToHex = ({r,g,b}) => '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  const lerp = (a,b,t) => a + (b-a)*t;
  const mix = (c1, c2, t) => {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex({ r: Math.round(lerp(a.r,b.r,t)), g: Math.round(lerp(a.g,b.g,t)), b: Math.round(lerp(a.b,b.b,t)) });
  };
  const NEG = '#c44569';     // strong loss
  const NEG_LIGHT = '#ffb3ba';
  const NEU = '#ebedf0';     // neutral
  const POS_LIGHT = '#9be9a8';
  const POS = '#216e39';     // strong win
  const colorForValue = (v) => {
    if (v === 0) return NEU;
    const t = clamp01(Math.abs(v) / maxCount); // 0..1 by magnitude
    if (v < 0) {
      // interpolate NEG_LIGHT -> NEG by t
      return mix(NEG_LIGHT, NEG, t);
    }
    // interpolate POS_LIGHT -> POS by t
    return mix(POS_LIGHT, POS, t);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
        <MuiTooltip
          arrow
          placement="top"
          title={
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" display="block">
                Daily activity across the year. Green = wins, Pink = losses. Intensity ∝ number of bets that day.
              </Typography>
              <BlockMath math={"v_d = \\mathrm{sgn}(result_d) \\cdot count_d"} />
              <BlockMath math={"t_d = \\frac{|v_d|}{\\max_k |v_k|} \\in [0,1]"} />
              <Typography variant="caption" display="block">
                Color map: <InlineMath math={"v_d < 0"}/> → pink-red, <InlineMath math={"v_d = 0"}/> → neutral gray, <InlineMath math={"v_d > 0"}/> → green.
              </Typography>
            </Box>
          }
        >
          <Typography variant="h6">
            Betting Activity Calendar {selectedYear}
          </Typography>
        </MuiTooltip>

        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mt: { xs: 1, sm: 0 },
          overflowX: 'auto',
          maxWidth: '100%',
          pb: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          flexWrap: 'nowrap'
        }}>
          {availableYears.map(yr => (
            <Box
              key={yr}
              onClick={() => setSelectedYear(yr)}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '16px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                backgroundColor: selectedYear === yr ? '#216e39' : '#ebedf0',
                color: selectedYear === yr ? 'white' : 'text.secondary',
                fontWeight: selectedYear === yr ? 'bold' : 'normal',
                '&:hover': { opacity: 0.8 },
                flexShrink: 0
              }}
            >
              {yr}
            </Box>
          ))}
        </Box>
      </Box>
      <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
        Green: Wins | Pink: Losses | Intensity: Number of bets
      </Typography>

      {/* Responsive SVG calendar including weekday labels */}
      <Box sx={{ width: '100%' }}>
        <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMinYMin meet">
          {/* Weekday labels (Mon-Fri only like D3) */}
          {['S','M','T','W','T','F','S'].map((d,i)=> (
            <text key={i} x={marginLeft - 6} y={marginTop + i * (cell + gap) + cell - 2} textAnchor="end" fill="#6b7280" fontSize="9" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
              {i>=1 && i<=5 ? d : ''}
            </text>
          ))}
          {/* Month labels */}
          {monthAnchors.map(({ m, weekIndex, name }) => (
            <text key={m} x={marginLeft + weekIndex * (cell + gap)} y={10} fill="#6b7280" fontSize="9" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
              {name}
            </text>
          ))}
          {/* Day cells */}
          <g transform={`translate(${marginLeft}, ${marginTop})`}>
            {allDays.map(({ date, weekday, weekIndex, data, value }, idx) => (
              <g key={idx}>
                <rect
                  x={weekIndex * (cell + gap)}
                  y={weekday * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={2}
                  ry={2}
                  fill={data ? colorForValue(value) : '#ebedf0'}
                />
                <title>{data ? `${date.toLocaleDateString()}: ${data.count} bet(s) - ${data.result}` : date.toLocaleDateString()}</title>
              </g>
            ))}
          </g>
        </svg>
      </Box>
      
      {/* Legend: Continuous ramp tied to color scale */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'inline-block' }}>
          Daily change
        </Typography>
        <Box sx={{ width: '100%' }}>
          <svg width="100%" viewBox="0 0 300 28" preserveAspectRatio="xMinYMin meet">
            <defs>
              <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c44569"/>
                <stop offset="50%" stopColor="#ebedf0"/>
                <stop offset="100%" stopColor="#216e39"/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="300" height="10" rx="2" fill="url(#legendGradient)" />
            {/* ticks */}
            {([0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <g key={i} transform={`translate(${p*300}, 0)`}>
                <line x1="0" y1="10" x2="0" y2="16" stroke="#9ca3af" />
                <text x="0" y="26" textAnchor={i===0 ? 'start' : i===4 ? 'end' : 'middle'} fill="#6b7280" fontSize="9" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
                  {i===0 ? `-${maxCount}` : i===2 ? '0' : i===4 ? `+${maxCount}` : ''}
                </text>
              </g>
            )))}
          </svg>
        </Box>
      </Box>
    </Box>
  );
};

export default BettingCalendar;
