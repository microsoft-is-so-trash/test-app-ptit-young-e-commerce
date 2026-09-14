import { useEffect, useState } from 'react';
import { Role } from '@eco-oil/shared-types';
import type { AdminWardSummary, DevAccount } from '@eco-oil/shared-types';
import { ApiError, API_BASE_URL, api } from '../lib/api';
import { isZaloEnvironment, zaloClient } from '../lib/zalo-client';
import { useAuthStore } from '../stores/auth-store';
import { adminConsoleRedirect, getSeedLoginCredentials, shouldShowDevelopmentLogin } from './login-screen-logic';
import { WebZaloLoginLink } from './WebZaloLoginLink';
import { COLLECTOR_INVITE_PARAM, getStoredCollectorInvite } from '../lib/collector-invite';
import { isDemoOfflineMode } from '../lib/demo-accounts';
import { Icon } from './Icon';

const ONBOARDING_STEPS = [
  {
    icon: 'inventory_2',
    title: 'Nhận can chứa dầu',
    description: 'ECOllect giao can chuẩn ISCC-EU miễn phí đến tận quán để bắt đầu lưu trữ dầu ăn đã qua sử dụng.',
  },
  {
    icon: 'propane_tank',
    title: 'Lưu trữ dầu đã qua sử dụng',
    description: 'Đổ dầu thải vào can sau mỗi lần chế biến, đậy kín và để nơi khô ráo chờ đến lịch thu gom.',
  },
  {
    icon: 'local_shipping',
    title: 'Gọi Eco Oil đến thu gom',
    description: 'Báo "Sẵn sàng thu gom" ngay trên app khi can gần đầy, đội thu gom sẽ đến cân và thanh toán minh bạch.',
  },
];

export function LoginScreen() {
  const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
  const demoOffline = isDemoOfflineMode();
  const [selectedId, setSelectedId] = useState('');
  const [devAccounts, setDevAccounts] = useState<DevAccount[]>([]);
  const [devAccountsError, setDevAccountsError] = useState<string | null>(null);
  const [backendMockDetected, setBackendMockDetected] = useState(false);
  const [oauthStartError, setOauthStartError] = useState<string | null>(null);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const loginSeed = useAuthStore((state) => state.loginSeed);
  const loginWithZalo = useAuthStore((state) => state.loginWithZalo);
  const loginDemoAccount = useAuthStore((state) => state.loginDemoAccount);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [registering, setRegistering] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
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
    // Quản trị viên dùng chung cổng này nhưng làm việc ở web quản trị riêng.
    const adminUrl = adminConsoleRedirect(devAccounts, selectedId, import.meta.env.VITE_ADMIN_URL);
    if (adminUrl) {
      window.location.assign(adminUrl);
      return;
    }
    if (isDemoOfflineMode()) {
      loginDemoAccount(selectedId);
      return;
    }
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
      <section className="login-card">
      {/* Brand Section */}
      <div className="login-brand">
        <div className="login-brand-pill">
          <div className="login-brand-pill-logo">E</div>
          <span className="text-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
            ECOllect Platform
          </span>
        </div>
        <h1>Bắt đầu với ECOllect</h1>
        <p>Thu gom dầu minh bạch, thuận tiện. Đăng nhập để quản lý thu gom, theo dõi giao dịch.</p>
      </div>

      {/* Zalo Login CTA */}
      {useNativeZaloLogin ? (
        <button
          className="login-cta"
          onClick={() => void handleZaloLogin()}
          disabled={busy}
        >
          {busy
            ? 'Đang đăng nhập…'
            : <>
                <Icon name="login" size={20} />
                Đăng nhập bằng Zalo
              </>}
        </button>
      ) : (
        <WebZaloLoginLink href={zaloOAuthStartUrl} />
      )}

      {oauthStartError ? <p className="error-text" style={{ textAlign: 'center' }}>{oauthStartError}</p> : null}

      {/* Dev Login */}
      {showDevelopmentLogin ? (
        <section className="dev-login-block">
          <p className="section-label">Môi trường phát triển (localhost)</p>
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
            Chọn vai trò &amp; vào bản thử nghiệm
          </button>
        </section>
      ) : null}

      {/* Error Panel — ẩn ở chế độ demo vì không có máy chủ để gọi lại */}
      {error && !demoOffline ? (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => { void hydrate(); }} disabled={busy}>
            Thử lại
          </button>
        </div>
      ) : null}

      {/* Registration Toggle */}
      {demoModeEnabled && !demoOffline ? (
        <button
          className="btn-ghost"
          style={{ margin: '12px auto 0', display: 'flex' }}
          onClick={() => {
            const next = !registering;
            setRegistering(next);
            setOnboardingStep(0);
            setOnboardingDone(false);
          }}
        >
          {registering ? 'Quay lại đăng nhập' : 'Đăng ký quán mới'}
        </button>
      ) : null}

      {/* Onboarding: 3-step welcome before registration */}
      {demoModeEnabled && registering && !onboardingDone && (
        <section className="dev-login-card approval-form">
          <p className="section-label">Chào mừng đến ECOllect</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 4px' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--primary-container, rgba(15, 92, 31, 0.12))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              <Icon name={ONBOARDING_STEPS[onboardingStep].icon} size={32} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Bước {onboardingStep + 1}/{ONBOARDING_STEPS.length}
              </span>
              <h3 style={{ margin: '4px 0', fontFamily: 'var(--font-label)', fontWeight: 700 }}>
                {ONBOARDING_STEPS[onboardingStep].title}
              </h3>
              <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                {ONBOARDING_STEPS[onboardingStep].description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ONBOARDING_STEPS.map((step, index) => (
                <span
                  key={step.title}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: index === onboardingStep ? 'var(--primary)' : 'var(--surface-container)',
                  }}
                />
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                setOnboardingStep(onboardingStep + 1);
              } else {
                setOnboardingDone(true);
              }
            }}
          >
            {onboardingStep < ONBOARDING_STEPS.length - 1 ? 'Tiếp tục' : 'Bắt đầu đăng ký'}
          </button>
        </section>
      )}

      {/* Registration Form */}
      {demoModeEnabled && registering && onboardingDone && (
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
      <div className="login-footer">
        <Icon name="verified_user" size={18} style={{ color: 'var(--secondary)' }} />
        <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Tuân thủ chuẩn ISCC-EU &amp; EUDR Traceability
        </span>
      </div>
      </section>
    </main>
  );
}
