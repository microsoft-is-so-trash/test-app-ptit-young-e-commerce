import { useState } from 'react';
import { Icon } from './Icon';

interface OrderSheetProps {
  busy: boolean;
  maxLiters: number | null;
  onClose: () => void;
  onSubmit: (liters: number | undefined) => void;
}

export function OrderSheet({ busy, maxLiters, onClose, onSubmit }: OrderSheetProps) {
  const [liters, setLiters] = useState('');
  const parsedLiters = liters.trim() ? Number(liters) : undefined;
  const valid = parsedLiters === undefined || (Number.isFinite(parsedLiters) && parsedLiters > 0 && (maxLiters === null || parsedLiters <= maxLiters));
  const exceedsCapacity = parsedLiters !== undefined && maxLiters !== null && parsedLiters > maxLiters;

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="order-sheet-title" onMouseDown={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="sheet-header">
          <div className="sheet-header-left">
            <Icon name="notifications_active" size={22} style={{ color: 'var(--primary)' }} />
            <h2 id="order-sheet-title" className="text-headline-sm" style={{ textTransform: 'none', fontWeight: 700 }}>
              Báo sẵn sàng thu gom
            </h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={22} />
          </button>
        </div>

        <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Nhập số lít ước lượng để người thu gom chuẩn bị chuyến đi.
        </p>

        {/* Container info */}
        {maxLiters !== null ? (
          <div className="sub-card" style={{ borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Icon name="propane_tank" size={16} style={{ color: 'var(--primary)' }} />
              <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Dung tích can hiện tại: <strong style={{ color: 'var(--primary)' }}>{maxLiters} lít</strong>
              </span>
            </div>
          </div>
        ) : null}

        {/* Input */}
        <div>
          <label className="form-label" htmlFor="estimated-liters">Số lít ước lượng</label>
          <div className="input-with-suffix">
            <input
              id="estimated-liters"
              className="input"
              inputMode="decimal"
              type="number"
              min="0.1"
              step="0.1"
              max={maxLiters ?? undefined}
              value={liters}
              onChange={(event) => setLiters(event.target.value)}
              placeholder="Ví dụ: 18.5"
            />
            <span className="suffix">lít</span>
          </div>
          {parsedLiters !== undefined && parsedLiters <= 0 ? <p className="error-text">Vui lòng nhập số lít lớn hơn 0.</p> : null}
          {exceedsCapacity ? <p className="error-text">Số lít không được vượt quá dung tích can {maxLiters} lít.</p> : null}
        </div>

        {/* Actions */}
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Để sau</button>
          <button className="btn btn-primary" onClick={() => onSubmit(parsedLiters)} disabled={busy || !valid}>
            {busy ? 'Đang gửi…' : 'Báo ngay'}
          </button>
        </div>
      </section>
    </div>
  );
}
