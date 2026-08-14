import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function DashboardPieChart({ data, dataKey, nameKey, height = 280 }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0];
    const item = entry.payload ?? entry;
    const value = Number(entry.value) || 0;
    const total = data.reduce((sum, row) => sum + (Number(row[dataKey]) || 0), 0);
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="bg-background border border-border rounded-md shadow-md p-2">
        <p className="text-xs font-semibold">{item[nameKey] ?? entry.name}</p>
        <p className="text-xs">
          Valeur: <span className="font-bold">{value}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {percentage}% du total
        </p>
      </div>
    );
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.08) return null; // Don't show label for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height * 0.32, 60)}
            innerRadius={Math.min(height * 0.16, 30)}
            fill="#8884d8"
            label={CustomLabel}
            labelLine={false}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: '10px' }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
