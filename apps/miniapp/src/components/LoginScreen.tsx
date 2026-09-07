import { useEffect, useState } from 'react';
import { Role } from '@eco-oil/shared-types';
import type { AdminWardSummary, DevAccount } from '@eco-oil/shared-types';
import { ApiError, API_BASE_URL, api } from '../lib/api';
import { isZaloEnvironment, zaloClient } from '../lib/zalo-client';
import { useAuthStore } from '../stores/auth-store';
import { getSeedLoginCredentials, shouldShowDevelopmentLogin } from './login-screen-logic';
import { WebZaloLoginLink } from './WebZaloLoginLink';
import { COLLECTOR_INVITE_PARAM, getStoredCollectorInvite } from '../lib/collector-invite';
import { Icon } from './Icon';

export function LoginScreen() {
  const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
  const [selectedId, setSelectedId] = useState('');
  const [devAccounts, setDevAccounts] = useState<DevAccount[]>([]);
  const [devAccountsError, setDevAccountsError] = useState<string | null>(null);
  const [backendMockDetected, setBackendMockDetected] = useState(false);
  const [oauthStartError, setOauthStartError] = useState<string | null>(null);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const loginSeed = useAuthStore((state) => state.loginSeed);
  const loginWithZalo = useAuthStore((state) => state.loginWithZalo);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    zalo_id: 'zalo_merchant_new_01',
    name: '',
    address: '',
    phone: '',
    business_type: 'Quán ăn',
    lat: null as number | null,
    lng: null as number | null,
    ward_id: '',
  });
  const [wards, setWards] = useState<AdminWardSummary[]>([]);
  const [wardLoadError, setWardLoadError] = useState<string | null>(null);
  const collectorInvite = getStoredCollectorInvite();
  const zaloOAuthStartUrl = `${API_BASE_URL}/auth/zalo/start${collectorInvite ? `?${COLLECTOR_INVITE_PARAM}=${encodeURIComponent(collectorInvite)}` : ''}`;
  const useNativeZaloLogin = isZaloEnvironment() && zaloClient.mode === 'native';

  useEffect(() => {
    let active = true;
    void api
      .devAccounts()
      .then((items) => {
        if (!active) return;
        const demoLoginAvailable = demoModeEnabled && items.length > 0;
        setBackendMockDetected(demoLoginAvailable);
        setDevAccounts(demoLoginAvailable ? items : []);
        setSelectedId((current) => current || (demoLoginAvailable ? items[0]?.zalo_id || '' : ''));
      })
      .catch((reason) => {
        if (!active) return;
        setBackendMockDetected(false);
        setDevAccounts([]);
        if (reason instanceof ApiError && reason.status === 404) {
          setDevAccountsError(null);
          return;
        }
        if (demoModeEnabled) {
          setDevAccountsError(
            reason instanceof Error ? reason.message : 'Không tải được tài khoản thử nghiệm.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [demoModeEnabled]);

  useEffect(() => {
    if (!registering) return;
    void api
      .registrationWards()
      .then((items) => {
        setWards(items);
        setRegisterForm((current) =>
          current.ward_id || items.length !== 1 ? current : { ...current, ward_id: items[0].id },
        );
      })
      .catch(() => setWardLoadError('Không tải được danh sách phường. Vui lòng thử lại.'));
  }, [registering]);

  async function handleZaloLogin() {
    setOauthStartError(null);
    if (!useNativeZaloLogin) return;
    try {
      const accessToken = await zaloClient.getAccessToken();
      await loginWithZalo(accessToken);
    } catch {
      setOauthStartError(
        'Không thể mở đăng nhập Zalo. Vui lòng thử lại hoặc kiểm tra quyền của Mini App.',
      );
    }
  }

  async function handleSeedLogin() {
    const credentials = getSeedLoginCredentials(devAccounts, selectedId);
    const account = devAccounts.find((item) => item.zalo_id === selectedId);
    if (!credentials || !account) return;
    zaloClient.setSeedAccount({
      zaloId: credentials.zaloId,
      phone: credentials.phone,
      name: account.name ?? undefined,
    });
    await loginSeed(credentials.zaloId, credentials.phone);
  }

  async function handleRegister() {
    setRegisterError(null);
    try {
      const point = await zaloClient.getLocation();
      if (!point)
        throw new Error('Không lấy được vị trí GPS. Vui lòng bật quyền vị trí rồi thử lại.');
      await api.registerMerchant({ ...registerForm, lat: point.lat, lng: point.lng });
      await loginSeed(registerForm.zalo_id, registerForm.phone);
    } catch (reason) {
      setRegisterError(
        reason instanceof Error
          ? reason.message
          : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.',
      );
    }
  }

  const roleGroups = [Role.MERCHANT, Role.COLLECTOR, Role.ADMIN] as const;
  const showDevelopmentLogin = shouldShowDevelopmentLogin(
    demoModeEnabled,
    backendMockDetected,
    devAccounts.length,
  );

  return (
    <main className="login-page">
      {/* Brand Section */}
      <div className="login-brand">
        <div className="login-brand-pill">
          <div className="login-brand-pill-logo">E</div>
          <span className="text-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
            ECOllect Platform
          </span>
        </div>
        <h1>BẮT ĐẦU VỚI ECOLLECT</h1>
        <p>Thu gom dầu minh bạch, thuận tiện. Đăng nhập để quản lý thu gom, theo dõi giao dịch.</p>
      </div>

      {/* Zalo Login CTA */}
      {useNativeZaloLogin ? (
        <button
          className="login-cta"
          onClick={() => void handleZaloLogin()}
          disabled={busy || showDevelopmentLogin}
        >
          {showDevelopmentLogin
            ? 'Chọn tài khoản thử nghiệm để tiếp tục'
            : busy
              ? 'Đang đăng nhập…'
              : <>
                  <Icon name="login" size={20} />
                  Đăng nhập bằng Zalo
                </>}
        </button>
      ) : showDevelopmentLogin ? (
        <button className="login-cta" disabled>
          Chọn tài khoản thử nghiệm để tiếp tục
        </button>
      ) : (
        <WebZaloLoginLink href={zaloOAuthStartUrl} />
      )}

      {showDevelopmentLogin ? (
        <p className="error-text" style={{ textAlign: 'center' }}>
          Backend đang ở môi trường phát triển. Chọn tài khoản thử nghiệm để tiếp tục.
        </p>
      ) : null}
      {oauthStartError ? <p className="error-text" style={{ textAlign: 'center' }}>{oauthStartError}</p> : null}

      {/* Dev Login */}
      {showDevelopmentLogin ? (
        <section className="dev-login-card">
          <p className="section-label">Môi trường phát triển</p>
          <label htmlFor="seed-account">Chọn tài khoản thử nghiệm</label>
          <select
            id="seed-account"
            className="input"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={devAccounts.length === 0}
          >
            {roleGroups.map((role) => {
              const accounts = devAccounts.filter((account) => account.role === role);
              if (accounts.length === 0) return null;
              const groupLabel =
                role === Role.MERCHANT
                  ? 'Quán'
                  : role === Role.COLLECTOR
                    ? 'Người thu gom'
                    : 'Admin';
              return (
                <optgroup label={groupLabel} key={role}>
                  {accounts.map((account) => (
                    <option value={account.zalo_id} key={account.zalo_id}>
                      {account.name ?? account.zalo_id}
                      {account.role === Role.COLLECTOR && account.wards.length > 0
                        ? ` — ${account.wards.map((ward) => ward.name).join(', ')}`
                        : ''}{' '}
                      ({account.zalo_id})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {devAccountsError ? <p className="error-text">{devAccountsError}</p> : null}
          <button
            className="btn btn-secondary btn-full"
            style={{ marginTop: 12 }}
            onClick={() => void handleSeedLogin()}
            disabled={busy || !selectedId}
          >
            Vào bản thử nghiệm
          </button>
        </section>
      ) : null}

      {/* Error Panel */}
      {error ? (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => { void hydrate(); }} disabled={busy}>
            Thử lại
          </button>
        </div>
      ) : null}

      {/* Registration Toggle */}
      {demoModeEnabled ? (
        <button className="btn-ghost" style={{ margin: '12px auto 0', display: 'flex' }} onClick={() => setRegistering(!registering)}>
          {registering ? 'Quay lại đăng nhập' : 'Đăng ký quán mới'}
        </button>
      ) : null}

      {/* Registration Form */}
      {demoModeEnabled && registering && (
        <section className="dev-login-card approval-form">
          <p className="section-label">Đăng ký quán</p>
          <label className="form-label">
            Mã Zalo (bản thử nghiệm)
            <input
              className="input"
              value={registerForm.zalo_id}
              onChange={(event) =>
                setRegisterForm({ ...registerForm, zalo_id: event.target.value })
              }
            />
          </label>
          <label className="form-label">
            Tên quán
            <input
              className="input"
              value={registerForm.name}
              onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
            />
          </label>
          <label className="form-label">
            Địa chỉ
            <input
              className="input"
              value={registerForm.address}
              onChange={(event) =>
                setRegisterForm({ ...registerForm, address: event.target.value })
              }
            />
          </label>
          <label className="form-label">
            Số điện thoại
            <input
              className="input"
              value={registerForm.phone}
              onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })}
            />
          </label>
          <label className="form-label">
            Loại hình
            <input
              className="input"
              value={registerForm.business_type}
              onChange={(event) =>
                setRegisterForm({ ...registerForm, business_type: event.target.value })
              }
            />
          </label>
          {wardLoadError ? (
            <p className="error-text">{wardLoadError}</p>
          ) : wards.length > 1 ? (
            <label className="form-label">
              Phường đăng ký
              <select
                className="input"
                value={registerForm.ward_id}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, ward_id: event.target.value })
                }
              >
                <option value="">Chọn phường</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}, {ward.district} ({ward.code})
                  </option>
                ))}
              </select>
            </label>
          ) : wards.length === 1 ? (
            <p className="section-label">
              Địa bàn: {wards[0].name}, {wards[0].district}
            </p>
          ) : null}
          <button
            className="btn btn-primary btn-full"
            onClick={() => void handleRegister()}
            disabled={busy || !registerForm.ward_id}
          >
            Gửi hồ sơ đăng ký
          </button>
          {registerError && <p className="error-text">{registerError}</p>}
        </section>
      )}

      {/* Trust Footer */}
      <div className="login-footer" style={{ marginTop: 'auto', paddingTop: 32 }}>
        <Icon name="verified_user" size={18} style={{ color: 'var(--secondary)' }} />
        <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Tuân thủ chuẩn ISCC-EU & EUDR Traceability
        </span>
      </div>
    </main>
  );
}
