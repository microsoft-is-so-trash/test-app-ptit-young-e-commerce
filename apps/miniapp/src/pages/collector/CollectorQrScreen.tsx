import { useState } from 'react';
import type { ContainerLookupResponse, RouteStop } from '@eco-oil/shared-types';
import { ApiError } from '../../lib/api';
import { CollectorNotice } from '../../components/CollectorNotice';
import { lookupContainerWithCache } from '../../lib/offline-cache';
import { containerMatchOutcome, INITIAL_MANUAL_CONTAINER_CODE, submitContainerCode } from '../../lib/container-code';
import { isZaloPermissionDenied, zaloClient } from '../../lib/zalo-client';

export function CollectorQrScreen({ stop, onBack, onContinue }: { stop: RouteStop; onBack: () => void; onContinue: (container: ContainerLookupResponse, containerCode: string) => void }) {
  const [code, setCode] = useState(INITIAL_MANUAL_CONTAINER_CODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  async function lookup(inputCode: string): Promise<void> {
    setMismatch(false);
    await submitContainerCode(
      inputCode,
      lookupContainerWithCache,
      {
        setBusy,
        setError,
        onResolved: (found, normalized) => {
          setCode(normalized);
          if (containerMatchOutcome(found.container.qr_code, stop.container_code) === 'mismatch') {
            setMismatch(true);
            return;
          }
          onContinue(found.container, normalized);
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
        <label htmlFor="manual-qr">Không quét được? Nhập mã in trên can</label>
        <input id="manual-qr" className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ECO-UCO-Q3P7-001" />
        <button className="secondary-button" onClick={() => { void lookup(code); }} disabled={busy}>Kiểm tra mã can</button>
      </section>
      {error ? <div className="error-panel" role="alert">{error}</div> : null}
      {mismatch ? (
        <CollectorNotice tone="danger" icon="qr_code_scanner" title="Đây không phải can của điểm này">
          Kiểm tra lại mã QR, không thể ghi nhận nhầm can.
        </CollectorNotice>
      ) : null}
    </div>
  );
}
