import { formatLiters } from '../../lib/formatters';
import { formatTime } from '../../lib/collector-format';
import { TechDetails } from '../../components/TechDetails';
import type { StoredStationReceipt } from '../../lib/outbox-db';

export function SavedStationReceiptView({ receipt, onBack }: { receipt: StoredStationReceipt; onBack: () => void }) {
  return (
    <div className="page-content collector-content station-page receipt-page collector-saved-receipt-screen">
      <button className="back-button" onClick={onBack}>Về tuyến hôm nay</button>
      <header className="collector-screen-heading"><p className="eyebrow">BIÊN NHẬN ĐÃ LƯU</p><h1>{receipt.station_name}</h1></header>
      <section className="receipt-card">
        <dl>
          <div><dt>Trạm</dt><dd>{receipt.station_name}</dd></div>
          <div><dt>Tổng server đối soát</dt><dd>{formatLiters(receipt.expected_liters)}</dd></div>
          <div><dt>Thực tế đổ</dt><dd>{receipt.actual_liters === null ? 'Không có dữ liệu' : formatLiters(receipt.actual_liters)}</dd></div>
          <div><dt>Chênh lệch</dt><dd>{receipt.variance_liters === null ? 'Không có dữ liệu' : `${receipt.variance_liters.toFixed(1)} ${receipt.units.volume}`}</dd></div>
          <div><dt>Thời gian</dt><dd>{formatTime(receipt.created_at)}</dd></div>
        </dl>
        <TechDetails><span>Mã phiếu: {receipt.receipt_id}</span><span>Mã trạm: {receipt.station_id}</span><span>Mã người thu gom: {receipt.collector_id}</span></TechDetails>
      </section>
      <section className="delivery-transactions-card"><h2>Danh sách giao dịch ({receipt.transactions.length})</h2>{receipt.transactions.map((transaction) => <div className="delivery-transaction-row" key={transaction.transaction_id}><div><strong>{transaction.merchant_name}</strong><TechDetails><span>Mã giao dịch: {transaction.transaction_id}</span></TechDetails></div><b>{formatLiters(transaction.liters)} · {(transaction.kilograms ?? 0).toFixed(1)} {receipt.units.mass}</b></div>)}</section>
    </div>
  );
}
