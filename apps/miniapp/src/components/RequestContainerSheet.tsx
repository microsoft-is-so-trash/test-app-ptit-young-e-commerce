import { useState } from 'react';
import { Icon } from './Icon';

interface RequestContainerSheetProps {
  onClose: () => void;
  onSubmitted: (quantity: number) => void;
}

export function RequestContainerSheet({ onClose, onSubmitted }: RequestContainerSheetProps) {
  const [quantity, setQuantity] = useState('1');
  const parsedQuantity = Number(quantity);
  const valid = Number.isInteger(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= 10;

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-container-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-header-left">
            <Icon name="propane_tank" size={22} style={{ color: 'var(--primary)' }} />
            <h2 id="request-container-title" className="text-headline-sm" style={{ textTransform: 'none', fontWeight: 700 }}>
              Đăng ký cấp thêm can chuẩn
            </h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={22} />
          </button>
        </div>

        <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>
          ECOllect sẽ liên hệ và giao can HDPE ISCC chuẩn đến quán trong 1-2 ngày làm việc.
        </p>

        <div>
          <label className="form-label" htmlFor="container-quantity">Số lượng can cần thêm</label>
          <input
            id="container-quantity"
            className="input"
            inputMode="numeric"
            type="number"
            min="1"
            max="10"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          {!valid ? <p className="error-text">Vui lòng nhập số lượng từ 1 đến 10 can.</p> : null}
        </div>

        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose}>Để sau</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSubmitted(parsedQuantity)}>
            Gửi yêu cầu
          </button>
        </div>
      </section>
    </div>
  );
}
