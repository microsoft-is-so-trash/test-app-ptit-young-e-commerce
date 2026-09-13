import { useState } from 'react';
import { ContainerState } from '@eco-oil/shared-types';
import type { ContainerLookupResponse, RouteStop } from '@eco-oil/shared-types';
import { ApiError } from '../../lib/api';
import { formatTime } from '../../lib/collector-format';
import { formatLiters } from '../../lib/formatters';
import { lookupContainerWithCache } from '../../lib/offline-cache';
import { submitContainerCode } from '../../lib/container-code';
import { isZaloPermissionDenied, zaloClient } from '../../lib/zalo-client';

export function CollectorQrScreen({ stop, onBack, onContinue }: { stop: RouteStop; onBack: () => void; onContinue: (container: ContainerLookupResponse, containerCode: string) => void }) {
  const [code, setCode] = useState(stop.container_code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [container, setContainer] = useState<ContainerLookupResponse | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  async function lookup(inputCode: string): Promise<void> {
    setMismatch(false);
    setContainer(null);
    setCachedAt(null);
    await submitContainerCode(
      inputCode,
      lookupContainerWithCache,
      {
        setBusy,
        setError,
        onResolved: (found, normalized) => {
          setCode(normalized);
          if (found.container.qr_code !== stop.container_code) {
            setMismatch(true);
            return;
          }
          setCachedAt(found.cachedAt);
          setContainer(found.container);
        },
      },
      (requestError) => requestError instanceof ApiError && requestError.code === 'NOT_FOUND' ? 'Không tìm thấy can này.' : 'Chưa tra được mã can, thử lại nhé.',
    );
  }

  async function scan(): Promise<void> {
    setBusy(true);
    setError(null);
      try {
        const scannedCode = await zaloClient.scanQRCode();
        if (!scannedCode.trim()) {
          setError('Chưa quét được mã can. Bạn có thể nhập tay mã can bên dưới.');
          return;
        }
        await lookup(scannedCode);
       } catch (scanError) {
         setError(isZaloPermissionDenied(scanError)
           ? 'Zalo chưa có quyền dùng camera để quét QR. Hãy bật quyền Camera trong Zalo hoặc nhập tay mã can.'
           : scanError instanceof Error
             ? scanError.message
             : 'Không quét được mã. Bạn có thể nhập tay mã can.');
      } finally {
        setBusy(false);
      }
  }

  return (
    <div className="page-content collector-content collector-qr-screen">
      <button className="back-button" onClick={onBack}>Quay lại tuyến</button>
      <header className="collector-screen-heading"><p className="eyebrow">ĐIỂM {stop.seq}</p><h1>Quét mã can</h1><p>{stop.merchant.name}</p></header>
      <section className="qr-target-card"><span>Can cần thu</span><strong>{stop.container_code}</strong><small>{stop.merchant.address ?? ''}</small></section>
      <button className="scan-button" onClick={() => { void scan(); }} disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Quét QR bằng camera'}</button>
      <section className="manual-qr-card">
        <p className="section-label">Nhập mã can</p>
        <label htmlFor="manual-qr">Bạn có thể nhập hoặc sửa mã can</label>
        <input id="manual-qr" className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ECO-UCO-Q3P7-001" />
        <button className="secondary-button" onClick={() => { void lookup(code); }} disabled={busy}>Kiểm tra mã can</button>
      </section>
      {error ? <div className="error-panel" role="alert">{error}</div> : null}
      {mismatch ? <div className="warning-panel"><strong>Đây không phải can của điểm này</strong><span>Kiểm tra lại mã QR. Không thể ghi nhận nhầm can.</span></div> : null}
      {container ? (
        <section className="verified-container-card">
          <span className="verified-badge">Đã đối chiếu</span>
          {cachedAt ? <p className="offline-cache-note">Dữ liệu lúc {formatTime(cachedAt)}</p> : null}
          <h2>{container.merchant.name}</h2>
          <p>{container.qr_code} · {formatLiters(container.capacity_liters)} · {container.state === ContainerState.AT_MERCHANT ? 'Đang ở quán' : container.state}</p>
          <button className="primary-button" onClick={() => onContinue(container, code.trim())}>Tiếp tục nhập giao dịch</button>
        </section>
      ) : null}
    </div>
  );
}
