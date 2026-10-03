import { ContainerState } from '@eco-oil/shared-types';

export interface ReadyButtonState {
  label: string;
  icon: string;
  disabled: boolean;
  /** Lý do nút bị khoá (U10); null khi bấm được. */
  reason: string | null;
}

export function readyButtonState({ pendingOrders, containers }: { pendingOrders: number; containers: ReadonlyArray<{ state: ContainerState }> }): ReadyButtonState {
  if (pendingOrders > 0) {
    return {
      label: 'Đã báo, đang chờ thu gom',
      icon: 'hourglass_top',
      disabled: true,
      reason: 'Quán đã có đơn đang chờ. Báo lần mới được sau khi đơn này được thu gom hoặc huỷ.',
    };
  }
  if (containers.some((container) => container.state === ContainerState.AT_MERCHANT)) {
    return { label: 'Sẵn sàng thu gom', icon: 'notifications_active', disabled: false, reason: null };
  }
  if (containers.length > 0) {
    return {
      label: 'Can đang trên đường về',
      icon: 'notifications_active',
      disabled: true,
      reason: 'Can đang được chở đi. Báo thu gom được khi can về lại quán.',
    };
  }
  return {
    label: 'Đang chờ được cấp can',
    icon: 'notifications_active',
    disabled: true,
    reason: 'Quán chưa được cấp can nên chưa báo thu gom được.',
  };
}

export function profileSubmitBlockReason({ name, address, wardId, requireWard }: { name: string; address: string; wardId: string; requireWard: boolean }): string | null {
  const toEnter = [...(name.trim() ? [] : ['tên quán']), ...(address.trim() ? [] : ['địa chỉ'])];
  const steps = [
    ...(toEnter.length > 0 ? [`nhập ${toEnter.join(', ')}`] : []),
    ...(requireWard && !wardId ? ['chọn phường'] : []),
  ];
  return steps.length > 0 ? `Cần ${steps.join(' và ')} để gửi hồ sơ.` : null;
}
