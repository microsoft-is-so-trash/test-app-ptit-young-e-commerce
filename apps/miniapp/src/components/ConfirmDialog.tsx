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
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel();
        }}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="sheet-actions">
          {/* Nút an toàn nhận focus đầu tiên để Enter/Space không vô tình xác nhận. */}
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy} autoFocus>{cancelLabel}</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
