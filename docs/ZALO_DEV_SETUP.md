# Hướng dẫn setup Zalo Developer cho Eco-Oil / ECOllect

> Dành cho chủ dự án làm thủ công trên web. Không có bước nào trong file này sửa code.
> Đọc kèm `docs/zalo-integration-handoff.md`.

## Điều quan trọng nhất phải hiểu trước khi bắt đầu

Zalo có **hai hệ thống riêng biệt, hai trang khác nhau, hai ID khác nhau**. Nhầm hai
thứ này là lỗi phổ biến nhất và biểu hiện ra là mã lỗi `-5000 App id is invalid`.

| | Zalo App | Zalo Mini App |
|---|---|---|
| Trang | `developers.zalo.me` | `mini.zalo.me` |
| Cấp cho bạn | **App ID** + **App Secret Key** | **Mini App ID** |
| Dùng để | Đăng nhập OAuth, gọi Official Account API | Đóng gói & phát hành Mini App |
| Trong dự án này | `ZALO_APP_ID`, `ZALO_APP_SECRET` (Render) | Tham số cho `zmp deploy` |
| Ví dụ dạng ID | chuỗi số ngắn | `2013689159096493937` (19 chữ số) |

**App Secret Key chỉ tồn tại ở Zalo App.** Mini App không có secret.

---

## Chuẩn bị trước

- [ ] Tài khoản Zalo cá nhân (số điện thoại thật, đã xác thực).
- [ ] Đã dựng xong Render service staging và biết origin của nó — gọi là
      `{{STAGING_API_ORIGIN}}`, ví dụ `https://eco-oil-api-staging.onrender.com`.
      **Không dùng `eco-oil-api-kgoe.onrender.com`** — đó là service demo, phải giữ nguyên.
- [ ] Đã dựng Upstash Redis cho staging (bắt buộc — thiếu Redis thì đăng nhập OAuth
      kẹt ở bước cuối với lỗi `ZALO_OAUTH_HANDOFF_UNAVAILABLE`).

> Vì sao phải là staging chứ không phải service demo: bật `ZALO_AUTH_MODE=real` trên
> `eco-oil-api` sẽ làm `/auth/dev-accounts` trả 404 và bản demo Vercel không đăng nhập
> được nữa. Xem mục 2 của file bàn giao.

---

# PHẦN A — Zalo App (đăng nhập OAuth)

## A1. Tạo ứng dụng

1. Vào `https://developers.zalo.me`, đăng nhập bằng tài khoản Zalo.
2. Vào mục **Ứng dụng** → **Tạo ứng dụng mới**.
3. Điền tên (ví dụ `ECOllect`), chọn loại/lĩnh vực phù hợp.
4. Tạo xong, vào trang chi tiết ứng dụng → ghi lại **App ID**.

> **App ID không phải secret** — gửi cho tôi được.

## A2. Lấy App Secret Key

Trong trang ứng dụng → mục **Cài đặt ứng dụng** (hoặc **Thông tin ứng dụng**) → tìm
**Secret Key**. Có thể phải bấm "Hiện" / xác thực lại.

> ⛔ **KHÔNG gửi Secret Key cho tôi, không dán vào chat, không chụp màn hình, không
> đưa vào repo.** Dán thẳng vào Render staging → biến `ZALO_APP_SECRET`.
>
> Nhắc lại: phiên làm việc này đã có 3 lần suýt lộ secret (ảnh chụp env, file `.env `
> không được gitignore che, `.env.example` bị dán đè). Secret Key là thứ nguy hiểm
> nhất trong nhóm — có nó là ký được token thay mặt ứng dụng.

## A3. Bật tính năng Đăng nhập và khai báo Redirect URI

Trong ứng dụng → mục **Đăng nhập** (Login / Social API).

Thêm **Redirect URI / Callback URL** — chính xác từng ký tự, không thừa dấu `/`:

```
{{STAGING_API_ORIGIN}}/api/v1/auth/zalo/callback
```

Ví dụ: `https://eco-oil-api-staging.onrender.com/api/v1/auth/zalo/callback`

> Giá trị này phải **khớp tuyệt đối** với biến `ZALO_OAUTH_CALLBACK_URL` trên Render
> staging. Lệch một ký tự → `-5001 Invalid callback url`.
>
> Đây đúng là lỗi đã xảy ra với App cũ: App của thành viên đăng ký
> `https://eco-oil-api.onrender.com/api/v1/auth/zalo/callback`, trong khi dự án đã
> chuyển sang backend khác từ commit `668b60e`.

## A4. Xác thực domain

Zalo yêu cầu chứng minh bạn sở hữu domain trước khi cho dùng OAuth.

1. Trong mục xác thực domain, nhập domain: **`{{STAGING_API_ORIGIN}}`** (chỉ origin,
   **không** kèm `/api/v1`).
2. Zalo cho tải file dạng `zalo_verifierXXXXXXXX.html`.
3. **Ghi lại tên file** — cần gửi cho tôi để cập nhật code.
4. Đặt file vào **cả hai** chỗ (repo đã có sẵn cơ chế phục vụ nó):
   - `apps/api/public/<tên file>` ← chỗ NestJS thực sự đọc
   - `apps/miniapp/public/<tên file>`
5. Cập nhật `ZALO_VERIFIER_PATH` trong
   `apps/api/src/verification/zalo-verification.constants.ts` — **việc này tôi làm**,
   bạn chỉ cần gửi tên file.
6. Deploy staging, kiểm tra file truy cập được ở root (không có `/api/v1`):
   ```
   {{STAGING_API_ORIGIN}}/zalo_verifierXXXXXXXX.html
   ```
7. Quay lại Zalo bấm **Xác thực**.

> Hai file verifier cũ trong repo
> (`zalo_verifierUjw03lZo6XOpXymhruLl4nVounNxX3bDE30n.html`) chứng minh sở hữu
> `eco-oil-api.onrender.com` — domain không thuộc dự án. **Sẽ bị xoá.**

## A5. Xin quyền Social API

Trong mục **Sản phẩm / Quyền**, bật các quyền cần dùng. Tối thiểu cho đăng nhập:
lấy thông tin cơ bản (`id`, `name`, `picture`).

> Nếu sau này cần **số điện thoại** thì phải xin thêm quyền riêng, và backend phải gọi
> `GET https://graph.zalo.me/v2.0/me/info` với 3 header `access_token` / `code` /
> `secret_key`. Chưa cần ở giai đoạn này.

## A6. Kích hoạt ứng dụng

Chuyển trạng thái ứng dụng sang **"Đang hoạt động"**.

> Bỏ qua bước này → `-7004 Your application might be not approve or disable by admin`.

---

# PHẦN B — Zalo Mini App (phát hành)

## B1. Tạo Mini App

1. Vào `https://mini.zalo.me` (Mini App Center), đăng nhập **cùng tài khoản Zalo** ở Phần A.
2. Tạo Mini App mới, đặt tên `ECOllect` cho khớp `apps/miniapp/app-config.json`.
3. Ghi lại **Mini App ID** — **KHÁC** App ID ở Phần A.

> Mini App ID không phải secret — gửi cho tôi được.

## B2. Khai báo API Domain

Trong cấu hình Mini App, khai báo domain backend được phép gọi:

```
{{STAGING_API_ORIGIN}}
```

Chỉ origin, **không** kèm `/api/v1`.

## B3. Xin quyền cho Mini App

| Nhu cầu Eco-Oil | API dùng | Quyền cần xin |
|---|---|---|
| Định danh người dùng | `getAccessToken` | Có sẵn |
| Tên / avatar | `getUserInfo` | `scope.userInfo` |
| Vị trí tuyến thu gom | `getLocation` | `scope.userLocation` |
| Chụp ảnh dầu / biên nhận | `chooseImage` (camera) | Quyền Camera |
| Quét QR can | `scanQRCode` | Quyền "Mở Scan QR Code trên Zalo" |
| Lưu JWT/config | Native Storage | Quyền "Sử dụng native storage" |

> **Không xin tất cả quyền lúc khởi động.** Xin đúng lúc người dùng bắt đầu đăng ký,
> mở tuyến, quét QR hoặc chụp ảnh. Mã `-201` là người dùng từ chối — phải có đường
> dự phòng (app đã có: nhập mã can thủ công, file picker, tâm phường).

## B4. Thêm tài khoản tester vào whitelist

Mục **Tester / Người dùng thử nghiệm** → thêm số điện thoại Zalo của từng người sẽ test.

> Bỏ qua → `-6001 Invalid Permission (not in white list)`. Rất dễ bị tưởng nhầm là lỗi
> code. Khi thấy `-6001`, kiểm tra whitelist TRƯỚC khi nghi ngờ bất kỳ thứ gì khác.

## B5. Deploy bản thử nghiệm

Chạy trên máy (sau khi tôi đã pin `zmp-cli` vào devDependencies):

```bash
cd apps/miniapp
npx zmp-cli@4.0.3 login          # token CLI hết hạn định kỳ, phải login lại
pnpm build:zmp
npx zmp-cli@4.0.3 deploy --existing --outputDir dist
```

CLI sẽ hỏi: Project → Mini App ID → Version status (**Development**) → Description.

Quét QR Development bằng Zalo trên điện thoại.

> `zmp start` **không dùng được** cho repo này — CLI không nhận đây là project ZMP
> chuẩn. Luôn dùng `build:zmp` + `deploy --existing --outputDir dist`.
>
> Quên `zmp login` hoặc quên đổi description → bản mới không lên mà không báo lỗi rõ ràng.

## B6. Xác thực và gửi duyệt

Chỉ làm khi đã test xong trên bản Development:

1. Hoàn tất bước **Xác thực** (bắt buộc trước khi phát hành, không bắt buộc lúc code).
2. Nộp duyệt theo chính sách kiểm duyệt của Zalo.
3. Sau khi được duyệt mới có link `zalo.me/s/...` công khai.

> Trước khi được duyệt, link `zalo.me/s/...` sẽ báo "ứng dụng đang phát triển".
> Dùng QR Development, đừng dùng link public.

---

# Việc cần làm với App/Mini App CŨ

Mini App `2013689159096493937` của thành viên cũ vẫn còn bản Development đang sống,
và bản đó trỏ vào backend `eco-oil-api.onrender.com` mà dự án không kiểm soát.

- [ ] Nhờ thành viên đó **vô hiệu hoá hoặc xoá bản Development cũ**, để không ai quét
      nhầm QR chết trong lúc demo.
- [ ] Không cần xin quyền truy cập App cũ — dự án tạo mới hoàn toàn.

---

# Gửi lại cho tôi sau khi xong

Nhắn thẳng 4 giá trị sau (không có giá trị nào là secret):

```
ZALO_APP_ID        = ...
ZALO_MINI_APP_ID   = ...
Tên file verifier  = zalo_verifierXXXXXXXX.html
STAGING_API_ORIGIN = https://...onrender.com
```

Còn `ZALO_APP_SECRET` thì **bạn tự dán vào Render staging**, không gửi cho tôi.

## Biến cần đặt trên Render staging

```
NODE_ENV=production
ZALO_AUTH_MODE=real
DEMO_MODE=false
ZALO_APP_ID=<App ID>
ZALO_APP_SECRET=<Secret Key — dán trực tiếp>
ZALO_OAUTH_CALLBACK_URL={{STAGING_API_ORIGIN}}/api/v1/auth/zalo/callback
ZALO_OAUTH_SUCCESS_REDIRECT_URL={{STAGING_MINIAPP_ORIGIN}}/
REDIS_URL=<Upstash>
CORS_ORIGINS=https://h5.zdn.vn,{{STAGING_MINIAPP_ORIGIN}}
DATABASE_URL=<Neon — cân nhắc branch riêng cho staging>
JWT_SECRET=<sinh mới, KHÁC secret của demo>
```

> `NODE_ENV=production` là bắt buộc: `auth.module.ts` chặn mock mode ở production, và
> `auth.controller.ts` chỉ đặt cookie `Secure` + `SameSite=None` khi ở production —
> thiếu thì cookie không đi được cross-site.

---

# Tra cứu nhanh: mã lỗi → nguyên nhân

| Mã | Nghĩa | Kiểm tra đầu tiên |
|---|---|---|
| `-5000` | App id is invalid | Có đang dán nhầm **Mini App ID** vào `ZALO_APP_ID` không? |
| `-5001` | Invalid callback url | Redirect URI trên Zalo có khớp tuyệt đối `ZALO_OAUTH_CALLBACK_URL`? |
| `-5002` | Invalid client secret | `ZALO_APP_SECRET` sai hoặc dính khoảng trắng |
| `-5003` | Invalid oauthorized code | Code đã dùng rồi (chỉ dùng được 1 lần) |
| `-5009` | Invalid code challenge | Sai công thức PKCE |
| `-5010` | Invalid code verifier | Mất `code_verifier` giữa 2 bước |
| `-5016` | Authorized code expired | Quá 10 phút |
| `-5017` | Refresh token expired | Quên lưu refreshToken MỚI sau mỗi lần đổi |
| `-6001` | Not in white list | **Tài khoản test chưa thêm vào whitelist tester** |
| `-6003` | User not consent | Người dùng từ chối cấp quyền |
| `-7004` | App not approved / disabled | App chưa chuyển "Đang hoạt động", hoặc Mini App chưa qua xác thực + kiểm duyệt |
| `-9003` | App don't link with any OA | Chưa liên kết Official Account (chỉ cần khi dùng OA API) |

Đầy đủ bảng mã lỗi: mục 9.7 của `docs/zalo-integration-handoff.md`.
