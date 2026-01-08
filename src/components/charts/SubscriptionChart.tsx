import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatNumber, getMonthName } from '@/data/mockData';

interface SubscriptionChartProps {
  data: Array<{
    mesRef: string;
    contratada: number;
    alocada: number;
  }>;
  title?: string;
}

export function SubscriptionChart({ data, title }: SubscriptionChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: getMonthName(item.mesRef),
    utilizacao: ((item.alocada / item.contratada) * 100).toFixed(1),
  }));

  return (
    <div className="chart-container">
      {title && <h3 className="section-title">{title}</h3>}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tickFormatter={(value) => `${formatNumber(value / 1000, 1)}k`}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${formatNumber(value)} kWh`,
                name === 'contratada' ? 'Contratada' : 'Alocada',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar 
              dataKey="contratada" 
              name="Energia Contratada" 
              fill="hsl(var(--chart-original))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="alocada" 
              name="Energia Alocada" 
              fill="hsl(var(--chart-optimized))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
