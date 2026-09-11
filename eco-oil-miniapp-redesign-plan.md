# Kế hoạch redesign UI apps/miniapp (Eco-Oil UCO Platform)

Tài liệu này tổng hợp toàn bộ quyết định đã thống nhất về cách phối hợp ba lớp công cụ khi
redesign UI của `apps/miniapp` theo hướng minimal: **ECC** (harness/quy trình kỹ thuật),
**eco-oil-miniapp-minimal-redesign** (playbook nội dung/rào chắn nghiệp vụ), và
**ui-ux-pro-max** (tra cứu UX/accessibility hẹp, chỉ dùng thủ công).

Đưa file này cho Claude Code đọc trong repo
`microsoft-is-so-trash/test-app-ptit-young-e-commerce` trước khi bắt đầu bất kỳ task
redesign nào.

---

## 0.5. Palette màu tham khảo do người dùng cung cấp (DESIGN.md — "Fidelity Modern")

File `DESIGN.md` người dùng đính kèm chứa một design system tên **"Fidelity Modern"**,
định vị cho sản phẩm quản lý tài sản cao cấp (heritage asset management), phong cách
"Editorial Modernism". Nguyên văn palette và token liên quan:

```yaml
colors:
  surface: '#f9faf0'
  surface-dim: '#dadbd1'
  surface-bright: '#f8fbea'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4ea'
  surface-container: '#eeefe5'
  surface-container-high: '#e8e9df'
  surface-container-highest: '#e2e3d9'
  on-surface: '#1a1c17'
  on-surface-variant: '#44483c'
  inverse-surface: '#2e3227'
  inverse-on-surface: '#eff2e1'
  outline: '#75796b'
  outline-variant: '#c5c8b8'
  surface-tint: '#4d6626'
  primary: '#2b4204'
  on-primary: '#ffffff'
  primary-container: '#587331'
  on-primary-container: '#d7f7a6'
  inverse-primary: '#b2d184'
  secondary: '#4c670f'
  on-secondary: '#ffffff'
  secondary-container: '#caec86'
  on-secondary-container: '#506b14'
  tertiary: '#3a3f1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#696e45'
  on-tertiary-container: '#ecf1bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#f8fbea'
  on-background: '#191d13'
  surface-variant: '#e1e4d3'
typography:
  display-lg: { fontFamily: Anton, fontSize: 56px, fontWeight: '400' }
  headline-md: { fontFamily: Anton, fontSize: 24px, fontWeight: '400' }
  body-md: { fontFamily: Bodoni Moda, fontSize: 16px, fontWeight: '400' }
  label-lg: { fontFamily: Arimo, fontSize: 14px, fontWeight: '600' }
rounded:
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  full: 9999px
```

Tóm tắt màu chủ đạo theo mô tả gốc trong file:

| Vai trò | Hex | Ghi chú gốc |
|---|---|---|
| Primary | `#2b4204` (nền tối) / `#415a1b` (dùng ở component) / `#587331` (container fill) | Olive đậm, cho CTA chính, border focus, brand mark |
| Secondary | `#4c670f` | Moss tone, hành động phụ, badge thông tin |
| Tertiary | `#3a3f1a` / `#696e45` (container) | Khaki muted, metadata phụ |
| Error | `#ba1a1a` / container `#ffdad6` | Chuẩn Material error |
| Surface (nền) | dải be/parchment từ `#f9faf0` đến `#e2e3d9` (~9 tầng) | Thay cho xám lạnh, tông ấm |
| Text chính | `#1a1c17` (on-surface) | Than-xanh đậm, tương phản cao |
| Font | Anton (display/headline), Bodoni Moda (body), Arimo (label/data) | — |

### ⚠️ Đánh giá bắt buộc trước khi dùng cho apps/miniapp — KHÔNG copy thẳng

Palette này được thiết kế cho một sản phẩm quản lý tài sản cao cấp trên desktop/web
thông thường, **không phải** cho công cụ vận hành thực địa ngoài trời của Collector. Có
xung đột trực tiếp với định nghĩa "minimal" đã chốt ở mục 3 của playbook
`eco-oil-miniapp-minimal-redesign`:

- Playbook yêu cầu **2-3 màu chính + 1 màu cảnh báo, dứt khoát** — palette này có tới
  **9 tầng surface be/xám** gần giống nhau (`#f9faf0` → `#e2e3d9`), đúng kiểu "nhạt nhoà
  nhiều sắc độ" mà playbook đã cảnh báo tránh.
- Font display **Anton** (condensed, chỉ dùng cho tiêu đề ngắn) và **Bodoni Moda** (serif
  tương phản cao, dùng cho văn bản dài) không phải lựa chọn tối ưu cho UI thao tác nhanh,
  đọc nhanh ngoài trời của Collector — hai font này phù hợp hơn cho trải nghiệm biên tập/
  đọc chậm.
- Chưa xác minh độ tương phản của từng cặp màu (ví dụ `on-secondary-container` `#506b14`
  trên nền `secondary-container` `#caec86`) đạt chuẩn 4.5:1 cho điều kiện ánh sáng ngoài
  trời — playbook yêu cầu kiểm tra thực tế, không suy đoán từ tên biến.

**Cách dùng đúng đắn:** nếu người dùng muốn giữ tinh thần "olive/organic" của palette này
cho `apps/miniapp`, hãy coi đây là **nguồn cảm hứng thô**, rồi rút gọn còn đúng 2-3 màu
chính theo playbook trước khi áp dụng:

- Primary hành động chính (đề xuất rút gọn): chọn 1 trong `#2b4204` / `#415a1b` /
  `#587331` — không dùng cả ba cấp độ cùng lúc trên một màn hình Collector.
- Secondary/trạng thái thành công: `#4c670f` hoặc container `#caec86` — cần đo lại
  contrast thực tế trước khi dùng làm nền chữ.
- Cảnh báo/lỗi: `#ba1a1a` trên nền `#ffdad6`, hoặc dùng thẳng `#ba1a1a` trên nền trắng
  nếu cần tương phản cao hơn ngoài trời.
- Nền: chỉ chọn **1** tông surface duy nhất (ví dụ `#ffffff` hoặc `#f9faf0`) làm nền
  chính cho màn hình Collector, không dùng cả thang 9 tầng.
- Font: cân nhắc thay Anton/Bodoni Moda bằng một sans-serif đơn giản, dễ đọc ở khoảng
  cách xa và trong điều kiện ánh sáng mạnh (ví dụ giữ Arimo cho toàn bộ UI Collector,
  bỏ Anton/Bodoni Moda) — quyết định này phải được đề xuất thành 1 trong 2-3 hướng ở
  bước 5 của quy trình (mục 4), không tự động áp dụng.

Đây là input để tham khảo màu sắc/không khí thương hiệu, **không phải chỉ định kỹ thuật
cuối cùng** cho màn hình Collector. Với màn hình Merchant (dùng trong nhà, ít áp lực ánh
sáng ngoài trời hơn), palette gốc có thể phù hợp hơn nhưng vẫn nên rút gọn số tầng màu.

---

## 0. Bối cảnh đã xác nhận từ source code thật

Đọc trực tiếp `apps/miniapp/package.json` (không đoán):

- Stack: **React 19 + TypeScript + Vite 7**, state qua **Zustand**, data-fetching qua
  **TanStack Query**, offline storage qua **Dexie (IndexedDB)**, SDK Zalo Mini App chính
  hãng là **zmp-sdk**, quét mã qua **jsqr**.
- **Không có** Tailwind hay UI component library nào trong dependencies — cần đọc thêm
  file component thật trong `src/` để xác nhận cách styling hiện tại trước khi đề xuất
  bảng màu/token (đừng giả định CSS Modules hay styled-components).
- Có bộ test rõ ràng bảo vệ phần offline-sync: `outbox.test.ts`,
  `outbox-persistence.test.ts`, `container-code.test.ts`, `station-delivery.test.ts`,
  `collector-flow.test.ts`, `oil-grade-selector.test.ts`, `grade-photo-picker.test.ts`,
  `oil-image-analyzer.test.ts`, `login-screen.test.ts`, `api-base-url.test.ts`,
  `oauth-callback.test.ts`, `auth-store.test.ts`, `collector-invite.test.ts`,
  `production-web-login.test.tsx`, `zalo-client.test.ts`.
- Script sẵn có: `npm run dev`, `npm run build`, `npm run build:zmp`, `npm run lint`,
  `npm run typecheck`, `npm test`.

**Hệ quả cho UI:** bất kỳ màn hình Collector nào hiển thị trạng thái đồng bộ (outbox) đều
đang được test bảo vệ. Sửa UI ảnh hưởng tới props/cấu trúc các component liên quan tới
outbox, container-code, station-delivery, collector-flow phải chạy lại test tương ứng,
không chỉ chạy toàn bộ `npm test` rồi báo pass/fail chung chung.

---

## 1. Phân vai ba lớp công cụ

| Lớp | Vai trò | Mức độ cài đặt |
|---|---|---|
| **ECC** | Khung kỷ luật kỹ thuật: plan → TDD → review → verify → remember | Plugin `ecc@ecc`, scope **local** (chỉ repo này), profile **minimal** |
| **eco-oil-miniapp-minimal-redesign** | Nội dung nghiệp vụ: rào chắn file, định nghĩa "minimal" cho app này, quy trình đọc→liệt kê→đề xuất→chọn→code | Skill sẵn có, không cần cài thêm |
| **ui-ux-pro-max** | Tra cứu UX/accessibility/palette hẹp, **chỉ gọi thủ công qua script**, không để auto-activate | Cài **local** trong repo này (không `--global`), chỉ dùng qua `search.py --domain ux` |

Nguyên tắc: ECC quyết định quy trình, playbook quyết định nội dung, ui-ux-pro-max chỉ trả
lời khi được hỏi trực tiếp qua lệnh, không bao giờ được để nó tự chọn phong cách hay tự
kích hoạt khi gõ prompt tự nhiên.

---

## 2. Cài đặt ECC — mức độ hợp lý

**Không cài `--profile core` hay `full`.** Lý do: 291 skill + 68 agent sẽ nạp catalog lớn
vào context ở mọi phiên, ngược với tinh thần "giữ context gọn" của yêu cầu minimal, và có
rủi ro agent sai domain (ML/data/ops) tự kích hoạt không liên quan tới redesign UI.

### Bước cài đặt

```bash
# 1. Dry-run trước để xem trước khi ghi gì vào máy
npx ecc-universal@2.2.1 install --guided --harness claude \
  --claude-scope local --profile minimal --dry-run

# 2. Nếu output hợp lý, cài thật
npx ecc-universal@2.2.1 install --guided --harness claude \
  --claude-scope local --profile minimal --yes
```

Scope **local** (không phải **user**/global) — chỉ áp dụng cho repo này, tránh lặp lại sự
cố đã xảy ra với ui-ux-pro-max khi lỡ cài global.

### Rule pack — đã xác nhận đúng theo package.json thật

```bash
git clone --depth 1 https://github.com/affaan-m/ECC.git /tmp/ecc-src
cd /đường-dẫn/test-app-ptit-young-e-commerce
mkdir -p .claude/rules/ecc
cp -R /tmp/ecc-src/rules/common .claude/rules/ecc/
cp -R /tmp/ecc-src/rules/typescript .claude/rules/ecc/
cp -R /tmp/ecc-src/rules/react .claude/rules/ecc/
```

Chỉ 3 pack: `common` + `typescript` + `react` — đúng stack thật, không thêm `web`/`vue`/
`angular`/`nuxt` (sai stack, chỉ gây nhiễu context).

### Kiểm tra không bị cài kép

```bash
node scripts/ecc.js doctor --target claude
```

hoặc dùng `/plugin` trong Claude Code để soi danh sách plugin đã cài.

### Không cài ở giai đoạn này (không cần thiết cho task UI)

- Memory Vault runtime (`ecc memory init`) — chỉ cần khi làm việc xuyên nhiều harness.
- AgentShield như tool riêng — dùng sau nếu cần `/security-scan`, không bắt buộc lúc cài.
- Itô compute CLI / GPU bridge — không liên quan.

---

## 3. Cài đặt ui-ux-pro-max — sửa lại sau khi lỡ cài global

```bash
# Xác nhận đang cài global ở đâu
ls -la ~/.claude/skills/ | grep ui-ux-pro-max

# Gỡ bản global
uipro uninstall --global
# Nếu lỗi phiên bản cũ:
npm install -g ui-ux-pro-max-cli@latest
uipro uninstall --global
# Nếu vẫn không được, xoá tay:
rm -rf ~/.claude/skills/ui-ux-pro-max

# Cài lại chỉ local trong đúng repo này
cd /đường-dẫn/test-app-ptit-young-e-commerce
uipro init --ai claude

# Kiểm tra lại phạm vi
ls ~/.claude/skills/          # phải KHÔNG còn ui-ux-pro-max ở đây
ls .claude/skills/            # phải CÓ ui-ux-pro-max ở đây, trong repo
```

**Cách dùng an toàn** — luôn gọi trực tiếp script, không gõ yêu cầu tự nhiên khiến nó
auto-activate và generate cả bảng màu/pattern landing page không phù hợp:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "accessible focus states outdoor high contrast" --domain ux --json

python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "chip badge overflow nowrap" --domain ux --json

python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "resilient text reflow clipping" --domain ux --json

python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "responsive layout" --stack react
```

**Không bao giờ dùng:** `--design-system`, `--domain style`, `--domain typography`,
`--domain chart` — đây là phần tạo bảng màu/pattern landing page, không phù hợp cho công
cụ vận hành thực địa dùng ngoài trời.

---

## 4. Quy trình redesign một màn hình — thứ tự prompt chính xác

### Bước 1 — Xác nhận stack thật (đã làm ở mục 0, nhắc lại nếu Claude Code chưa đọc)

Đọc `apps/miniapp/package.json` và 2-3 file component thật của màn hình sắp sửa trước khi
đề xuất bất kỳ thay đổi nào. Không giả định thư viện UI.

### Bước 2 — Lập kế hoạch qua ECC, kèm toàn bộ rào chắn

```
/ecc:plan "Redesign màn hình {tên màn hình} trong apps/miniapp theo hướng minimal
cho vai trò {Merchant/Collector}, chỉ sửa file trong apps/miniapp"
```

Dán kèm vào yêu cầu:

```
<phạm_vi>
Chỉ sửa file trong apps/miniapp. Không sửa apps/api, apps/admin, prisma/schema.prisma,
migration files, docker-compose.yml, hay bất kỳ file .env/deploy config nào — dự án
đang có bản demo chạy thật trên Render/Vercel/Neon với quy trình deploy dễ vỡ. Nếu muốn
refactor một component dùng chung có ảnh hưởng ngoài phạm vi màn hình được giao, hỏi
trước thay vì tự làm.
</phạm_vi>

<màn_hình>
Tên màn hình: {tên màn hình cụ thể}
Vai trò sử dụng: {Merchant hoặc Collector}
Mô tả/UI hiện tại: {mô tả hoặc đường dẫn screenshot}
</màn_hình>

<ràng_buộc>
{ví dụ Collector: dùng ngoài trời, mạng chập chờn, thao tác 1 tay, trạng thái đồng bộ
outbox phải luôn nổi bật, không được ẩn/mờ. Component liên quan tới outbox/
container-code/station-delivery/collector-flow đã có test bảo vệ, đổi cấu trúc phải
báo trước.}
</ràng_buộc>

<định_nghĩa_minimal>
- Giảm số thao tác/nút bấm trên mỗi màn hình xuống mức tối thiểu cho đúng 1 tác vụ chính.
- Bảng màu giới hạn, dứt khoát (2-3 màu chính + 1 màu cảnh báo/trạng thái).
- Độ tương phản đủ dùng ngoài trời cho màn hình Collector.
- Bỏ animation/hiệu ứng trang trí không phục vụ mục đích (giữ loading indicator).
- Giữ vùng chạm lớn cho nút thao tác chính của Collector (thao tác 1 tay).
- Trạng thái đồng bộ (đã gửi server / đang chờ mạng) phải nổi bật, không được tối giản
  đến mức biến mất.
</định_nghĩa_minimal>
```

### Bước 3 — Xác nhận/sửa plan ECC đưa ra

Kiểm tra plan có tự ý đề xuất đụng `apps/api`, `prisma/`, hay file deploy không. Nếu có,
sửa thủ công trong plan trước khi confirm.

### Bước 4 — Liệt kê vấn đề trước, chưa vội sửa (bắt buộc theo playbook)

```
Trước khi implement, đọc source thật trong apps/miniapp liên quan màn hình này.
Liệt kê MỌI điểm chưa tối giản, kèm mức độ tự tin — chưa vội sửa.

Với MỖI điểm, bắt buộc kèm thêm 2 thông tin sau (rút kinh nghiệm phiên 2026-09-11):

1. Bán kính ảnh hưởng (blast radius): class/selector/component đó có dùng chung với
   màn hình nào NGOÀI phạm vi được giao không? Liệt kê rõ file:dòng của mọi nơi dùng
   chung. Nếu có dùng chung → ghi rõ cách cô lập dự kiến (thêm class scope riêng,
   override qua ancestor selector, v.v.) thay vì sửa rule gốc.
2. Sửa được bằng CSS/markup thuần, hay bắt buộc phải đổi tính năng/tương tác/state?
   Phân loại rõ vào 1 trong 2 nhóm A/B ở bước 5.
```

**Lý do bắt buộc mục 1:** phiên đầu tiên phát hiện quá muộn (giữa lúc implement) rằng
nhiều class trong `CollectorFlow.tsx` dùng chung giữa màn Route (được duyệt) và màn
QR/Entry/StationDelivery (chưa duyệt), buộc phải đổi chiến lược giữa chừng.

**Đầu vào trực quan:** nếu có thể, đính kèm screenshot màn hình thật hoặc dựng preview
cô lập trước khi làm bước 4 — audit thuần bằng đọc code sẽ bỏ sót vấn đề thị giác
(khoảng cách, thứ bậc, mật độ) mà đọc CSS không thấy được.

### Bước 5 — Đề xuất 2-3 hướng minimal, chờ chọn

```
Đề xuất 2-3 hướng thiết kế minimal khác nhau, mỗi hướng gồm: bảng màu (hex, tự đề xuất
theo yêu cầu 2-3 màu dứt khoát + 1 màu cảnh báo — KHÔNG lấy từ palette có sẵn của
ui-ux-pro-max), font, mức độ giảm thao tác/nút bấm, 1 câu lý do phù hợp với vai trò
{vai trò}. Hỏi mình chọn hướng nào rồi mới implement đúng hướng đó.

Với MỖI hướng, bắt buộc tách đôi phần việc (rút kinh nghiệm phiên 2026-09-11):

  NHÓM A — thuần trình bày: đổi được chỉ bằng CSS/markup, KHÔNG đụng tính năng,
  logic, props, state, hay data đã seed. Mặc định luôn nằm trong phạm vi.

  NHÓM B — cần đổi tương tác/tính năng: gộp nút, ẩn bớt khối vào nút mở rộng, thêm
  state đóng/mở, bỏ bớt hành động... Mỗi mục nhóm B phải ghi rõ "cần thêm state X"
  hoặc "bỏ khả năng Y" và CHỜ DUYỆT RIÊNG, không được im lặng bỏ qua lúc implement.

Kết thúc bước 5 phải nêu rõ MODEL đề xuất cho bước 6 (xem mục 5) kèm lý do, và chờ
xác nhận model trước khi bắt tay implement chính thức.
```

**Vì sao phải tách nhóm A/B:** phiên đầu tiên đề xuất hướng có kèm "gộp nút Gọi quán +
Sao chép số" và "gộp 2 khối AI vào 1 nút Xem chi tiết" (đều là nhóm B), nhưng người dùng
sau đó chốt ràng buộc "giữ nguyên mọi tính năng" — hai mục này bị lặng lẽ bỏ lúc
implement, khiến kết quả giao được chỉ đạt phần màu sắc/tương phản/vùng chạm, thiếu hẳn
trụ cột "giảm số thao tác" của định nghĩa minimal. Tách nhóm từ đầu buộc mâu thuẫn này
phải lộ ra và được quyết ngay ở bước 5.

**Nếu người dùng muốn giữ tinh thần palette "Fidelity Modern" (mục 0.5):** đưa nó vào
làm 1 trong 2-3 hướng đề xuất ở bước này (không phải áp thẳng), đã rút gọn còn đúng
2-3 màu chính + 1 màu cảnh báo theo hướng dẫn ở mục 0.5, và nêu rõ đã bỏ những tầng màu/
font nào so với bản gốc để giữ đúng tinh thần minimal.

**Chốt model trước khi implement (bắt buộc, theo mục 5):**

| Tình huống của bước 6 | Model đề xuất | Lý do |
|---|---|---|
| Màn hình ĐẦU TIÊN áp một hướng mới (chưa có tiền lệ trong repo) | Opus, effort cao | Phải tự quyết cách cô lập scope, đọc nhiều file cùng lúc, đánh đổi nhiều ràng buộc |
| Áp hướng ĐÃ CHỐT sang màn hình tiếp theo (đã có tiền lệ để nhân bản) | Sonnet, effort thấp/trung | Rẻ, nhanh, đủ cho việc nhân bản một style đã rõ ràng |
| Màn hình có test bảo vệ chặt (container-code, oil-grade-selector, grade-photo-picker) | Opus, effort cao | Rủi ro chạm vào logic được test cao hơn, cần cẩn trọng hơn |

Nếu chọn Sonnet: nói rõ phạm vi theo nghĩa đen ("áp hướng này cho TẤT CẢ màn hình
Collector còn lại, không chỉ màn vừa làm") vì Sonnet bám nghĩa đen chỉ dẫn.

Không để ECC tự động chạy tiếp `tdd-workflow` khi chưa chốt hướng VÀ chưa chốt model.

### Bước 6 — Sau khi chọn hướng VÀ chốt model, implement

Chọn đúng 1 trong 2 làn dưới đây theo phân loại A/B đã chốt ở bước 5. Đừng mặc định
chạy `tdd-workflow` cho mọi thay đổi — với thay đổi thuần trình bày thì không có hành vi
mới nào để viết test trước, ép TDD chỉ tạo test giả tạo.

**Làn A — thay đổi thuần trình bày (CSS/markup):** không viết test mới. Thay vào đó
bắt buộc đủ 5 cổng kiểm tra:

```bash
npm run typecheck        # trong apps/miniapp
npm run lint
node --import tsx --test test/<các test liên quan màn hình này>.ts
npm test                 # full suite
npm run build
```

Cộng thêm **kiểm tra trực quan** (xem mục 4.1 bên dưới) — thay đổi giao diện mà chưa
nhìn thấy kết quả thì chưa được coi là xong.

**Làn B — có đổi tương tác/tính năng (đã được duyệt riêng ở bước 5):** chạy đúng
`tdd-workflow` — viết test cho hành vi mới trước (RED), rồi mới implement (GREEN).
Lưu ý: dự án hiện KHÔNG có hạ tầng test render component (chỉ test hàm thuần bằng
`node:test`), nên trước khi vào làn B phải quyết: thêm hạ tầng test render, hay tách
logic mới thành hàm thuần để test được. Đây là quyết định cần hỏi, không tự làm.

**Cổng kiểm tra diff (bắt buộc cho cả 2 làn, rút kinh nghiệm phiên 2026-09-11):**

```bash
git diff --stat HEAD
```

Đối chiếu số dòng thay đổi với kỳ vọng. Nếu lệch bất thường (phiên đầu tiên: sửa 2 chỗ
nhưng diff báo 378 dòng) thì DỪNG LẠI điều tra trước khi đi tiếp — nguyên nhân lần đó là
công cụ ghi file tự chuẩn hoá toàn bộ CRLF→LF của một file có line-ending lẫn lộn. Cách
khắc phục: lấy lại nội dung gốc bằng `git show HEAD:<file>` rồi áp lại đúng phần sửa
thật bằng script giữ nguyên byte (`open(..., newline='')`), không ghi đè qua công cụ sửa
file thông thường.

Chỉ implement đúng hướng đã chọn, đúng phạm vi màn hình đó.

### Bước 7 — Review từ fresh context

```
/code-review
```

### Bước 8 — Chạy test có mục tiêu, không chỉ pass/fail chung chung

```
npm run typecheck && npm test
```

Nếu đổi cấu trúc file/props có thể ảnh hưởng `outbox.test.ts`, `collector-flow.test.ts`,
`station-delivery.test.ts`, hoặc các test khác liên quan tới màn hình đang sửa, báo cáo cụ
thể test nào có khả năng bị ảnh hưởng **trước khi sửa**, không chỉ chạy xong rồi báo kết
quả.

### Bước 9 — Checklist accessibility bổ sung (thủ công, từ ui-ux-pro-max)

Chạy lại các lệnh `search.py --domain ux` ở mục 3 để lấy checklist tham khảo: contrast
4.5:1, focus state rõ khi bàn phím điều hướng, chip/badge không cắt chữ, tôn trọng
`prefers-reduced-motion`, không dùng emoji làm icon, cursor-pointer trên phần tử click
được. Lọc bỏ mục nào không liên quan tới khung Zalo Mini App (ví dụ breakpoint desktop
1440px nếu miniapp chỉ chạy trong khung điện thoại).

### Bước 10 — Lưu phiên

```
/save-session
```

Để lần sau `/resume-session` tiếp tục đúng ngữ cảnh, không phải lặp lại toàn bộ rào chắn
từ đầu.

---

## 4.1. Kiểm tra trực quan — điểm yếu lớn nhất của quy trình hiện tại

Phiên 2026-09-11 hoàn tất redesign một màn hình mà **chưa từng nhìn thấy kết quả**:
typecheck/lint/test/build đều sạch nhưng không cổng nào trong số đó phát hiện được lỗi
thị giác (màu sai sắc độ, khoảng cách vỡ, chữ tràn, thứ bậc sai). Lý do: vào được màn
Collector cần đăng nhập Zalo thật, mà backend là bản demo **production** trên Render —
không có tài khoản Collector mẫu và không nên bypass auth ở đó.

Phải giải quyết việc này trước khi làm màn hình tiếp theo. Ba lựa chọn, theo thứ tự ưu tiên:

1. **Tài khoản Collector demo** (tốt nhất nếu có): người dùng cung cấp tài khoản thử,
   chạy `npm run dev` rồi xem trực tiếp màn hình thật với dữ liệu thật.
2. **Preview harness cô lập** (không cần backend): tạo 1 file tạm ngoài repo hoặc trong
   thư mục scratchpad, render thẳng component màn hình với props giả, mở bằng dev server.
   Không thêm file nào vào source chính, xoá sau khi xem xong.
3. **Chế độ mock sẵn có**: `VITE_DEMO_MODE=true` + `VITE_DEVICE_CLIENT_MODE=mock`
   (xem `src/lib/zalo-client.ts`) — chỉ mock lớp thiết bị Zalo, vẫn cần backend chấp nhận
   `mock-access-token`, nên cần xác minh có dùng được với API demo hay không.

Bổ sung cho bước 9: ngoài `--domain ux`, dùng thêm `-n 10` để lấy nhiều mục checklist hơn
(mặc định chỉ trả 3), và `--stack react` cho các câu hỏi về layout/responsive.

---

## 5. Chọn model theo giai đoạn

| Giai đoạn | Model đề xuất | Vì sao |
|---|---|---|
| Audit toàn bộ `apps/miniapp` một lần (đọc hết source, liệt kê toàn bộ điểm chưa minimal) | Opus, effort cao | Cửa sổ ngữ cảnh lớn, đọc nhiều file cùng lúc mà vẫn nhất quán; vision mạnh nếu đính kèm screenshot |
| Lặp nhanh từng màn hình sau khi đã chốt hướng thiết kế | Sonnet, effort thấp/trung | Rẻ, nhanh, đủ dùng cho việc áp 1 style đã rõ ràng vào từng component |
| Review lại UI sau khi sửa, trước khi merge | Model nào cũng được, dùng pattern "báo hết, lọc sau" | Tránh bỏ sót lỗi nhỏ vì model tự đánh giá "không đủ nghiêm trọng" |

Lưu ý riêng cho Sonnet: nó bám nghĩa đen chỉ dẫn — muốn style áp dụng cho *toàn bộ* các
màn hình Collector chứ không chỉ màn hình đầu tiên, phải nói rõ ("áp dụng hướng này cho
mọi màn hình Collector, không chỉ màn hình vừa làm").

---

## 6. Rào chắn an toàn bổ sung do ECC có quyền hook + shell rộng

Trước khi để ECC thao tác trong repo có demo chạy thật (Render/Vercel/Neon), cân nhắc
chạy quét cấu hình một lần:

```bash
agentshield scan --path .
```

(chỉ cần nếu đã cài AgentShield riêng — không bắt buộc ở giai đoạn cài minimal).

---

## 7. Việc cần làm ngay (checklist tổng hợp)

1. Chạy dry-run + cài ECC scope local, profile minimal (mục 2).
2. Copy 3 rule pack `common` + `typescript` + `react` vào `.claude/rules/ecc/` (mục 2).
3. Gỡ ui-ux-pro-max khỏi `~/.claude/skills/` (global) và cài lại local trong repo (mục 3).
4. Xác nhận không cài kép bằng `node scripts/ecc.js doctor --target claude` và `/plugin`.
5. Trước khi đề xuất hướng minimal cho bất kỳ màn hình nào, đọc kỹ mục 0.5 để biết cách
   rút gọn palette "Fidelity Modern" đúng tinh thần minimal, không copy thẳng.
6. Với mỗi màn hình cần redesign, chạy đúng thứ tự 10 bước ở mục 4.
