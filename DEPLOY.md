# Eco-Oil demo deployment

Tài liệu này chuẩn bị cho bản demo chạy trên trình duyệt. Chưa bao gồm đóng gói Zalo Mini App.

Quy trình bật relay GPS, cập nhật Render, mở QR Development và thứ tự trình diễn được ghi tại [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md).

## Biến môi trường

### API

| Biến | Ví dụ | Bắt buộc | Ghi chú |
|---|---|---:|---|
| `NODE_ENV` | `production` | Không | Môi trường chạy |
| `PORT` | `3000` | Không | Mặc định 3000; API lắng nghe `0.0.0.0` |
| `DATABASE_URL` | `postgresql://user:password@host:5432/uco?sslmode=require` | Có | Prisma/PostgreSQL; giữ `sslmode=require` với Neon/Supabase |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài | Có | API crash ngay nếu thiếu hoặc rỗng |
| `DEMO_MODE` | `true` | Không | Khi `true`, dev accounts chỉ có MERCHANT/COLLECTOR |
| `ZALO_AUTH_MODE` | `real` hoặc `mock` | Không | `mock` chỉ dùng cho local/demo kiểm thử |
| `ZALO_APP_ID` | ID ứng dụng Zalo | Có khi `ZALO_AUTH_MODE=real` | Chỉ đặt ở API/server |
| `ZALO_APP_SECRET` | secret key của ứng dụng Zalo | Có khi `ZALO_AUTH_MODE=real` | Chỉ đặt ở API/server, không đưa vào frontend |
| `ZALO_OAUTH_CALLBACK_URL` | `https://eco-oil-api-kgoe.onrender.com/api/v1/auth/zalo/callback` | Có khi OAuth web | Phải khớp Callback URL trong Zalo for Developers |
| `ZALO_OAUTH_SUCCESS_REDIRECT_URL` | `https://test-app-ptit-young-e-commerce-mini.vercel.app/` | Có khi OAuth web | URL frontend callback; API gắn one-time `zalo_code`, không gắn access/refresh token |
| `CORS_ORIGINS` | `https://test-app-ptit-young-e-commerce-mini.vercel.app,https://test-app-ptit-young-e-commerce-admi-blond.vercel.app` | Có khi gọi cross-origin | Danh sách origin phân cách bằng dấu phẩy |
| `REDIS_URL` | `redis://host:6379` | Không | Bỏ trống được; các tính năng phụ thuộc Redis sẽ tắt, API vẫn chạy |
| `GEO_MISMATCH_THRESHOLD_M` | `500` | Không | Ngưỡng cảnh báo GPS |
| `DELIVERY_VARIANCE_THRESHOLD_PCT` | `0.02` | Không | Ngưỡng lệch nộp trạm |

### Mini App trình duyệt

| Biến | Ví dụ | Bắt buộc |
|---|---|---:|
| `VITE_API_BASE_URL` | `https://eco-oil-api-kgoe.onrender.com/api/v1` | Có |
| `VITE_DEMO_MODE` | `false` | Không |
| `VITE_ESTIMATED_PRICE_PER_LITER` | `8000` | Không |

Khi chạy local, có thể dùng `/api/v1` cùng Vite proxy. Trên Vercel phải đặt URL đầy đủ tới Render API; không dùng localhost, `example.com` hoặc URL tương đối. `VITE_DEMO_MODE` phải là `false` hoặc bỏ trống trên production; khung tài khoản thử nghiệm chỉ xuất hiện khi bật rõ ràng và API trả về tài khoản.

### Admin Next.js

| Biến | Ví dụ | Bắt buộc |
|---|---|---:|
| `NEXT_PUBLIC_API_BASE_URL` | `https://eco-oil-api-kgoe.onrender.com/api/v1` | Có |
| `NEXT_PUBLIC_ADMIN_ZALO_ID` | `zalo_admin_01` | Có |
| `NEXT_PUBLIC_ADMIN_PHONE` | `0900000000` | Có |

## Thứ tự triển khai

```powershell
pnpm install
pnpm generate
pnpm prisma:migrate
pnpm seed:demo
```

Luôn chạy migration trước, sau đó mới chạy seed. `seed:demo` dùng ID cố định và `upsert`, có thể chạy nhiều lần mà không nhân bản dữ liệu.

## Build và start

```powershell
# API
pnpm --filter @eco-oil/api build
pnpm --filter @eco-oil/api start

# Mini App
pnpm --filter @eco-oil/miniapp build
pnpm --filter @eco-oil/miniapp exec vite preview --host 0.0.0.0 --port 5173

# Admin
pnpm --filter @eco-oil/admin build
pnpm --filter @eco-oil/admin start
```

Có thể build toàn workspace bằng `pnpm build`.

## Tài khoản demo

Mini App dùng các tài khoản `zalo_demo_merchant_01` đến `zalo_demo_merchant_05` và `zalo_demo_collector_01`, `zalo_demo_collector_02` khi bật mock. Admin không xuất hiện trong `/auth/dev-accounts`; Admin đăng nhập tại Admin bằng `NEXT_PUBLIC_ADMIN_ZALO_ID` và số điện thoại tương ứng (không cần mật khẩu).

## Bảo mật

- Không commit `.env`, mật khẩu, JWT secret hoặc connection string có password.
- `JWT_SECRET` không có fallback trong code.
- `DEMO_MODE=true` chặn Admin qua đường `/auth/zalo` và `/auth/dev-accounts` không trả Admin.
- Redis là tùy chọn; PostgreSQL vẫn bắt buộc.

- ## Triển khai cloud (cấu hình đang chạy thật)

Bản demo đang chạy trên: Neon (PostgreSQL + PostGIS), Upstash (Redis),
Render (API), Vercel (Mini App + Admin). Toàn bộ ở Singapore.

### Render — service API

Build Command:
```
pnpm install --frozen-lockfile && pnpm --filter api exec prisma generate --schema=../../prisma/schema.prisma && pnpm --filter "api..." build
```

Start Command:

```
node apps/api/dist/main.js
```

Ba điểm bắt buộc, mỗi điểm đều từng làm deploy chết:

- `--filter "api..."` có ba dấu chấm, để build cả package phụ thuộc
  (`@eco-oil/validation`, `@eco-oil/shared-types`). Thiếu ba chấm thì lỗi
  `TS2307: Cannot find module '@eco-oil/validation'`.
- `--schema=../../prisma/schema.prisma` vì schema nằm ở gốc repo, không nằm
  trong `apps/api`.
- **Không set biến `PORT`.** Render tự cấp cổng; set tay thì báo
  "No open ports detected" rồi kill service.
- Start Command **không được** chứa `prisma migrate deploy`. Chuỗi kết nối
  Neon là dạng pooled, không xin được advisory lock của Prisma, nên migration
  timeout `P1002` và server chết trong vòng lặp restart.

Biến môi trường trên Render: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
`CORS_ORIGINS`, `DEMO_MODE`, `NODE_ENV`, `ZALO_AUTH_MODE`,
`ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OAUTH_CALLBACK_URL`,
`ZALO_OAUTH_SUCCESS_REDIRECT_URL`.

`REDIS_URL` phải trỏ tới Redis dùng chung của API khi bật OAuth web. Sau callback,
API lưu hash của one-time handoff code trong Redis trong 60 giây; frontend POST
code tới `/api/v1/auth/zalo/exchange`, lưu session theo cơ chế token hiện có,
rồi xóa code khỏi URL. `CORS_ORIGINS` phải chứa chính xác origin của frontend
Vercel và API phải giữ `credentials: true`.

Khi dùng OAuth thật, đặt `ZALO_AUTH_MODE=real`, cấu hình App ID/App Secret ở
Zalo for Developers, bật đúng quyền Social API cần dùng, và đăng ký chính xác
Callback URL. Production không khởi động nếu vẫn để mock.

### Quay lại `mock` khi cần (rollback)

`eco-oil-api` cố ý **không** tách môi trường demo/OAuth thật — bật `ZALO_AUTH_MODE=real`
đổi ngay hành vi của chính service đang chạy production. Nếu OAuth thật gãy giữa chừng
(App chưa duyệt, callback URL sai, Redis rớt...), quay lại `mock` khôi phục demo ngay:

1. Render → `eco-oil-api` → Environment → sửa `ZALO_AUTH_MODE` về `mock` → Save Changes.
2. Chờ Live, gọi `GET /api/v1/auth/dev-accounts` — phải trả 200 với 7 tài khoản demo.

Rollback khôi phục ngay: picker tài khoản demo hoạt động lại, `/auth/zalo` nhận lại
payload `{zalo_id, phone}`. Không cần chạm `DATABASE_URL`, `REDIS_URL`, hay biến nào khác.

**Không tự khôi phục:** người dùng Zalo thật đã đăng nhập trong lúc `real` mode đang bật
vẫn còn nguyên trong Postgres như user bình thường (không bị xoá), nhưng không đăng nhập
lại được cho tới khi bật `real` lần nữa — tài khoản đó không nằm trong danh sách demo.
Đây không phải mất dữ liệu, chỉ là tạm thời không đăng nhập được.

Dữ liệu seed (5 quán, 2 người thu gom, đơn hàng) không phụ thuộc `ZALO_AUTH_MODE` —
luôn nằm nguyên trong Neon và luôn xem được qua Admin (`/auth/admin/login`, đường
riêng, không bị ảnh hưởng ở cả hai chiều).

```
CORS_ORIGINS=https://test-app-ptit-young-e-commerce-mini.vercel.app,https://test-app-ptit-young-e-commerce-admi-blond.vercel.app
```

Không có dấu cách sau dấu phẩy, không có dấu `/` ở cuối. Sau khi sửa biến
phải bấm **Save Changes** rồi F5 lại trang để xác nhận — giá trị hiện đúng
trên màn hình không có nghĩa là đã lưu.

### Vercel — hai project riêng

| Project | Root Directory | Framework |
|---|---|---|
| Mini App | `apps/miniapp` | Vite |
| Admin | `apps/admin` | Next.js |

Root Directory là bắt buộc; trỏ vào gốc repo thì build sai app.

### Quy trình deploy khi có migration mới

Render tự deploy mỗi lần push. Nên nếu push trước, code mới sẽ chạy trên
schema cũ và trả lỗi 500. Thứ tự đúng:

```powershell
cd "<đường dẫn repo>"
$env:DATABASE_URL="<chuỗi kết nối Neon>"
pnpm --filter api exec prisma migrate deploy --schema=../../prisma/schema.prisma
# xác nhận "All migrations have been successfully applied", rồi mới push
```

Đóng cửa sổ PowerShell sau khi xong để biến không lẫn vào lần chạy dev sau.
Không để dòng `$env:DATABASE_URL` xuất hiện trong ảnh chụp màn hình.

Bước này chưa tự động. Hướng xử lý lâu dài: thêm `directUrl` vào datasource
Prisma trỏ chuỗi kết nối không pooled, hoặc tạo one-off job trên Render.

### Dữ liệu tham chiếu

`prisma migrate deploy` chỉ tạo cấu trúc, **không chạy seed**. Sau lần
migrate đầu tiên trên database trống phải tự nhập dữ liệu tham chiếu, ít
nhất là bảng `oil_prices` — thiếu giá thì chốt kỳ ném `NO_PRICE_CONFIGURED`.

### Lưu ý khi demo

Render gói Free ngủ khi không có request; lần gọi đầu mất khoảng 50 giây.
Gọi trước `GET /api/v1/health` vài phút trước khi trình diễn.

## Đóng gói Zalo Mini App (Development)

Luồng đóng gói Zalo Mini App đã được **khôi phục** (trước đó tạm huỷ để tập trung Web Demo).
Bản Web trên Vercel vẫn là kênh demo chính; gói ZMP là **đầu ra thứ hai, độc lập**:

| Đầu ra              | Lệnh                                       | Mode build    | Demo Account Picker             |
| ------------------- | ------------------------------------------ | ------------- | ------------------------------- |
| Web SPA trên Vercel | `pnpm --filter @eco-oil/miniapp build`     | `production`  | **BẬT** (`VITE_DEMO_MODE=true`) |
| Gói Zalo Mini App   | `pnpm --filter @eco-oil/miniapp build:zmp` | `zmp` (riêng) | **TẮT luôn**                    |

`build:zmp` dùng mode riêng `zmp` nên **không thể lẫn demo mode** từ `.env.local` hay biến
môi trường Vercel, và bật `inlineDynamicImports` để gộp mọi dynamic import vào một bundle
duy nhất (`assets/index.module.js`) — nhờ đó `app-config.json` chỉ cần khai báo đúng một
file. Lệnh `build` của Vercel (mode `production`) không bị thay đổi.

### Các bước deploy bản Development

```bash
pnpm --filter @eco-oil/miniapp exec zmp-cli login   # quét QR bằng tài khoản Admin/Developer của Mini App
pnpm --filter @eco-oil/miniapp build:zmp
pnpm --filter @eco-oil/miniapp deploy:zmp           # = npx zmp-cli@4.0.3 deploy --passive --existing --outputDir dist
```

- Chọn đúng **Mini App ID** (19 chữ số, lấy ở `mini.zalo.me`) — **không** phải App ID.
- Chọn loại phiên bản **Development**: bản này bị ghi đè mỗi lần deploy và không hiện trong
  "Quản lý phiên bản", đúng nhu cầu chỉ cho tester nội bộ.
- **Luôn nhập Description.** Quên Description hoặc `zmp-cli login` đã hết hạn thì deploy
  "im lặng": không báo lỗi rõ mà bản cũ vẫn nguyên.
- `zmp start` **không dùng được** cho repo này — CLI không nhận đây là project ZMP chuẩn vì
  nằm trong monorepo. Luôn dùng `build:zmp` + `deploy:zmp`.
- `zmp-cli` cố ý chạy qua `npx` (không thêm vào `devDependencies`) để không phải nạp lại
  hàng nghìn dòng vào `pnpm-lock.yaml`.

### Bẫy đã gặp — ghi lại để không lặp lại

- **Không thêm `<link rel="stylesheet">` vào `apps/miniapp/index.html`.** `zmp-cli sync-config`
  quét thẻ này và ghi URL (ví dụ Google Fonts) vào `listCSS`, khiến Zalo từ chối với
  _"File app-config.json is invalid"_. Font đang nạp qua `@import` ở đầu `src/styles.css`.
- `"inline.js"` trước đây nằm trong `listSyncJS` nhưng **không tồn tại** trong `dist/` — file
  này chỉ do `zmp-cli sync-config` sinh khi `index.html` có inline `<style>`/`<script>`, còn
  repo này không có inline content (mọi style đều nằm trong `index.css`). Đã **bỏ** `"inline.js"`
  khỏi `listSyncJS`, chỉ giữ `"./assets/index.module.js"`.
- `index.html` phải giữ `<div id="app">`; `vite.config.ts` phải giữ `base: './'` và tên
  chunk `*.module.js` — cả hai đang đúng, **không sửa**. Riêng mode `zmp` có thêm
  `inlineDynamicImports: true` (gộp chunk) để tránh phải khai báo tên chunk có hash vào
  `app-config.json`; mode `production` (Vercel) vẫn code-split bình thường.

### Danh sách tester (whitelist số điện thoại)

1. Vào `mini.zalo.me` → chọn Mini App → mục thành viên/tester.
2. Thêm số điện thoại Zalo của từng tester nội bộ.
3. Thiếu bước này, tester mở app sẽ nhận lỗi `-6001 Invalid Permission (not in white list)`.

### Tên miền API phải khai báo (Domain Whitelist)

Khai báo origin API mà Mini App gọi, ví dụ `https://<staging-api>.onrender.com`.
Mini App chạy trên host `h5.zdn.vn`, nên phía API phải có `https://h5.zdn.vn` trong
`CORS_ORIGINS`, và middleware phải trả **đúng một** origin khớp request (kể cả preflight).

### File xác thực domain (verifier) — cách lấy tên file mới

Zalo bắt buộc chứng minh quyền sở hữu domain API trước khi cho dùng OAuth. File verifier
hiện có trong repo (`zalo_verifierN-EW8eJWCXXVp-4_ghjiP4E8r5Yl_WuFE34r.html`) thuộc **Zalo App
của tài khoản cũ** — hạ tầng dự án không còn kiểm soát — nên **không dùng lại được**. Zalo App
mới sẽ được cấp **một file mới**.

**Cách lấy tên file (làm trên web, cần tài khoản chủ dự án):**

1. Đăng nhập `https://developers.zalo.me` bằng tài khoản chủ dự án.
2. Vào **Ứng dụng** → chọn Zalo App mới → mục **Cài đặt** → **Xác thực domain**.
3. Nhập domain API staging — **chỉ origin, KHÔNG kèm `/api/v1`**:
   `https://<staging-api>.onrender.com`
4. Zalo hiển thị một file cho tải về, tên dạng **`zalo_verifierXXXXXXXX.html`**.
5. Sao chép **đúng tên file đó** (giữ nguyên cả `zalo_verifier`, phần `XXXXXXXX` và đuôi
   `.html`) rồi gửi lại cho đội kỹ thuật kèm `ZALO_APP_ID` và origin staging.

> Tên file verifier **không phải secret** — gửi qua chat được.
> ⛔ **Không** gửi `ZALO_APP_SECRET`; secret chỉ dán trực tiếp vào Render staging.

**Khi đã có tên file, đội kỹ thuật cập nhật đúng 3 chỗ:**

| #   | Vị trí                                                     | Việc cần làm                                                    |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | `apps/api/public/<tên-file-mới>.html`                      | Đặt nội dung file Zalo cấp vào đây (API phục vụ qua controller) |
| 2   | `apps/api/src/verification/zalo-verification.constants.ts` | Đổi `ZALO_VERIFIER_PATH` sang tên file mới                      |
| 3   | `apps/miniapp/public/<tên-file-mới>.html`                  | Đặt bản sao (để gói ZMP cũng phục vụ được file), xoá file cũ    |

Kiểm chứng trước khi bấm "Xác thực" trên trang Zalo:

```bash
pnpm --filter @eco-oil/api test          # có e2e zalo-verification.e2e-spec.ts
curl -s https://<staging-api>.onrender.com/<tên-file-mới>.html
```

URL trên phải trả về **đúng nội dung** file Zalo cấp.

### Biến môi trường bắt buộc trên staging (khác service demo)

```text
NODE_ENV=production
ZALO_AUTH_MODE=real
DEMO_MODE=false
ZALO_APP_ID=<App ID>
ZALO_APP_SECRET=<Secret Key — dán trực tiếp, không qua chat>
ZALO_OAUTH_CALLBACK_URL=https://<staging-api>.onrender.com/api/v1/auth/zalo/callback
ZALO_OAUTH_SUCCESS_REDIRECT_URL=<Mini App staging origin>
REDIS_URL=<Upstash — thiếu thì OAuth kẹt ở ZALO_OAUTH_HANDOFF_UNAVAILABLE>
CORS_ORIGINS=https://h5.zdn.vn,<Mini App staging origin>
DATABASE_URL=<Neon — nên dùng branch riêng>
JWT_SECRET=<sinh mới, KHÁC secret của demo>
```

> ⚠️ **Không bật `ZALO_AUTH_MODE=real` trên `eco-oil-api` (service demo).** Khi đó
> `GET /auth/dev-accounts` trả 404 và **bản Web Vercel mất khả năng đăng nhập**. Mini App và
> OAuth thật chỉ được trỏ vào staging. Quy trình dựng staging chi tiết:
> `docs/archive/ZALO_DEV_SETUP.md`.

### Checklist trước khi phát QR cho tester

- [ ] `build:zmp` chạy thành công, `dist/app-config.json` và `dist/assets/index.module.js` tồn tại.
- [ ] Bundle ZMP **không** chứa UI demo (kiểm nhanh: `grep -l dev-login-block dist/assets/*.js` phải rỗng).
- [ ] `zmp-cli login` còn hạn, đã chọn đúng Mini App ID và loại **Development**, đã nhập Description.
- [ ] Tester đã có trong whitelist số điện thoại; domain API đã khai báo.
- [ ] API staging đã bật `ZALO_AUTH_MODE=real` + Redis; `/auth/zalo/start` chuyển hướng sang Zalo (không trả 503).
- [ ] Relay profile/location đang chạy sống (xem `docs/DEMO_RUNBOOK.md`), nếu không đăng nhập thật sẽ lỗi `ZALO_PROFILE_API_ERROR`.
- [ ] Không có App Secret, access token hay tài khoản seed nào trong bundle/log.
