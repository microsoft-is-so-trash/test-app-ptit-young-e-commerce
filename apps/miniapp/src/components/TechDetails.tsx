import type { ReactNode } from 'react';

/** Thông tin kỹ thuật (mã UUID, model AI) chỉ để hỗ trợ đối chiếu: thu gọn mặc định (U12). */
export function TechDetails({ children }: { children: ReactNode }) {
  return (
    <details className="tech-details">
      <summary>Chi tiết</summary>
      <div className="tech-details-body">{children}</div>
    </details>
  );
}
