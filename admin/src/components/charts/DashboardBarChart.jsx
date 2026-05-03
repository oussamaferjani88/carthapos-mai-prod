import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function DashboardBarChart({ data, xKey, yKey, color = '#22c55e', height = 280 }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-md shadow-md p-2">
          <p className="text-xs font-semibold">{payload[0].payload[xKey]}</p>
          <p className="text-xs" style={{ color }}>
            {yKey}: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={`barGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted))" 
            opacity={0.2}
          />
          <XAxis 
            dataKey={xKey}
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey={yKey} 
            fill={`url(#barGradient-${color})`}
            radius={[6, 6, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
