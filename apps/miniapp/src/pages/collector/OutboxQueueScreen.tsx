import { useState } from 'react';
import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import type { CollectionCreateRequest } from '@eco-oil/shared-types';
import { formatLiters } from '../../lib/formatters';
import { formatBytes, formatTime, statusLabel } from '../../lib/collector-format';
import { retryOutbox, type OutboxRecord } from '../../lib/outbox-db';
import { useOutboxRows, useOutboxStats } from '../../lib/outbox-hooks';
import { syncOutbox } from '../../lib/outbox-sync';
import { outboxErrorMessage } from '../../lib/outbox-errors';
import { OutboxIssueNotice } from './CollectorRouteScreen';
import { StatusView } from '../../components/StatusView';
import { CollectorNotice } from '../../components/CollectorNotice';

export function OutboxQueueScreen({ onBack }: { onBack: () => void }) {
  const rows = useOutboxRows();
  const stats = useOutboxStats();
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(clientUuid: string): Promise<void> {
    setRetrying(clientUuid);
    try {
      await retryOutbox(clientUuid);
      await syncOutbox();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="page-content collector-content outbox-page collector-outbox-screen">
      <button className="back-button" onClick={onBack}>Về tuyến hôm nay</button>
      <header className="collector-screen-heading"><p className="eyebrow">AN TOÀN DỮ LIỆU</p><h1>Hàng chờ đồng bộ</h1><p>{formatBytes(stats.bytes)} đang lưu trên máy</p></header>
      <OutboxIssueNotice rows={rows} stats={stats} />
      {stats.over_limit ? (
        <CollectorNotice tone="warning" icon="storage" title="Hàng chờ đang vượt 50MB">
          Hãy bật mạng để đồng bộ bớt dữ liệu ảnh.
        </CollectorNotice>
      ) : null}
      {rows.length === 0 ? <StatusView title="Hàng chờ đang trống" message="Mọi giao dịch đã được đồng bộ hoặc chưa phát sinh." /> : <section className="outbox-list">{rows.map((row) => <OutboxRow key={row.client_uuid} row={row} retrying={retrying === row.client_uuid} onRetry={() => { void retry(row.client_uuid); }} />)}</section>}
    </div>
  );
}
function OutboxRow({ row, retrying, onRetry }: { row: OutboxRecord; retrying: boolean; onRetry: () => void }) {
  const payload = row.payload as Partial<CollectionCreateRequest>;
  return (
    <article className="outbox-row">
      <div className="outbox-row-top"><span className={`outbox-dot outbox-dot-${row.status}`} /><strong>{formatLiters(Number(payload.actual_liters ?? Number(payload.actual_kg ?? 0) / DEFAULT_DENSITY_KG_PER_LITER))} · {statusLabel(row.status)}</strong></div>
      <p>UUID: {row.client_uuid}</p>
      <p>Tạo lúc {formatTime(row.created_at)} · Lần thử {row.attempts}</p>
      {row.last_error ? <div className="outbox-error">{outboxErrorMessage(row.last_error)}</div> : null}
      {row.status === 'failed' ? <button className="secondary-button" onClick={onRetry} disabled={retrying}>{retrying ? 'Đang thử lại…' : 'Thử lại thủ công'}</button> : null}
    </article>
  );
}
