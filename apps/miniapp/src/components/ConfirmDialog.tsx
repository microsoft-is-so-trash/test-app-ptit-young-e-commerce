interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận trong app, thay cho `window.confirm` (quy tắc ui-non-fiction). */
export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
