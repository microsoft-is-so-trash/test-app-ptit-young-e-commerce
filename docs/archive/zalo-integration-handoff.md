# Bàn giao tích hợp Zalo — Giai đoạn 1 → Giai đoạn 2

> **Đọc file này thay cho lịch sử hội thoại Giai đoạn 1.**
> Giai đoạn 2 KHÔNG được đọc lại `zalo-ios-sdk-tong-quan.md`. Mọi phần tài liệu SDK
> cần thiết đã được trích nguyên văn ở mục 9 bên dưới.
>
> **KHÔNG đọc `docs/ZALO_MINI_APP_ROADMAP.md`** — khảo sát 19/08/2026, đã lỗi thời ở
> ít nhất 3 điểm (nói `RealZaloAuthProvider` là TODO, nói không có `app-config.json`,
> nói không có script ZMP CLI — cả ba đều đã sai).

Ngày chốt: 16/09/2026 · Branch: `ui_version_3` · Commit nền: `890bea7`

---

## 1. Tình huống đã chốt: **(C)** — cần cả publish Mini App lẫn login/OA phía server

Không phải (A) thuần, không phải (B) thuần:

- **(A) đã có code đầy đủ nhưng ĐANG TẮT ở production.** `RealZaloAuthProvider`,
  `/auth/zalo/start|callback|exchange`, PKCE sealed-state — tất cả đã viết xong và có
  test. Nhưng Render đặt `ZALO_AUTH_MODE=mock`, không có `ZALO_APP_ID`/`ZALO_APP_SECRET`.
  Kiểm chứng trực tiếp: `GET /api/v1/auth/zalo/start` → **HTTP 503
  `REAL_ZALO_AUTH_REQUIRED`**. Demo web hiện chạy 100% bằng tài khoản seed.
- **(B) làm được ~70% nhưng dấu vết cũ phải bỏ.** `app-config.json`, `build:zmp`,
  `index.html` dùng `<div id="app">`, Native Storage qua `zmp-sdk` — đều đã đúng chuẩn
  ZMP. Nhưng Mini App ID `2013689159096493937` và file verifier trong repo thuộc
  **tài khoản của một thành viên khác**, đăng ký với hạ tầng dự án KHÔNG còn kiểm soát.

### Bằng chứng cho quyết định bỏ liên kết Zalo cũ

`git show 5e2fc1b` (07/09) đưa toàn bộ code Zalo + file verifier vào repo. Cấu hình
tại thời điểm đó — tức là **chính giá trị đã đăng ký trên Zalo Developer**:

```
ZALO_OAUTH_CALLBACK_URL=https://eco-oil-api.onrender.com/api/v1/auth/zalo/callback
ZALO_OAUTH_SUCCESS_REDIRECT_URL=https://uco-platform-miniapp.vercel.app/
CORS_ORIGINS=https://uco-platform-miniapp.vercel.app,https://uco-platform-admin.vercel.app
```

`git show 668b60e` (09/09) nói rõ:

> *"The original `eco-oil-api.onrender.com` backend and its Vercel domains belong to
> an account we don't control, so CORS/config there could never be fixed."*

→ Mọi đăng ký phía Zalo trỏ vào hạ tầng không kiểm soát. File verifier trong repo
chứng minh sở hữu một domain không thuộc dự án. **Quyết định: tạo Zalo App + Mini App
MỚI hoàn toàn dưới tài khoản `khanhpg.b25tn064@stu.ptit.edu.vn`, xoá sạch dấu vết cũ.**

---

## 2. Hướng đã chọn: gộp cả 3 hướng + **tách môi trường**

### Vì sao bắt buộc tách môi trường

`ZALO_AUTH_MODE=real` làm `devAccounts()` ném **404** và `/auth/zalo` từ chối payload
seed (`ZALO_ACCESS_TOKEN_REQUIRED`). → Bật real mode trên `eco-oil-api` hiện tại =
**bản demo Vercel chết ngay**, không còn cách nào đăng nhập trên web.

Yêu cầu quan trọng nhất của chủ dự án là **seed data phải hiện đầy đủ trên Vercel**.
Hai thứ này loại trừ nhau trên cùng một service.

### Kiến trúc chốt

| Service | Mục đích | Cấu hình |
|---|---|---|
| `eco-oil-api` (đang chạy) | Demo, tài khoản seed | `ZALO_AUTH_MODE=mock`, `NODE_ENV=development`, `DEMO_MODE=true` — **GIỮ NGUYÊN, KHÔNG ĐỤNG** |
| `eco-oil-api-staging` (chủ dự án sẽ dựng) | Zalo thật | `ZALO_AUTH_MODE=real`, `NODE_ENV=production`, có `REDIS_URL` (Upstash), có `ZALO_APP_ID`/`ZALO_APP_SECRET` |

Mini App và OAuth thật **chỉ trỏ vào staging**. Không deploy Mini App trỏ vào
`eco-oil-api` demo — ở mock mode, `MockZaloAuthProvider.verify()` lấy chính chuỗi
access token làm `zaloId` → mỗi lần đăng nhập tạo một user rác.

**Thứ tự bắt buộc: bật OAuth thật trên staging TRƯỚC → rồi mới publish Mini App.**

---

## 3. Việc đã HOÀN THÀNH ở Giai đoạn 1 (đừng làm lại)

| # | Việc | Trạng thái |
|---|---|---|
| 1A | Xoay `JWT_SECRET` trên Render | ✅ xong, API ký/verify bình thường |
| 1B | Xoay password Neon `neondb_owner` | ✅ xong, `/api/v1/health` → `"db":"ok"` |
| 1C | Chạy lại `prisma db seed` trên Neon | ✅ `4 orders (1 COLLECTED + 3 READY)` |
| 1D | Nghiệm thu tuyến collector | ✅ collector 01: 1 điểm/35 lít · collector 02: 1 điểm/30 lít |

**Nguyên nhân gốc của "seed data không hiện trên Vercel" đã xử lý xong:** đơn hàng
trong Neon còn ở trạng thái `ASSIGNED` trong khi tuyến thu gom / bản đồ / ô "dầu dự
kiến" chỉ đếm `READY` — đúng lỗi commit `d42d97c` sửa trong code nhưng chưa seed lại
lên Neon. **Không phải lỗi cấu hình Vercel.**

### Hai lần suýt lộ secret đã chặn (bối cảnh, không cần hành động)

1. File tạo nhầm tên `.env ` (có dấu cách cuối) → `.gitignore` không che được. Đã đổi tên.
2. `.env.example` bị dán đè bằng chuỗi kết nối Neon thật → đã `git checkout --` khôi phục.

Cả hai mới ở working tree, chưa stage/commit/push. Password hiện tại an toàn.

---

## 4. `<phạm_vi_bắt_buộc>` (nguyên văn, không diễn giải)

> Không sửa file trong apps/admin. Không sửa prisma/schema.prisma, migration files,
> docker-compose.yml, hay bất kỳ file .env/deploy config nào của apps/api mà apps/admin
> đang phụ thuộc (route/response shape hiện có phải giữ tương thích ngược). Nếu một thay
> đổi cần thiết ảnh hưởng ra ngoài apps/miniapp hoặc phần auth/OA của apps/api, hỏi trước
> thay vì tự làm.

### Ràng buộc tương thích ngược đã xác minh là THẬT

- `apps/admin/src/lib/api.ts:86` gọi `POST /auth/zalo` → **không được đổi response shape**.
- `apps/admin/src/lib/auth.tsx:49` gọi `POST /auth/admin/login` → admin có đường đăng
  nhập riêng, **không** phụ thuộc OAuth Zalo.
- `apps/admin/src/lib/login-gate.ts:26` đọc `NEXT_PUBLIC_LOGIN_GATE_URL`.

---

## 5. `<đảm_bảo_vận_hành_ổn_định_không_xung_đột>` (nguyên văn)

> - Dùng App ID/Mini App ID riêng cho dev-staging, tuyệt đối không sửa cấu hình của
>   App/Mini App đang chạy production khi đang thử nghiệm.
> - accessToken/refreshToken và mọi secret OAuth chỉ lưu và luân chuyển ở apps/api,
>   không bao giờ đưa refresh token hay client secret xuống apps/miniapp (client Zalo
>   Mini App webview không phải nơi an toàn để giữ secret).
> - Mini App chạy trong webview domain h5.zdn.vn — nếu miniapp gọi thẳng API của
>   apps/api, phải cấu hình Access-Control-Allow-Origin cho domain đó ở phía NestJS;
>   việc này không được đụng tới cấu hình CORS/route mà apps/admin trên Vercel đang
>   dùng chung.
> - Mọi endpoint mới cho luồng Zalo phải là route/namespace riêng, không sửa response
>   shape của endpoint hiện có mà apps/miniapp (outbox/collector-flow) hoặc apps/admin
>   đang gọi — chạy `npm run typecheck && npm test` ở app bị ảnh hưởng sau khi sửa, nêu
>   rõ trước những test nào có khả năng bị ảnh hưởng nếu đụng tới outbox/container-code/
>   station-delivery/collector-flow.
> - Không deploy thẳng lên Mini App ID production để test — dùng bản thử nghiệm/tester
>   whitelist trước.

---

## 6. Danh sách file/route CHÍNH XÁC sẽ sửa

### 6.1 Xoá dấu vết liên kết Zalo cũ

| File | Việc |
|---|---|
| `apps/miniapp/public/zalo_verifierUjw03lZo6XOpXymhruLl4nVounNxX3bDE30n.html` | **XOÁ.** Chứng minh sở hữu domain không thuộc dự án |
| `apps/api/public/zalo_verifierUjw03lZo6XOpXymhruLl4nVounNxX3bDE30n.html` | **XOÁ** (nếu tồn tại — `zalo-verification.controller.ts` đọc từ `__dirname/../../public`) |
| `apps/api/src/verification/zalo-verification.constants.ts` | Đổi `ZALO_VERIFIER_PATH` sang tên file verifier MỚI → `{{ZALO_VERIFIER_FILENAME}}` |
| `apps/api/test/zalo-verification.e2e-spec.ts` | Cập nhật theo tên file mới |
| `docs/DEMO_RUNBOOK.md` | Xoá Mini App ID `2013689159096493937`; sửa `/health` → `/api/v1/health` (đường cũ là 404) |
| `docs/ZALO_MINI_APP_ROADMAP.md` | Thêm banner "ĐÃ LỖI THỜI 16/09/2026 — xem `zalo-integration-handoff.md`" |

### 6.2 Hướng 1 — đóng gói / publish Mini App

| File | Việc |
|---|---|
| `apps/miniapp/package.json` | Thêm `zmp-cli@4.0.3` vào `devDependencies` (pin, thay `npx --yes`); đổi `build:zmp`; thêm script `deploy:zmp` |
| `DEPLOY.md` | Thêm mục "Đóng gói Zalo Mini App": phân biệt rõ App ID ↔ Mini App ID, thứ tự `zmp login` → `build:zmp` → `deploy --existing`, whitelist tester, bước Xác thực/kiểm duyệt |
| `.env.example` | Thêm `https://h5.zdn.vn` vào dòng mẫu `CORS_ORIGINS` (chỉ file mẫu) |

> `apps/miniapp/app-config.json`, `index.html`, `vite.config.ts` **đã đúng chuẩn ZMP,
> KHÔNG cần sửa**: `base: './'`, chunk đặt tên `.module.js` khớp `listSyncJS`,
> `<div id="app">`.

### 6.3 Hướng 2 — vá lỗi luồng OAuth (code chết hôm nay, sống khi bật staging)

| File | Việc |
|---|---|
| `apps/miniapp/src/lib/oauth-callback.ts` | `consumeZaloOAuthCode` hiện KHÔNG xoá code khi lỗi retryable → retry POST lại cùng handoff code đã bị Redis `consumeOneTime` tiêu thụ → 401 vĩnh viễn, user kẹt màn login. Phải tách "chưa gửi được tới server" (an toàn retry) khỏi "đã gửi nhưng mất phản hồi" (phải xoá code + yêu cầu đăng nhập lại) |
| `apps/miniapp/test/oauth-callback.test.ts` | Bổ sung ca kiểm thử cho phân biệt trên |

### 6.4 Hướng 3 — bật OAuth thật trên staging

**Code đã sẵn sàng, phần lớn là việc dashboard.** Chỉ sửa khi có nhu cầu OA API/ZNS:

| File | Việc |
|---|---|
| `apps/api/src/modules/auth/auth.service.ts:208-209` | `completeZaloOAuth` gọi `exchangeCode()` rồi **vứt bỏ `token.refreshToken`**. Vô hại hôm nay (Eco-Oil phát JWT riêng, không gọi OA API). **Chỉ sửa nếu thêm ZNS/OA API** — khi đó phải lưu + GHI ĐÈ refresh token mới mỗi lần đổi (xem rủi ro R5) |
| `apps/api/src/modules/zalo-oa/**` (mới) | **CHỈ tạo khi chủ dự án yêu cầu OA API/ZNS.** Namespace riêng `/zalo-oa/*`, không đụng `/auth/*` |

> ⚠️ Lưu Zalo refresh token cần chỗ chứa. `prisma/schema.prisma` **BỊ CẤM SỬA**.
> Chỉ còn Redis (Upstash, mất token khi reset) → **phải hỏi chủ dự án trước khi làm**.

### 6.5 Route hiện có — KHÔNG đổi response shape

```
POST /api/v1/auth/zalo                    ← apps/admin phụ thuộc
GET  /api/v1/auth/zalo/start
GET  /api/v1/auth/zalo/callback
POST /api/v1/auth/zalo/exchange
POST /api/v1/auth/zalo/location
POST /api/v1/auth/admin/login             ← apps/admin phụ thuộc
GET  /api/v1/auth/dev-accounts            ← chỉ sống ở mock mode
POST /api/v1/auth/collector-invites/accept
```

---

## 7. `<rủi_ro>` đã rút gọn — chỉ giữ phần còn liên quan

| ID | Mã lỗi | Rủi ro | Phòng tránh |
|---|---|---|---|
| R1 | **-5000** | Nhầm **App ID** (OAuth) với **Mini App ID** (publish) — hai ID khác nhau, hai trang khác nhau | Đặt tên biến tách bạch: `ZALO_APP_ID` vs `ZALO_MINI_APP_ID`. Không bao giờ dán Mini App ID vào `ZALO_APP_ID` |
| R2 | **-5001** | Redirect URI đăng ký lệch domain thật. **Đã xảy ra thật**: App cũ đăng ký `eco-oil-api.onrender.com`, dự án đã chuyển sang `eco-oil-api-kgoe.onrender.com` | Đăng ký redirect URI của **staging**; đổi domain Vercel/Render là phải cập nhật lại Zalo Developer |
| R3 | **-5003 / -5016** | `oauthCode` sống 10 phút, dùng 1 lần | Server đã xử lý đúng (đổi token ngay trong request callback). **Lỗ hổng còn lại ở client** → mục 6.3 |
| R4 | **-5010** | Mất `code_verifier` khi reload webview | **Đã xử lý tốt** — `code_verifier` niêm phong trong chính tham số `state` (`auth.service.ts:159-164`), sống trong URL. **Giữ nguyên thiết kế này.** Nếu sau này làm login trong Mini App (không có redirect URL) thì mô hình này KHÔNG áp dụng được — phải thiết kế lại, đừng copy |
| R5 | **-5017** | Quên ghi đè refreshToken MỚI mỗi lần đổi token → user bị đăng xuất hàng loạt | Hiện `token.refreshToken` bị vứt bỏ. Vô hại hôm nay. **Bom hẹn giờ nếu thêm OA API** → mục 6.4 |
| R6 | **-7004** | App/Mini App chưa "Đang hoạt động" hoặc chưa qua Xác thực + kiểm duyệt | Việc thủ công ngoài repo. Kích hoạt App ngay sau khi tạo |
| R7 | **-6001** | Test bằng tài khoản chưa vào whitelist tester | Thêm tester TRƯỚC khi quét QR Development |
| R8 | CORS | Mini App webview `h5.zdn.vn` gọi API bị chặn | Thêm `https://h5.zdn.vn` vào `CORS_ORIGINS` **của staging**. `eco-oil-api` demo hiện có đúng 2 origin Vercel — **KHÔNG đụng** |
| R9 | — | Quên `zmp login` (token CLI hết hạn) hoặc quên bump version trước `zmp deploy` → bản mới không lên mà không báo lỗi rõ | Pin `zmp-cli` vào devDependencies; ghi thứ tự vào DEPLOY.md; xác nhận version trên Mini App Center sau mỗi lần deploy |
| R10 | Secret | Gọi nhầm Open API bắt buộc ký từ server → lộ secret key nếu gọi từ client | **Đã phòng tốt.** `ZALO_APP_SECRET` chỉ ở `ConfigService` phía API; miniapp không có biến `VITE_*` nào chứa secret. Giữ nguyên nguyên tắc |
| R11 | Cookie | `NODE_ENV=development` → `auth.controller.ts:212-213` đặt cookie **không `Secure`, `SameSite=Lax`** → không đi được cross-site Vercel→Render | Staging phải đặt `NODE_ENV=production`. Vô hại trên demo vì app dùng token qua header |
| R12 | Redis | Thiếu `REDIS_URL` → `redis.service.ts:31` ném `Redis is not configured` → `/auth/zalo/exchange` 503 `ZALO_OAUTH_HANDOFF_UNAVAILABLE` và `/auth/collector-invites/accept` 503 | **Staging bắt buộc có Upstash.** Bật OAuth web không có Redis là vô nghĩa — đăng nhập xong kẹt ở bước cuối |
| R13 | Mã lỗi | Bảng `kZaloSDKErrorCode` là mã **SDK native**; REST `oauth.zaloapp.com` trả bộ mã `error` riêng | Không tự bịa ánh xạ. Code đã log `zalo_error`/`zalo_message` — lấy từ phản hồi thật |

---

## 8. Test phải chạy lại

### Trước khi sửa — cảnh báo phạm vi ảnh hưởng

Sửa ở mục 6.3 đụng `apps/miniapp/src/lib/oauth-callback.ts`. File này **KHÔNG được
import** bởi `outbox*`, `container-code`, `station-delivery`, `collector-flow` — đã
kiểm chứng. Rủi ro lan sang các test đó gần bằng 0, nhưng vẫn chạy full suite.

### Lệnh

```bash
# miniapp — 18 test file
pnpm --filter @eco-oil/miniapp typecheck
pnpm --filter @eco-oil/miniapp test

# api
pnpm --filter @eco-oil/api typecheck
pnpm --filter @eco-oil/api test
```

### Test cần chú ý đặc biệt

| Test | Vì sao |
|---|---|
| `apps/miniapp/test/oauth-callback.test.ts` | **Bị sửa trực tiếp** ở 6.3 |
| `apps/miniapp/test/auth-store.test.ts` | Gọi `consumeZaloOAuthCode` |
| `apps/miniapp/test/production-web-login.test.tsx` | Luồng đăng nhập web |
| `apps/miniapp/test/login-screen.test.ts` | Chọn đường native vs web |
| `apps/api/test/zalo-verification.e2e-spec.ts` | **Sẽ hỏng** khi đổi `ZALO_VERIFIER_PATH` |
| `apps/api/test/auth-oauth.e2e-spec.ts` | Luồng OAuth |
| `apps/api/src/modules/auth/providers/real-zalo-auth.provider.spec.ts` | Provider |

Các test **không nên** bị ảnh hưởng (nếu đỏ là dấu hiệu sửa lệch phạm vi):
`outbox.test.ts`, `outbox-persistence.test.ts`, `container-code.test.ts`,
`station-delivery.test.ts`, `collector-flow.test.ts`.

### Nghiệm thu chức năng sau khi sửa

```bash
# Demo (eco-oil-api) phải KHÔNG đổi hành vi
curl -s https://eco-oil-api-kgoe.onrender.com/api/v1/health
# → {"status":"ok","service":"eco-oil-api","db":"ok","redis":"disabled"}

curl -s https://eco-oil-api-kgoe.onrender.com/api/v1/auth/dev-accounts | head -c 100
# → phải vẫn trả danh sách tài khoản seed

# Tuyến collector phải vẫn có điểm
API=https://eco-oil-api-kgoe.onrender.com/api/v1
T=$(curl -s -X POST "$API/auth/zalo" -H 'content-type: application/json' \
   -d '{"zalo_id":"zalo_demo_collector_01","phone":"0911000001"}' \
   | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
curl -s "$API/routes/current" -H "authorization: Bearer $T"
# → stops có 1 phần tử, total_expected_liters = 35
```

---

## 9. TRÍCH NGUYÊN VĂN tài liệu SDK Zalo (Giai đoạn 2 không đọc lại file gốc)

> Nguồn: `zalo-ios-sdk-tong-quan.md` (developers.zalo.me/docs/sdk). Tài liệu mô tả SDK
> **native** (CocoaPods/Gradle). Dự án này **không** dùng SDK native — apps/api tái hiện
> cùng luồng bằng REST tới `oauth.zaloapp.com`. Các trích dẫn dưới đây là phần ngữ nghĩa
> (vòng đời token, công thức PKCE, tên field, mã lỗi) áp dụng chung cho cả hai.

### 9.1 Vòng đời token — NGUYÊN VĂN

> - OauthCode: 10 phút.
> - AccessToken: 1 giờ.
> - RefreshToken: 3 tháng.

> RefreshToken có hiệu lực là 3 tháng. Tuy nhiên nếu 1 RefreshToken được dùng để lấy
> AccessToken, thì sẽ bị hết hiệu lực sau khi lấy. Do đó cần lưu lại RefreshToken mới
> mỗi khi lấy AccessToken bằng RefreshToken.

> Vì mặc định thì oauthCode chỉ có hiệu lực chỉ trong 10 phút, nên ngay sau khi có được
> oauthCode thì cần thực hiện lấy AccessToken và RefreshToken ngay.

> - AccessToken: dùng để gọi các Official Account API. Hiệu lực: mặc định là 1 giờ,
>   server sẽ trả về thời gian expired khi gọi API get AccessToken.
> - RefreshToken: lưu lại RefreshToken ở phía app để kiểm tra đã đăng nhập hay chưa, và
>   sử dụng để tạo lại AccessToken khi AccessToken hết hiệu lực. Hiệu lực: mặc định là 3 tháng

> **Lưu ý**: RefreshToken chỉ sử dụng để lấy AccessToken được một lần duy nhất. Sau khi
> lấy AccessToken xong thì cần lưu lại RefreshToken mới được trả về kèm với AccessToken.

### 9.2 PKCE — công thức NGUYÊN VĂN

> Zalo sử dụng **code challenge** và **code verifier** (theo phương thức PKCE) để tăng
> độ bảo mật của quá trình xác thực và ủy quyền.
>
> - Tạo một **code verifier** và lưu trữ trên hệ thống của bạn.
> - Dùng mã hóa **code verifier** bằng bộ ký tự **ASCII**, tiếp đến dùng giải thuật
>   **SHA-256** để tạo mã băm, sau cùng encode **Base64** mã băm để tạo ra
>   **code challenge** từ **code verifier**.
> - `code_challenge = Base64.encode(SHA-256.hash(ASCII(code_verifier)))`
>
> Lưu ý:
> - Yêu cầu sử dụng **code verifier** khác nhau cho từng request.
> - **Code verifier** là 1 chuỗi bất kỳ, format có đủ chữ hoa, chữ thường, số và dài 43 ký tự.
> - **Code verifier** là code dùng để xác minh quyền sở hữu của bạn với
>   **authorization code** bạn nhận được từ hệ thống. Vui lòng không cung cấp code này
>   cho bên thứ ba.

> ✅ Code hiện tại khớp: `createHash('sha256').update(codeVerifier, 'ascii').digest('base64url')`
> tại `auth.service.ts:165`. `codeVerifier = randomBytes(32).toString('base64url')` → 43 ký tự.

### 9.3 Field phản hồi token — NGUYÊN VĂN (bản Android, sát REST nhất)

> Data trả về:
> - **access_token**: token để gọi api.
> - **refresh_token**: token để làm mới access_token. Thời gian 3 tháng. Sau khi hết
>   hiệu lực, đi lại flow login mới.
> - **expires_in**: thời gian hiệu lực của access_token (default 3600s)

```java
int err = data.optInt("error");
if (err == 0) {
    access_token  = data.optString("access_token");
    refresh_token = data.optString("refresh_token");
    long expires_in = Long.parseLong(data.optString("expires_in"));
}
```

> Tham số gửi lên: `oacode` (code sau khi login), `codeVerifier` (code app tự gen).

> ✅ `parseTokenResponse()` trong `real-zalo-auth.provider.ts` đã đọc đúng ba field
> `access_token` / `refresh_token` / `expires_in`, và chấp nhận `expires_in` ở cả dạng
> string lẫn number (tài liệu Android dùng `optString` rồi `Long.parseLong`).

### 9.4 Lấy profile — NGUYÊN VĂN

> Response `response.data` là dictionary như sau:

```json
{
    "id": "UserId",
    "name": "User Name",
    "picture": {
        "data": {
            "url": "User avatar url"
        }
    }
}
```

> - fields : id, picture, name

> ✅ `mapZaloProfileResponse()` đã map đúng `picture.data.url`. Endpoint code dùng:
> `https://graph.zalo.me/v2.0/me?fields=id,name,picture`.
> **Lưu ý: response KHÔNG có số điện thoại** — `phone: null` là đúng tài liệu.

### 9.5 Lấy số điện thoại / vị trí — endpoint và header (từ khảo sát roadmap)

> Backend gọi `GET https://graph.zalo.me/v2.0/me/info` với các header:
> - `access_token: <user access token>`
> - `code: <phone token | location token>`
> - `secret_key: <Zalo App Secret Key>`
>
> SDK trả một `token` dùng **một lần**, hết hạn sau **2 phút**.

> ✅ `zalo-location.provider.ts` đã dùng đúng endpoint + 3 header này.
> `payload.error === -501` → phải gọi từ **IP Việt Nam** (Render ở Singapore sẽ dính).

### 9.6 Endpoint REST apps/api đang dùng (KHÔNG có trong tài liệu SDK — ghi lại để khỏi mất)

```
Authorize : GET  https://oauth.zaloapp.com/v4/permission
            ?app_id=&redirect_uri=&code_challenge=&state=
Token     : POST https://oauth.zaloapp.com/v4/access_token
            Header: secret_key: <ZALO_APP_SECRET>
            Content-Type: application/x-www-form-urlencoded
            Body: grant_type=authorization_code, code, code_verifier, app_id
Profile   : GET  https://graph.zalo.me/v2.0/me?fields=id,name,picture
            Header: access_token
Me/info   : GET  https://graph.zalo.me/v2.0/me/info
            Header: access_token, code, secret_key
```

### 9.7 Bảng mã lỗi — NGUYÊN VĂN, phần liên quan

| Mã | Tên | Ghi chú |
|---|---|---|
| 0 | kZaloSDKErrorCodeNoneError | Không có lỗi |
| -5000 | kZaloSDKErrorCodeAppIdInvalid | App id is invalid |
| -5001 | kZaloSDKErrorCodeRequiredLogin | Invalid callback url |
| -5002 | kZaloSDKErrorCodeInvalidSecretKey | Invalid client secret |
| -5003 | kZaloSDKErrorCodeInvalidOauthCode | Invalid oauthorized code |
| -5004 | kZaloSDKErrorCodeInvalidAccessToken | Invalid access token |
| -5009 | kZaloSDKErrorCodeInvalidCodeChallenge | Invalid code challenge |
| -5010 | kZaloSDKErrorCodeInvalidCodeVerfifier | Invalid code verifier |
| -5011 | kZaloSDKErrorCodeInvalidRefreshToken | Invalid refresh token |
| -5012 | kZaloSDKErrorCodeInvalidOAID | Invalid oa id |
| -5013 | kZaloSDKErrorCodeInvalidBodyData | Invalid body data |
| -5014 | kZaloSDKErrorCodeInvalidParameter | Invalid required params |
| -5015 | kZaloSDKErrorCodeInvalidGrantType | Invalid grant type |
| -5016 | kZaloSDKErrorCodeAuthorizedCodeExpired | Authorized code expired |
| -5017 | kZaloSDKErrorCodeRefreshTokenExpired | Refresh token expired |
| -5018 | kZaloErrorCodeInvalidState | Invalid state |
| -6001 | kZaloSDKErrorCodeInvalidPermission | Invalid Permission (not in white list) |
| -6002 | kZaloSDKErrorCodeDidNotLogin | User not login |
| -6003 | kZaloSDKErrorCodeUserConsentFail | User not consent |
| -6004 | kZaloSDKErrorCodeUserNotOwnOa | User not own OA |
| -7004 | …YourApplicationMightBeNotApproveOrDisableByAdmin | Your application might be not approve or disable by admin |
| -7006 | kZaloSDKErrorCodeBuildRedirectUriFailed | Build redirect uri failed |
| -7035 | kZaloSDKErrorCodeUserCancel | User cancel |
| -8000 | kZaloSDKErrorCodeUnknownException | There was an unknown error |
| -9003 | …GraphAPIYourAppDontLinkWithAnyOfficialAccount | Your app don't link with any Official Account |

> Tài liệu SDK **không đề cập gì tới quy trình publish/deploy một Zalo Mini App**.
> Toàn bộ phần publish ở mục 6.2 đến từ Mini App Center, không từ tài liệu này.

---

## 10. Giá trị chủ dự án phải điền (placeholder)

Giai đoạn 2 **KHÔNG được đoán** các giá trị này. Nếu chưa có → dừng và hỏi.

| Placeholder | Nguồn | Ghi chú |
|---|---|---|
| `{{ZALO_APP_ID}}` | developers.zalo.me | Không phải secret |
| `{{ZALO_MINI_APP_ID}}` | mini.zalo.me | **KHÁC** App ID |
| `{{ZALO_VERIFIER_FILENAME}}` | Zalo cấp khi xác thực domain | Dạng `zalo_verifierXXXX.html` |
| `{{STAGING_API_ORIGIN}}` | Render service mới | Ví dụ `https://eco-oil-api-staging.onrender.com` |
| `{{STAGING_MINIAPP_ORIGIN}}` | Vercel preview/staging | Cho `ZALO_OAUTH_SUCCESS_REDIRECT_URL` |

`ZALO_APP_SECRET` **không bao giờ xuất hiện trong repo, chat, hay file này.** Chủ dự án
dán thẳng vào Render staging.

---

## 11. Việc chủ dự án làm thủ công (ngoài repo)

- [ ] Vercel `test-app-ptit-young-e-commerce-miniapp`: thêm `VITE_ADMIN_URL=https://test-app-ptit-young-e-commerce-admi-blond.vercel.app`
- [ ] Vercel `test-app-ptit-young-e-commerce-admin-7f3i`: thêm `NEXT_PUBLIC_LOGIN_GATE_URL=https://test-app-ptit-young-e-commerce-mini.vercel.app`
- [ ] Xoá 2 project Vercel rác: `ecollect-app`, `ecollect-admin`
- [ ] Tạo Zalo App mới + Mini App mới (xem `docs/ZALO_DEV_SETUP.md`)
- [ ] Nhờ thành viên cũ vô hiệu hoá bản Development của Mini App `2013689159096493937`
- [ ] Dựng Render service `eco-oil-api-staging` + Upstash Redis
