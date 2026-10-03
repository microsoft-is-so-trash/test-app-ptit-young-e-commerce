export type StopCardMenuItemId = 'call' | 'directions' | 'copy' | 'ai';

export interface StopCardMenuItem {
  id: StopCardMenuItemId;
  label: string;
  /** Lý do không bấm được (U10); null khi bấm được. */
  disabledReason: string | null;
}

/** Các thao tác phụ của thẻ điểm thu, nằm trong menu mở khi bấm vào thẻ (U3: chỉ "Thu gom" là nút chính). */
export function stopCardMenuItems({ phoneIssue, canOpenDirections, hasAi }: { phoneIssue: string | null; canOpenDirections: boolean; hasAi: boolean }): StopCardMenuItem[] {
  return [
    { id: 'call', label: 'Gọi quán', disabledReason: phoneIssue },
    { id: 'directions', label: 'Chỉ đường', disabledReason: canOpenDirections ? null : 'Quán chưa có vị trí trên bản đồ.' },
    { id: 'copy', label: 'Sao chép số', disabledReason: phoneIssue },
    ...(hasAi ? [{ id: 'ai' as const, label: 'Chi tiết AI', disabledReason: null }] : []),
  ];
}
