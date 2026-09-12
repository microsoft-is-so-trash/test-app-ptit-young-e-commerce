import { useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useAuthStore } from '../stores/auth-store';
import { Icon } from './Icon';

interface EditMerchantInfoSheetProps {
  merchantId: string;
  initialName: string;
  initialPhone: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditMerchantInfoSheet({ merchantId, initialName, initialPhone, onClose, onSaved }: EditMerchantInfoSheetProps) {
  const patchUser = useAuthStore((state) => state.patchUser);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 0;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await api.updateMerchant(merchantId, { name: name.trim(), phone: phone.trim() });
      patchUser({ name: name.trim(), phone: phone.trim() || null });
      onSaved();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Không thể lưu thay đổi. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-merchant-info-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-header-left">
            <Icon name="edit" size={22} style={{ color: 'var(--primary)' }} />
            <h2 id="edit-merchant-info-title" className="text-headline-sm" style={{ textTransform: 'none', fontWeight: 700 }}>
              Chỉnh sửa thông tin cơ sở
            </h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div>
          <label className="form-label" htmlFor="merchant-name">Tên quán</label>
          <input id="merchant-name" className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </div>

        <div>
          <label className="form-label" htmlFor="merchant-phone">Số điện thoại</label>
          <input id="merchant-phone" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>

        {!valid ? <p className="error-text">Tên quán không được để trống.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Huỷ</button>
          <button className="btn btn-primary" onClick={() => void handleSave()} disabled={busy || !valid}>
            {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </section>
    </div>
  );
}
