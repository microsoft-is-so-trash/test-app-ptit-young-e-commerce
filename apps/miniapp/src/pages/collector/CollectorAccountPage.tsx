import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectorProfileResponse } from '@eco-oil/shared-types';
import { ApiError, api } from '../../lib/api';
import { formatLiters } from '../../lib/formatters';
import { formatTime } from '../../lib/collector-format';
import { CollectorNotice } from '../../components/CollectorNotice';
import { StatusView } from '../../components/StatusView';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth-store';
import { useOnlineStatus, useOutboxStats } from '../../lib/outbox-hooks';

interface CollectorAccountPageProps {
  onSignOut: () => void;
}

export function CollectorAccountPage({ onSignOut }: CollectorAccountPageProps) {
  const collectorId = useAuthStore((state) => state.user?.collectorId ?? state.user?.id ?? 'unknown');
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const outboxStats = useOutboxStats();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ['collector-profile', collectorId], queryFn: api.collectorProfile });

  if (profile.isPending) return <StatusView title="Đang tải thông tin tài khoản…" />;
  if (profile.isError) {
    return (
      <StatusView
        title="Chưa tải được hồ sơ"
        message={profile.error instanceof ApiError ? profile.error.message : 'Kiểm tra kết nối rồi thử lại.'}
        action={{ label: 'Thử lại', onClick: () => { void profile.refetch(); } }}
      />
    );
  }

  const data = profile.data;
  const unsynced = outboxStats.pending + outboxStats.syncing + outboxStats.failed;

  return (
    <div className="page-content collector-content collector-account-screen">
      <header className="collector-screen-heading">
        <p className="eyebrow">TÀI KHOẢN</p>
        <h1>{data.display_name}</h1>
      </header>

      {notice ? <CollectorNotice tone="success" title={notice} /> : null}
      {!online ? (
        <CollectorNotice tone="warning" icon="wifi_off" title="Đang ngoại tuyến">
          Cần có mạng để lưu thay đổi hồ sơ.
        </CollectorNotice>
      ) : null}

      <section className="info-card">
        <div className="section-heading">
          <div className="section-heading-left">
            <div className="section-icon">
              <Icon name="badge" size={20} />
            </div>
            <h3 className="section-title">Thông tin cá nhân</h3>
          </div>
          <span className={`badge ${data.status === 'ACTIVE' ? 'badge-success' : 'badge-surface'}`}>
            {data.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
          </span>
        </div>
        <dl className="collector-profile-list">
          <ProfileRow label="Tên hiển thị" value={data.display_name} />
          <ProfileRow label="Số điện thoại" value={data.contact_phone ?? 'Chưa có'} />
          <ProfileRow label="Loại xe" value={data.vehicle_type ?? 'Chưa có'} />
          <ProfileRow label="Sức chứa xe" value={formatLiters(data.max_capacity_l)} />
          <ProfileRow label="Hoạt động gần nhất" value={data.last_seen_at ? formatTime(data.last_seen_at) : 'Chưa có'} />
        </dl>
        <button className="btn btn-secondary btn-full" style={{ fontSize: 12 }} onClick={() => { setNotice(null); setEditing(true); }}>
          <Icon name="edit" size={18} />
          <span>Chỉnh sửa thông tin</span>
        </button>
      </section>

      <section className="info-card">
        <div className="section-heading-left">
          <div className="section-icon">
            <Icon name="map" size={20} />
          </div>
          <h3 className="section-title">Địa bàn phụ trách</h3>
        </div>
        {data.wards.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>Chưa được phân công địa bàn nào.</p>
        ) : (
          <div className="collector-ward-list">
            {data.wards.map((ward) => (
              <div className="collector-ward-row" key={ward.id}>
                <strong>{ward.name}</strong>
                <span>{ward.district} · Mã {ward.code}</span>
              </div>
            ))}
          </div>
        )}
        <p className="field-help">Địa bàn và trạng thái hoạt động do quản trị viên phân công.</p>
      </section>

      <section className="info-card">
        <div className="section-heading-left">
          <div className="section-icon">
            <Icon name="cloud_sync" size={20} />
          </div>
          <h3 className="section-title">Dữ liệu trên máy</h3>
        </div>
        <dl className="collector-profile-list">
          <ProfileRow label="Giao dịch chưa đồng bộ" value={`${unsynced}`} />
          <ProfileRow label="Kết nối" value={online ? 'Đang trực tuyến' : 'Đang ngoại tuyến'} />
        </dl>
      </section>

      <button className="btn btn-danger btn-full btn-lg" style={{ marginBottom: 16 }} onClick={onSignOut}>
        <Icon name="logout" size={20} />
        <span>ĐĂNG XUẤT</span>
      </button>

      {editing ? (
        <EditProfileSheet
          profile={data}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            queryClient.setQueryData(['collector-profile', collectorId], updated);
            setEditing(false);
            setNotice('Đã lưu thông tin tài khoản');
          }}
        />
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="collector-profile-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EditProfileSheet({
  profile,
  onClose,
  onSaved,
}: {
  profile: CollectorProfileResponse;
  onClose: () => void;
  onSaved: (updated: CollectorProfileResponse) => void;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [phone, setPhone] = useState(profile.contact_phone ?? '');
  const [vehicleType, setVehicleType] = useState(profile.vehicle_type ?? '');
  const [capacity, setCapacity] = useState(String(profile.max_capacity_l));
  const [error, setError] = useState<string | null>(null);

  const parsedCapacity = Number(capacity.replace(',', '.'));
  const capacityValid = Number.isFinite(parsedCapacity) && parsedCapacity > 0 && parsedCapacity <= 10000;
  const phoneValid = phone.trim().length === 0 || (phone.trim().length >= 8 && phone.trim().length <= 20);
  const valid = displayName.trim().length > 0 && capacityValid && phoneValid;

  const save = useMutation({
    mutationFn: () =>
      api.updateCollectorProfile({
        display_name: displayName.trim(),
        contact_phone: phone.trim() === '' ? null : phone.trim(),
        vehicle_type: vehicleType.trim() === '' ? null : vehicleType.trim(),
        max_capacity_l: parsedCapacity,
      }),
    onSuccess: onSaved,
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : 'Không lưu được thay đổi. Vui lòng thử lại.'),
  });

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collector-profile-title"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div className="sheet-header-left">
            <Icon name="edit" size={22} style={{ color: 'var(--primary)' }} />
            <h2 id="collector-profile-title" className="text-headline-sm" style={{ textTransform: 'none', fontWeight: 700 }}>
              Chỉnh sửa thông tin
            </h2>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={22} />
          </button>
        </div>

        <div>
          <label className="form-label" htmlFor="collector-name">Tên hiển thị</label>
          <input id="collector-name" className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="collector-phone">Số điện thoại</label>
          <input id="collector-phone" className="input" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div>
          <label className="form-label" htmlFor="collector-vehicle">Loại xe</label>
          <input
            id="collector-vehicle"
            className="input"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            placeholder="Ví dụ: Xe tải nhỏ 500kg"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="collector-capacity">Sức chứa xe (lít)</label>
          <input
            id="collector-capacity"
            className="input"
            inputMode="decimal"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
          <p className="field-help">Số này được dùng để tính tải tuyến và cảnh báo quá tải, hãy nhập đúng sức chứa thực tế.</p>
        </div>

        {!displayName.trim() ? <p className="error-text">Tên hiển thị không được để trống.</p> : null}
        {!capacityValid ? <p className="error-text">Sức chứa phải là số lớn hơn 0 và không quá 10.000 lít.</p> : null}
        {!phoneValid ? <p className="error-text">Số điện thoại phải từ 8 đến 20 ký tự.</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={save.isPending}>Huỷ</button>
          <button className="btn btn-primary" onClick={() => { setError(null); save.mutate(); }} disabled={save.isPending || !valid}>
            {save.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </section>
    </div>
  );
}
