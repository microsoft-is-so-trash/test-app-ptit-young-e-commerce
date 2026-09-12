import type { MonthlyTrendPoint } from '../lib/monthly-trend';

interface MonthlyTrendChartProps {
  points: MonthlyTrendPoint[];
}

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;
const BAR_GAP = 16;

export function MonthlyTrendChart({ points }: MonthlyTrendChartProps) {
  const maxLiters = Math.max(1, ...points.map((point) => point.liters));
  const width = points.length * (BAR_WIDTH + BAR_GAP);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={CHART_HEIGHT + 24} viewBox={`0 0 ${width} ${CHART_HEIGHT + 24}`} role="img" aria-label="Biểu đồ lít dầu tái chế theo tháng">
        {points.map((point, index) => {
          const barHeight = Math.max(2, (point.liters / maxLiters) * CHART_HEIGHT);
          const x = index * (BAR_WIDTH + BAR_GAP);
          const y = CHART_HEIGHT - barHeight;
          return (
            <g key={point.monthKey}>
              <rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx={4} fill="var(--primary)" />
              <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 16} textAnchor="middle" fontSize="10" fill="var(--on-surface-variant)">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
