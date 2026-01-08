import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, getMonthName } from '@/data/mockData';

interface SavingsTrendChartProps {
  data: Array<{
    mesRef: string;
    economiaMensal: number;
    economiaAcumulada: number;
  }>;
  title?: string;
}

export function SavingsTrendChart({ data, title }: SavingsTrendChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: getMonthName(item.mesRef),
  }));

  return (
    <div className="chart-container">
      {title && <h3 className="section-title">{title}</h3>}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorEconomiaMensal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEconomiaAcumulada" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'economiaMensal' ? 'Economia Mensal' : 'Economia Acumulada',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => value === 'economiaMensal' ? 'Economia Mensal' : 'Economia Acumulada'}
            />
            <Area
              type="monotone"
              dataKey="economiaMensal"
              name="economiaMensal"
              stroke="hsl(var(--accent))"
              fill="url(#colorEconomiaMensal)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="economiaAcumulada"
              name="economiaAcumulada"
              stroke="hsl(var(--success))"
              fill="url(#colorEconomiaAcumulada)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
