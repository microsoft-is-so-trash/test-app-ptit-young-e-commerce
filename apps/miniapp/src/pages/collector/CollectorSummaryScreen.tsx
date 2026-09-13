import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import type { CurrentRouteResponse } from '@eco-oil/shared-types';
import { formatLiters } from '../../lib/formatters';
import type { CompletedStop } from '../../lib/collector-metrics';

export function CollectorSummaryScreen({ route, completed, completedCount, totalStops, onBack, onOpenDelivery }: { route: CurrentRouteResponse | undefined; completed: Record<string, CompletedStop>; completedCount: number; totalStops: number; onBack: () => void; onOpenDelivery: () => void }) {
  const totalCollected = Object.values(completed).reduce((sum, item) => sum + item.liters, 0);
  const totalCollectedKg = Object.values(completed).reduce((sum, item) => sum + (item.kilograms ?? item.liters * DEFAULT_DENSITY_KG_PER_LITER), 0);
  const displayedTotalStops = Math.max(totalStops, completedCount);
  const vehicleCapacity = route ? route.total_expected_liters + route.remaining_capacity_l : 0;
  return (
    <div className="page-content collector-content summary-page collector-summary-screen">
      <button className="back-button" onClick={onBack}>Về tuyến hôm nay</button>
      <header className="collector-screen-heading"><p className="eyebrow">KẾT QUẢ CA</p><h1>Tóm tắt thu gom</h1></header>
      <div className="summary-hero"><span>Đã thu hôm nay</span><strong>{formatLiters(totalCollected)} (~{totalCollectedKg.toFixed(1)} kg)</strong></div>
      <section className="summary-grid"><div><span>Điểm đã thu</span><strong>{completedCount} / {displayedTotalStops}</strong></div><div><span>Dung tích còn lại</span><strong>{formatLiters(Math.max(vehicleCapacity - totalCollected, 0))}</strong></div></section>
      <button className="station-button" onClick={onOpenDelivery} disabled={completedCount === 0}>Đi nộp trạm <small>{completedCount === 0 ? 'Chưa có giao dịch' : 'Đối soát và chọn trạm'}</small></button>
    </div>
  );
}
