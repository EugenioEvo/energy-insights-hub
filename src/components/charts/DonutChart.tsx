import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatNumber } from '@/data/mockData';

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  title?: string;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  return (
    <div className="chart-container">
      {title && <h3 className="section-title">{title}</h3>}
      <div className="h-[280px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${formatNumber(value)} kWh`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: '-20px' }}>
            <span className="text-2xl font-bold text-foreground">{centerValue}</span>
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
