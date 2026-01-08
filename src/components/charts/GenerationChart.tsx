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
import { formatNumber, getMonthName } from '@/data/mockData';

interface GenerationChartProps {
  data: Array<{
    mesRef: string;
    geracao: number;
    esperado: number;
  }>;
  title?: string;
}

export function GenerationChart({ data, title }: GenerationChartProps) {
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
              <linearGradient id="colorGeracao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-generation))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-generation))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEsperado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-consumption))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-consumption))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              formatter={(value: number) => `${formatNumber(value)} kWh`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area
              type="monotone"
              dataKey="esperado"
              name="Esperado"
              stroke="hsl(var(--chart-consumption))"
              fill="url(#colorEsperado)"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Area
              type="monotone"
              dataKey="geracao"
              name="Geração Real"
              stroke="hsl(var(--chart-generation))"
              fill="url(#colorGeracao)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
