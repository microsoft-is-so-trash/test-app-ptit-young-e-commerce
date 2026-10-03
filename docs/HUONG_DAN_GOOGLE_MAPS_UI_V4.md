# Hướng dẫn bật Google Maps cho UI v4 (chỉ thử trên `ui_version_4`)

Viết ngày 03/10/2026, sau giai đoạn I1. Tài liệu này giúp chủ dự án:

1. Tạo key Google, đặt hạn mức và cảnh báo ngân sách.
2. Thử đầy đủ tính năng mới trên máy cá nhân (localhost), **không chạm** vào bất cứ thứ gì của bản
   đang chạy `ui_version_3`.
3. Biết cách đưa lên online sau này mà vẫn tách khỏi `ui_version_3`.

---

## 0. Nguyên tắc bảo toàn `ui_version_3`

Bản đang chạy dùng: Render service `eco-oil-api` (API demo cho web), service Render API staging cho
Zalo Mini App (`test-app-ptit-young-e-commerce.onrender.com`), cơ sở dữ liệu Neon, Redis của Render,
hai project Vercel (Mini App và Admin). **Không sửa bất cứ thứ gì trong số đó** cho tới khi
`ui_version_4` được duyệt và chủ động gộp vào.

| Không làm | Lý do |
|---|---|
| Thêm/sửa biến môi trường trên Render `eco-oil-api` | Render khởi động lại service ngay khi lưu biến, bản đang chạy bị gián đoạn |
| Thêm key vào biến **Production** của Vercel | Bản production đang chạy code `ui_version_3`, không dùng key; thêm vào chỉ tăng rủi ro lộ key |
| Trỏ API chạy thử (local hoặc staging) vào Neon hay Redis của production | Test e2e và seed xoá/ghi đè dữ liệu |
| Merge `ui_version_4` vào `ui_version_3` hoặc `main` | Chưa duyệt |

Kiểm tra một lần (chỉ xem, không sửa):

- Render → `eco-oil-api` → Settings → Build & Deploy → **Branch**: phải là nhánh của bản đang chạy
  (`ui_version_3` hoặc `main`), **không** phải `ui_version_4`. Agent đã push lên `ui_version_4`
  nhiều lần; nếu bản production không đổi thì Render đang theo đúng nhánh khác.
- Vercel → từng project → Settings → Git → **Production Branch**: không phải `ui_version_4`.
- Lưu ý: Vercel tự tạo bản **Preview** (đường link riêng, không đổi tên miền production) cho mỗi lần
  push lên `ui_version_4`. Bản Preview dùng biến môi trường loại "Preview"; nếu biến đó đang trỏ API
  production thì **đừng dùng bản Preview để tạo dữ liệu** (đơn, giao dịch). Muốn tắt hẳn: Settings →
  Git → Ignored Build Step, chỉ build nhánh production.

---

## 1. Tạo key và chặn chi phí trên Google Cloud

Vào [console.cloud.google.com](https://console.cloud.google.com), chọn project đã có tài khoản
thanh toán.

### 1.1. Bật đúng 3 API

APIs & Services → Library, tìm và bấm **Enable**:

| API | Dùng cho |
|---|---|
| Routes API | Gợi ý trạm theo quãng đường (I1.2) |
| Places API (New) | Tìm địa chỉ trạm ở admin (I1.1) |
| Maps JavaScript API | Bản đồ kéo ghim ở admin (I1.1) |

Không bật: Places API (bản cũ), Directions API, Distance Matrix API.

### 1.2. Key phía máy chủ: `GOOGLE_MAPS_SERVER_KEY`

1. APIs & Services → Credentials → **Create credentials → API key**.
2. Bấm vào key vừa tạo → **Name**: `eco-oil-v4-server`.
3. **Application restrictions**: `None`. Render gói Free không có IP cố định nên không khoá theo IP
   được. Nếu chỉ thử trên máy cá nhân, có thể chọn `IP addresses` và nhập IP công khai của máy.
4. **API restrictions** → Restrict key → chọn **Routes API** và **Places API (New)**.
5. **Save**. Sao chép key, cất vào trình quản lý mật khẩu. **Không gửi qua chat, không commit.**

### 1.3. Key phía giao diện admin: `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`

1. Tạo thêm một API key, **Name**: `eco-oil-v4-admin-browser`.
2. **Application restrictions** → `Websites` → thêm:
   - `http://localhost:3001/*`
   - `http://127.0.0.1:3001/*`
   - (sau này, nếu đưa lên online) tên miền bản thử của admin v4.
3. **API restrictions** → Restrict key → chỉ **Maps JavaScript API**.
4. **Save**. Key này nằm trong mã trang admin (ai mở trang cũng thấy), nên bắt buộc giới hạn tên miền
   như trên.

### 1.4. Hạ hạn mức gọi API (chốt chặn thứ hai)

APIs & Services → **Google Maps Platform → Quotas**. Với từng API ở mục 1.1, sửa các dòng hạn mức
(ưu tiên dòng theo ngày; nếu chỉ có theo phút thì đặt thấp):

| API | Gợi ý tối đa mỗi ngày | Căn cứ |
|---|---|---|
| Routes API (Compute Route Matrix, tính theo phần tử) | 300 | Mức miễn phí 10.000/tháng ≈ 330/ngày |
| Places API (New) – Autocomplete | 300 | Admin chỉ dùng vài chục lần/tháng |
| Places API (New) – Place Details | 100 | Mỗi lần chọn địa chỉ là 1 lượt |
| Maps JavaScript API – lượt tải bản đồ | 100 | Bản đồ chỉ tải khi mở form trạm |

Tên các dòng hạn mức có thể khác một chút giữa các API; chọn dòng có chữ "per day" nếu có. Ngoài
chốt chặn này, code đã tự dừng ở 8.000 lượt/tháng cho mỗi loại API (đếm trong Redis).

### 1.5. Cảnh báo ngân sách

Billing → **Budgets & alerts** → Create budget:

- Phạm vi: project này. Số tiền: **5 USD/tháng**. Ngưỡng cảnh báo: 50%, 90%, 100%. Gửi email cho
  chủ dự án.
- Lưu ý từ Google: cảnh báo ngân sách **chỉ gửi email, không tự chặn chi tiêu**. Chốt chặn thật là
  hạn mức ở 1.4 và bộ đếm 8.000 trong code.

---

## 2. Thử đầy đủ trên máy cá nhân (không chạm production)

Chạy toàn bộ API + cơ sở dữ liệu + Redis trên máy bằng Docker (hoặc Podman trên Fedora). Mọi thứ
nằm trong máy, tách hẳn khỏi Render/Neon/Vercel.

### 2.1. Chuẩn bị (một lần)

```bash
git switch ui_version_4
git pull
pnpm install
docker compose up -d        # Fedora/Podman: podman compose up -d
```

`docker-compose.yml` tạo PostgreSQL/PostGIS ở cổng `5433` và Redis ở `6379`, chỉ trên máy.

### 2.2. File biến môi trường

**Gốc repo `.env`** (đã có file mẫu `.env.example`; file `.env` không được commit). Các dòng cần
có:

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/uco
REDIS_URL=redis://localhost:6379
JWT_SECRET=<chuỗi ngẫu nhiên dài, chỉ dùng trên máy>
DEMO_MODE=false
ZALO_AUTH_MODE=mock
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
GOOGLE_MAPS_SERVER_KEY=<key ở mục 1.2>
```

Kiểm tra kỹ `DATABASE_URL` và `REDIS_URL` trỏ `localhost`, **không** phải Neon hay Redis của Render.

**`apps/admin/.env.local`** (tạo mới, file này không được commit):

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_DEMO_OFFLINE=0
NEXT_PUBLIC_LOGIN_GATE_URL=http://localhost:5173
NEXT_PUBLIC_ADMIN_ZALO_ID=zalo_admin_01
NEXT_PUBLIC_ADMIN_PHONE=0900000000
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=<key ở mục 1.3>
```

**`apps/miniapp/.env.local`** (tạo mới; Vite ưu tiên file này hơn `.env`). `/api/v1` đi qua proxy
của Vite tới `localhost:3000`, không cần cấu hình CORS:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_DEMO_MODE=true
VITE_DEMO_OFFLINE=false
```

### 2.3. Tạo dữ liệu và chạy

```bash
pnpm prisma:migrate          # tạo bảng trong DB trên máy
pnpm db:seed                 # nạp dataset seed-demo (5 quán, 2 người thu gom, 2 trạm)

# Cửa sổ 1 — API (nạp .env vào shell để API đọc được, vì API chạy trong apps/api)
set -a; source .env; set +a
pnpm --filter @eco-oil/api dev            # http://localhost:3000/api/v1/health

# Cửa sổ 2 — Admin
pnpm --filter @eco-oil/admin dev          # http://localhost:3001

# Cửa sổ 3 — Mini App
pnpm --filter @eco-oil/miniapp dev        # http://localhost:5173
```

Admin đăng nhập bằng `zalo_admin_01` / `0900000000` (tài khoản admin của seed-demo).

### 2.4. Kịch bản thử

**Admin – vị trí trạm (I1.1)**

1. Trạm → Tạo trạm (hoặc Sửa một trạm).
2. Ô "Tìm vị trí theo địa chỉ": gõ `22 Hàng Bạc`, chờ khoảng nửa giây → hiện danh sách gợi ý.
3. Bấm một gợi ý → ô Vĩ độ, Kinh độ tự điền; bản đồ hiện với ghim.
4. Kéo ghim → số vĩ độ, kinh độ đổi theo. Bấm Lưu.
5. Thử dự phòng: xoá `GOOGLE_MAPS_SERVER_KEY` trong `.env`, chạy lại API → gõ địa chỉ sẽ báo "Hãy
   nhập vĩ độ, kinh độ bằng tay"; ô nhập tay vẫn dùng được.

**Mini App – gợi ý trạm (I1.2, I1.3)**

1. Chọn tài khoản người thu gom `zalo_demo_collector_01` → Bắt đầu ca thu gom.
2. Thu gom 1 điểm → Đi nộp trạm.
3. Thẻ trạm hiện "x km · đường ô tô" (có key) hoặc "x km · đường chim bay" (không key/lỗi Google).
4. Thử mất mạng: sau khi giao dịch đã đồng bộ, mở DevTools → Network → Offline → vào lại màn chọn
   trạm → thấy "Đang dùng danh sách trạm đã lưu". (Mất mạng **trước khi** đồng bộ xong thì chưa nộp
   trạm được — sẽ làm ở task X1.)

**Xem bộ đếm chi phí**

```bash
docker exec uco-redis redis-cli --scan --pattern 'maps:*'
docker exec uco-redis redis-cli get maps:route-matrix:elements:utc:2026-10
```

Mỗi lần gợi ý trạm có gọi Google tăng tối đa 5; gọi lại cùng vị trí trong 10 phút thì dùng cache,
không tăng.

### 2.5. Dọn dẹp

```bash
docker compose down          # giữ dữ liệu
docker compose down -v       # xoá luôn dữ liệu trên máy
```

---

## 3. Chỉ xem giao diện, không cần key (chế độ demo)

Không cần Docker, không cần API:

```bash
VITE_DEMO_MODE=true VITE_DEMO_OFFLINE=true pnpm --filter @eco-oil/miniapp dev     # :5173
NEXT_PUBLIC_DEMO_OFFLINE=1 pnpm --filter @eco-oil/admin dev                        # :3001
```

Giới hạn của chế độ demo: admin **ẩn** ô tìm địa chỉ (không có backend để gọi); bản đồ chỉ hiện khi
đặt thêm `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` và trạm đã có toạ độ; thẻ trạm ở mini app không có
nhãn "đường ô tô"/"đường chim bay" vì dữ liệu demo không có trường này.

---

## 4. Đưa lên online sau này (vẫn tách khỏi `ui_version_3`)

Chỉ làm khi cần cho người khác thử, và **không** sửa service/project đang chạy:

| Thành phần | Cách làm |
|---|---|
| API | Render → New → Web Service mới (ví dụ `eco-oil-api-v4`), nhánh `ui_version_4`, cùng Build/Start Command như `DEPLOY.md`. Biến môi trường riêng |
| Cơ sở dữ liệu | Neon → tạo **branch** riêng cho v4 (không dùng chuỗi kết nối production) |
| Redis | Redis riêng cho v4 (ví dụ Render Key Value gói Free). Code v4 chỉ dùng khoá tiền tố `maps:`, nhưng tách riêng vẫn an toàn hơn |
| Admin, Mini App | Vercel → Settings → Environment Variables → loại **Preview**, chọn nhánh `ui_version_4`: đặt `NEXT_PUBLIC_API_BASE_URL`/`VITE_API_BASE_URL` trỏ API v4 và `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`. Không đụng biến loại Production |
| Key giao diện | Thêm tên miền Preview của admin v4 vào danh sách Websites ở mục 1.3 |

---

## 5. Các điểm ghi nhận (chưa sửa) — giải thích

Cả bốn điểm chỉ nằm trong code `ui_version_4`, **không** ảnh hưởng bản `ui_version_3` đang chạy.

| Điểm | Nghĩa là gì | Mức độ | Đề xuất |
|---|---|---|---|
| Bộ đếm chi phí chỉ nằm trong Redis | Nếu ai đó xoá khoá `maps:*` trong Redis (hoặc Redis đầy bộ nhớ và tự xoá khoá), bộ đếm tháng về 0, app có thể gọi thêm tối đa 8.000 lượt nữa | Thấp, khi đã đặt hạn mức ở 1.4 | Đặt hạn mức theo ngày (1.4) — đó là chốt chặn thứ hai không phụ thuộc Redis |
| `google.maps.Marker` bị đánh dấu "deprecated" | Google khuyên dùng loại ghim mới (`AdvancedMarkerElement`); loại cũ vẫn chạy, Google cam kết báo trước ít nhất 12 tháng trước khi ngừng | Thấp | Đổi sang loại mới khi cần; loại mới cần tạo thêm "Map ID" trên Google Cloud |
| Hỏi trạm với 0 lít trả về toàn bộ trạm | Lúc Bắt đầu ca app lưu mọi trạm đang nhận; hiện có 2 trạm nên không sao, nhiều trạm thì dữ liệu tải về lớn dần | Thấp | Khi số trạm > 50, giới hạn theo bán kính hoặc số lượng |
| Giới hạn tần suất đếm trong bộ nhớ | Render chạy 1 bản API nên đếm đúng; nếu sau này chạy 2 bản trở lên, mỗi bản đếm riêng (giới hạn thực tế nhân lên) | Thấp | Khi tăng số bản API, chuyển bộ đếm sang Redis |

---

## 6. Câu chữ mới cần chủ dự án duyệt

- Admin: "Tìm vị trí theo địa chỉ", "Gõ địa chỉ trạm, ví dụ 22 Hàng Bạc", "Kéo ghim trên bản đồ để
  chỉnh vị trí.", "Chưa tìm được địa chỉ lúc này. Hãy nhập vĩ độ, kinh độ bằng tay."
- Mini App: "Đang dùng danh sách trạm đã lưu" — "Chưa kết nối được máy chủ. Khoảng cách đường chim
  bay, sức chứa lúc …"; nhãn "… · đường ô tô", "… · đường chim bay".
- Lỗi vượt giới hạn: "Gọi quá nhiều lần trong một phút. Vui lòng thử lại sau."
