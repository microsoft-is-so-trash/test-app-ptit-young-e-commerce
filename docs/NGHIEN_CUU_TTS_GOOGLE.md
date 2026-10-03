# Nghiên cứu: Đọc giọng nói (TTS) bằng Google API cho Merchant và Collector

Ngày nghiên cứu: 03/10/2026. Bổ sung cho mục 7 của `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md`
và giai đoạn I2 của `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`.

**Trạng thái:** tài liệu nghiên cứu, chưa được chủ dự án duyệt. Các lựa chọn cần chủ dự án quyết
định nằm ở mục 9 và đã được ghi vào `docs/TIEN_DO_UI_V4.md` (nhóm câu hỏi T).

**Độ tin cậy của số liệu:**

- ✅ = đọc trực tiếp trên trang tài liệu gốc của Google (docs.cloud.google.com, ai.google.dev) ngày
  03/10/2026.
- ⚠️ = lấy từ nguồn thứ cấp (blog so sánh giá) vì trang bảng giá gốc
  `cloud.google.com/text-to-speech/pricing` không đọc được đầy đủ. Phải đối chiếu lại trên trang
  giá hoặc Google Cloud console trước khi chốt ngân sách.

---

## 1. Kết luận nhanh

1. **Google có 2 đường để làm TTS tiếng Việt:**
   - **Cloud Text-to-Speech API** (dịch vụ Google Cloud): giọng Standard, WaveNet, Neural2,
     **Chirp 3: HD**, và Gemini-TTS. Trả về **MP3 trực tiếp**, có hạn mức và bảng giá rõ ràng.
   - **Gemini API** (AI Studio, `gemini-3.8-flash-tts`): giọng biểu cảm hơn, điều khiển giọng bằng
     câu mô tả, nhưng trả về **WAV/PCM thô**, tính tiền theo token, vòng đời model ngắn.
2. **Đề xuất:** dùng **Cloud Text-to-Speech, giọng Chirp 3: HD `vi-VN`** làm nhà cung cấp Google.
   Lý do: GA cho tiếng Việt ✅, trả MP3 nên không phải chuyển đổi ở backend ✅, có hạn mức theo phút
   rõ ràng ✅, có mức miễn phí 1 triệu ký tự/tháng ⚠️, ổn định hơn Gemini API (xem mục 8.1 tài liệu
   nghiên cứu chính).
3. **Chi phí thực tế gần như bằng 0** nếu thiết kế câu đọc đúng cách (mẫu câu cố định + lưu theo
   hash). Ước tính ở mục 5: dưới 1 triệu ký tự/tháng, tức nằm trong mức miễn phí.
4. **Collector là nơi có giá trị cao nhất** (đang đi xe, tay bận). Âm thanh phải được tạo sẵn lúc
   "Bắt đầu ca" để chạy được khi mất sóng. **Merchant** chỉ cần nút "Nghe" trên thông báo, tạo
   khi bấm.
5. **Phát qua backend của mình, không phát link của nhà cung cấp:** miniapp tải âm thanh từ API
   của dự án (đã được khai báo trong Zalo Mini App) rồi phát bằng `blob:` URL. Như vậy không cần
   khai báo thêm tên miền âm thanh trong cấu hình Zalo Mini App, gỡ được một rủi ro ở mục 7.6 tài
   liệu nghiên cứu chính.

---

## 2. Các lựa chọn của Google

### 2.1. Cloud Text-to-Speech API

Endpoint REST: `POST https://texttospeech.googleapis.com/v1/text:synthesize`.

| Loại giọng | Tiếng Việt | Giá / 1 triệu ký tự ⚠️ | Miễn phí / tháng ⚠️ | Hạn mức ✅ |
|---|---|---|---|---|
| Standard | Có | 4 USD | 4 triệu ký tự | 1.000 request/phút |
| WaveNet | Có | 4 USD | 1 triệu ký tự | 1.000 request/phút |
| Neural2 | Có | 16 USD | 1 triệu ký tự | 1.000 request/phút |
| **Chirp 3: HD** | **GA** ✅ | **30 USD** | **1 triệu ký tự** | **200 request/phút** |
| Studio | Không rõ | 160 USD | 100 nghìn ký tự | 500 request/phút |
| Gemini-TTS (trong Cloud TTS) | GA ✅ | Tính theo token, không có miễn phí | Không | 125–150 request/phút |

Chi tiết đã xác minh trên trang gốc ✅:

- **Giới hạn nội dung:** tối đa **5.000 byte mỗi request**, không xin tăng được. Tiếng Việt có
  dấu dùng 2–3 byte cho mỗi ký tự có dấu, nên một câu 5.000 byte ≈ 2.000 ký tự. Câu của dự án
  chỉ khoảng 30–80 ký tự, không bị ảnh hưởng.
- **Chirp 3: HD:**
  - Chỉnh tốc độ đọc 0,25x–2,0x; chèn ngắt nghỉ bằng thẻ `[pause short]`, `[pause]`,
    `[pause long]`.
  - **Không hỗ trợ tự định nghĩa cách phát âm cho `vi-VN`**. Tên quán viết tắt, tiếng lóng hoặc
    tên tiếng Anh có thể bị đọc sai; phải nghe thử bằng dữ liệu thật ở bước I2.2.
  - Đầu ra MP3, OGG_OPUS, PCM… (MP3 chỉ có ở request thường, không có ở streaming). Dự án dùng
    request thường nên lấy được MP3.
- **Gemini-TTS trong Cloud TTS:** trang Cloud TTS liệt kê `gemini-2.5-flash-tts`,
  `gemini-2.5-pro-tts` (GA) và `gemini-3.1-flash-tts-preview`. Giới hạn: text ≤ 4.000 byte, prompt
  ≤ 4.000 byte, âm thanh ≤ khoảng 655 giây. Lưu ý: tài liệu nghiên cứu chính ghi dòng
  `gemini-2.5-*` của Gemini API tắt ngày 16/10/2026; chưa rõ lịch này có áp dụng cho bản trong
  Cloud TTS không. Vì vậy **không chọn Gemini-TTS trong Cloud TTS** cho tới khi kiểm tra lại.
- **Tính tiền SSML:** mọi ký tự gửi lên đều tính tiền, kể cả thẻ SSML ⚠️. Dự án gửi văn bản
  thường, không dùng SSML.

Ví dụ request (đã lược bớt):

```json
{
  "input": { "text": "Điểm tiếp theo: Quán Bà Ba." },
  "voice": { "languageCode": "vi-VN", "name": "vi-VN-Chirp3-HD-<tên giọng>" },
  "audioConfig": { "audioEncoding": "MP3", "speakingRate": 1.0 }
}
```

Kết quả: `{ "audioContent": "<base64 của file MP3>" }`.

Tên giọng tiếng Việt cụ thể **chưa liệt kê được** (bảng giọng trên trang gốc bị cắt khi đọc). Cách
lấy chắc chắn: gọi `GET https://texttospeech.googleapis.com/v1/voices?languageCode=vi-VN` bằng key
thật ở bước I2.2, rồi nghe thử.

### 2.2. Gemini API (AI Studio)

| Model ✅ | Trạng thái ✅ | Giá ⚠️ (text vào / âm thanh ra, mỗi 1 triệu token) |
|---|---|---|
| `gemini-3.8-flash-tts` | Stable | 0,50 USD / 9 USD (giá tới 31/12/2026) |
| `gemini-3.8-flash-lite-tts` | Stable | Âm thanh ra 6 USD |
| `gemini-3.1-flash-tts-preview` | Preview | 1 USD / 20 USD |

- Âm thanh tính 25 token mỗi giây ⚠️: một câu đọc 4 giây ≈ 100 token ≈ 0,0009 USD.
- Kết quả ✅: request thường trả `audio/wav` (24 kHz, mono, 16-bit PCM); streaming trả PCM thô.
  Muốn lưu MP3 thì backend phải tự chuyển đổi (thêm thư viện hoặc ffmpeg, không có sẵn trên
  Render gói Free). Có thể phát thẳng WAV nhưng file lớn hơn MP3 khoảng 10 lần, tốn bộ nhớ trên
  máy Collector.
- Không có cam kết hoạt động qua AI Studio; hay gặp lỗi 429/503 (mục 8.2 tài liệu nghiên cứu chính).

### 2.3. So sánh cho dự án

| Tiêu chí | Cloud TTS Chirp 3: HD | Gemini 3.8 Flash TTS | Zalo AI TTS |
|---|---|---|---|
| Tiếng Việt | GA ✅ | Có ✅ | 4 giọng Bắc/Nam |
| Định dạng trả về | MP3 base64 | WAV/PCM | Link file do Zalo lưu |
| Cần chuyển đổi ở backend | Không | Có (nếu muốn MP3) | Không, nhưng phải tải file về |
| Hạn mức công bố | 200 request/phút | Theo hạn mức Gemini, hay lỗi 429 | Chưa rõ |
| Miễn phí | 1 triệu ký tự/tháng ⚠️ | Không | Theo gói Zalo AI |
| Vòng đời model | Ổn định | Thay nhanh | Chưa rõ |
| Sửa phát âm tên riêng | Không hỗ trợ cho `vi-VN` | Điều khiển bằng câu mô tả, không chắc chắn | Không |
| Tài khoản | Google Cloud (đã có) | Google Cloud/AI Studio (đã có) | Gói Zalo AI (đã có) |

**Đề xuất thứ tự nhà cung cấp:** Cloud TTS Chirp 3: HD (chính) → Zalo AI (phụ) → `speechSynthesis`
của điện thoại → chỉ hiện chữ. Gemini TTS chỉ đưa vào so sánh ở bước I2.2 nếu chủ dự án muốn.
Lựa chọn cuối cùng vẫn quyết định sau khi nghe thử (bước I2.2).

---

## 3. Cách áp dụng vào dự án

### 3.1. Nguyên tắc thiết kế câu đọc

1. **Chỉ đọc mẫu câu có sẵn.** Backend nhận `template_id` + tham số, không nhận văn bản tự do
   (quy tắc E6). Danh sách mẫu câu đặt ở `packages/shared-types` để backend dùng tạo câu, miniapp
   dùng hiện chữ và làm dự phòng `speechSynthesis` với **cùng một câu**.
2. **Câu Collector phải tạo trước được.** Câu nào phụ thuộc số liệu chỉ có lúc đang chạy tuyến (số
   lít vừa nhập, khoảng cách hiện tại, số giao dịch đang chờ) thì **không đưa số đó vào âm thanh**,
   vì lúc mất sóng không tạo được (quy tắc E5). Số liệu đó đã hiện bằng chữ trên màn hình. Ví dụ
   tài liệu chính "Đã lưu 18 lít. Điểm tiếp theo: Quán Bà Ba, cách 350 mét" được tách thành 2 đoạn
   tạo sẵn: "Đã lưu giao dịch." + "Điểm tiếp theo: Quán Bà Ba."
3. **Không đọc số tiền theo mặc định** (U13). Mẫu câu có số tiền phải có bản không có số tiền.
4. **Luôn có chữ đi kèm** (U13): âm thanh chỉ là bản đọc của chữ đang hiện trên màn hình.

### 3.2. Backend (`apps/api`)

```
apps/api/src/modules/tts/
  tts.module.ts
  tts.controller.ts          POST /api/v1/tts  (JWT; vai trò MERCHANT hoặc COLLECTOR)
  tts.service.ts             tạo câu từ mẫu → hash → cache → chuỗi nhà cung cấp
  tts-rate-limit.ts          giới hạn số lần gọi theo người dùng
  providers/
    tts-provider.ts          interface TtsProvider { synthesize(text, voice, rate): Promise<Mp3> }
    google-cloud-tts.provider.ts
    zalo-ai-tts.provider.ts
```

- **Request:** `{ template_id, params, voice_profile? }`. Kiểm tra `params` bằng schema (zod đã có
  trong `apps/api`). Mẫu câu không tồn tại hoặc tham số sai → 400.
- **Response:** `{ text, audio_base64, mime: "audio/mpeg", cache_hit }`. Trả base64 trong JSON để
  miniapp lưu thẳng vào IndexedDB (Dexie) giống cách đang lưu tuyến.
- **Cache phía server:** khoá = SHA-256 của (câu đã tạo + tên giọng + tốc độ + nhà cung cấp). Câu
  ngắn ≈ 10–30 KB MP3. Nơi lưu: Redis (`RedisService` đã có, nhưng `REDIS_URL` có thể trống) — **cần
  chủ dự án chọn** (câu T3). Render gói Free không có ổ đĩa lâu dài, nên không lưu file trên ổ đĩa
  máy chủ.
- **Giới hạn số lần gọi:** `apps/api` hiện **chưa có** cơ chế rate limit nào. Hai cách: tự viết bằng
  Redis `INCR` theo phút, hoặc thêm thư viện `@nestjs/throttler` — **cần chủ dự án chọn** (câu T4).
- **Gọi Google:** gọi REST bằng `fetch` (Node có sẵn), không cần thêm SDK nếu dùng API key. Timeout
  ngắn, thử lại tối đa 2 lần với 429/503 (E3), lỗi thì sang nhà cung cấp phụ.
- **Xác thực với Google** — **cần chủ dự án chọn** (câu T2):
  - API key: chỉ bật "Cloud Text-to-Speech API". **Không giới hạn được theo IP** vì Render gói Free
    không có IP ra cố định; bù lại bằng hạn mức/ngày trên console và cảnh báo ngân sách.
  - Service account: an toàn hơn, nhưng cần thêm thư viện `google-auth-library` và lưu JSON khoá
    trong biến môi trường.
- **Biến môi trường mới** (chỉ thêm tên vào `.env.example`): `GOOGLE_TTS_API_KEY` (hoặc
  `GOOGLE_APPLICATION_CREDENTIALS_JSON` nếu chọn service account), `GOOGLE_TTS_VOICE`
  (ví dụ `vi-VN-Chirp3-HD-…`), `TTS_PRIMARY_PROVIDER` (`google` | `zalo`), `ZALO_AI_API_KEY`.

### 3.3. Miniapp (`apps/miniapp`)

| File | Vai trò |
|---|---|
| `src/lib/tts-templates.ts` (hoặc import từ `@eco-oil/shared-types`) | Hàm thuần: tạo câu từ mẫu, bỏ số tiền khi tắt "Đọc số tiền" |
| `src/lib/tts-plan.ts` | Hàm thuần: từ tuyến (`CurrentRouteResponse`) tạo danh sách đoạn âm thanh cần tạo sẵn |
| `src/lib/tts-cache.ts` | Lưu/đọc âm thanh trong Dexie (thêm bảng mới ở `outbox-db.ts`, tăng version Dexie) |
| `src/lib/tts-player.ts` | Mở khoá âm thanh khi người dùng chạm, hàng đợi phát, dự phòng `speechSynthesis`, rồi chỉ chữ |
| `src/lib/tts-settings.ts` | Đọc/ghi công tắc qua storage của `zaloClient` (thật, tải lại không mất) |

Hàm thuần có test `node:test` và phải thêm vào script `test` của `apps/miniapp/package.json`.

---

## 4. Đặt tính năng ở đâu

### 4.1. Collector (giá trị cao nhất)

Vị trí tính theo cấu trúc **sau** giai đoạn C (thanh "Ca hôm nay" / "Của tôi").

| # | Thời điểm | Câu đọc (mẫu) | Tạo âm thanh lúc | Điểm gắn trong code |
|---|---|---|---|---|
| C-T1 | Bấm "Bắt đầu ca" | Không đọc. Chỉ **mở khoá âm thanh** (iOS cần thao tác chạm) và tạo sẵn toàn bộ đoạn âm thanh của ca | — | `CollectorFlow.startShift()`, ngay sau `prefetchRouteData(...)` |
| C-T2 | Bắt đầu ca thành công | "Bắt đầu ca. Điểm đầu tiên: {tên quán}." | Bắt đầu ca | Sau `setShiftStarted(true)` |
| C-T3 | Lưu giao dịch xong | "Đã lưu giao dịch." + "Điểm tiếp theo: {tên quán}." | Tĩnh + bắt đầu ca (mỗi điểm 1 đoạn) | `CollectorFlow.onCollectionSaved()` |
| C-T4 | Quét mã can không khớp | "Mã can không khớp. Kiểm tra lại mã trên can." | Tĩnh | `CollectorQrScreen`, khi `mismatch` bật |
| C-T5 | Thu xong điểm cuối | "Đã thu xong tất cả điểm. Mời đi nộp trạm." | Tĩnh | Nơi hiện nút "Đi nộp trạm" trên màn Tuyến (task C4.3) |
| C-T6 | Định kết ca khi còn giao dịch chưa đồng bộ | "Còn giao dịch chưa đồng bộ. Giữ kết nối mạng trước khi kết ca." | Tĩnh | `StationDeliveryFlow`, khối "Còn {n} giao dịch chưa đồng bộ" |

- "Tĩnh" = câu cố định, tạo một lần rồi dùng cho mọi Collector (cache server + tải về lúc bắt đầu ca).
- **Thiết lập:** trong "Của tôi → Cài đặt chung": công tắc "Giọng đọc" (thật, lưu trên máy). Mặc
  định bật hay tắt — **cần chủ dự án chọn** (câu T5).
- **Không thêm nút mới trên màn Tuyến** (U3): giọng đọc là phản hồi của hành động đã có.

### 4.2. Merchant

| # | Vị trí | Hành vi | Tạo âm thanh lúc |
|---|---|---|---|
| M-T1 | Bảng thông báo (`NotificationBell.tsx`), mỗi thông báo một nút "Nghe" (biểu tượng loa + chữ) | Đọc tiêu đề + nội dung của thông báo đó | Khi bấm (Merchant thường có mạng); lưu theo hash trên máy |
| M-T2 | "Của tôi → Cài đặt chung" | Công tắc "Giọng đọc" và "Đọc số tiền" (mặc định tắt) | — |

- Mẫu câu thông báo lấy từ `lib/notifications.ts` (`buildNotifications`). Thông báo có số tiền
  ("Kỳ thanh toán…", "Đã nhận thanh toán…", "Giá dầu cập nhật…") phải có bản đọc không có số tiền.
- Không đặt nút "Nghe" ở Trang chủ hay thẻ can: tránh thêm chỗ bấm (U3), và Merchant không bận tay
  như Collector.
- Nút "Nghe" thuộc loại **Mở rộng** (U1): hiện thêm cùng thông tin dưới dạng âm thanh, không đổi
  dữ liệu.

### 4.3. Thứ tự dự phòng khi phát (E5)

```
Âm thanh đã lưu trên máy (Dexie)
  → (có mạng) POST /api/v1/tts: cache server → nhà cung cấp chính → nhà cung cấp phụ
  → speechSynthesis của điện thoại (nếu có giọng vi-VN)
  → chỉ hiện chữ (luôn có sẵn)
```

Không bước nào ở trên được chặn việc lưu giao dịch, đồng bộ, nộp trạm hay kết ca (E4). Tạo sẵn âm
thanh lỗi chỉ làm bước bắt đầu ca chậm hơn; không được làm bắt đầu ca thất bại.

---

## 5. Ước tính chi phí

Giả định (cần chủ dự án thay bằng số thật): 20 Collector, mỗi tuyến 15 điểm, 26 ca/tháng mỗi
người; 500 quán; câu trung bình 50 ký tự.

| Nguồn ký tự | Không cache | Có cache theo hash (thiết kế đề xuất) |
|---|---|---|
| Collector: câu tĩnh (C-T1, T3 phần 1, T4, T5, T6) | 520 ca × 5 câu × 50 = 130.000 | ≈ 300 ký tự, tạo một lần |
| Collector: "Điểm tiếp theo / đầu tiên: {quán}" | 520 ca × 16 × 40 = 332.800 | Mỗi quán 2 câu: 500 × 80 = 40.000, lặp lại thì dùng cache |
| Merchant: nút "Nghe" | 500 quán × 20 lần × 60 = 600.000 | Câu trùng nhau nhiều (cùng mẫu, cùng ngày); ước tính < 100.000 |
| **Tổng / tháng** | **≈ 1,06 triệu ký tự** | **≈ 0,14 triệu ký tự** |

Quy ra tiền với Chirp 3: HD (30 USD/1 triệu, miễn phí 1 triệu/tháng ⚠️):

- Không cache: (1,06 − 1) × 30 ≈ **1,8 USD/tháng**.
- Có cache: **0 USD** (nằm trong mức miễn phí).
- Tăng gấp 10 lần (200 Collector, 5.000 quán), không cache: ≈ 10,6 triệu ký tự, trừ 1 triệu miễn phí ≈ **288 USD/tháng**;
  có cache: ≈ 1,4 triệu ký tự ≈ **12 USD/tháng**. Cache theo hash là bắt buộc, không phải tuỳ chọn.

So sánh nếu dùng Gemini 3.8 Flash TTS (9 USD/1 triệu token âm thanh, 25 token/giây ⚠️): câu 50 ký
tự đọc khoảng 4 giây ≈ 100 token. 0,14 triệu ký tự ≈ 2.800 câu ≈ 280.000 token ≈ **2,5 USD/tháng**,
không có mức miễn phí.

**Bảo vệ ngân sách (E6):** đặt hạn mức request/ngày cho Cloud Text-to-Speech API trên console, đặt
cảnh báo ngân sách (đề xuất 5 USD/tháng, câu T7), rate limit theo người dùng ở backend.

---

## 6. Rủi ro và cách kiểm tra

| Rủi ro | Cách xử lý / kiểm tra |
|---|---|
| iOS/Zalo chặn tự phát âm thanh | Mở khoá âm thanh trong lần chạm "Bắt đầu ca" (phát một đoạn im lặng ngắn). Phải thử trên iPhone thật trong Zalo |
| `speechSynthesis` trong WebView của Zalo không có giọng `vi-VN` | Thử trên Android và iPhone thật; không có thì bỏ qua, chỉ hiện chữ |
| Tên quán bị đọc sai (Chirp 3: HD không cho sửa phát âm `vi-VN`) | Nghe thử với tên quán thật trong dataset demo ở I2.2; nếu sai nhiều thì cân nhắc Zalo AI làm nhà cung cấp chính |
| Bộ nhớ trên máy Collector | 15 điểm × 2 đoạn × ~20 KB + câu tĩnh ≈ 1 MB/ca; xoá âm thanh của ca cũ khi bắt đầu ca mới |
| Key bị lộ hoặc bị lạm dụng | Key chỉ ở backend (E1), endpoint yêu cầu đăng nhập, chỉ nhận mẫu câu, rate limit, hạn mức/ngày |
| Render gói Free ngủ (lần gọi đầu ~50 giây) | Tạo âm thanh chạy nền sau khi bắt đầu ca đã thành công; không bắt người dùng chờ |
| Đọc số tiền nơi đông người | Mặc định không đọc số tiền (U13) |

---

## 7. Đề xuất cập nhật kế hoạch I2

Đã áp dụng vào `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` (giai đoạn I2):

- I2.1: nhà cung cấp Google là **Cloud Text-to-Speech (Chirp 3: HD)** thay cho Gemini API; Gemini
  chỉ là phương án so sánh tuỳ chọn.
- I2.2: thêm bước liệt kê giọng `vi-VN` bằng `voices.list` và nghe thử tên quán thật.
- I2.3: chỉ tạo sẵn những câu không phụ thuộc số liệu lúc chạy (mục 3.1).
- Danh sách điểm gắn cụ thể theo mục 4.

---

## 8. Việc phải kiểm tra lại khi có key thật

1. Bảng giá chính thức trên `cloud.google.com/text-to-speech/pricing` (các số ⚠️).
2. Danh sách tên giọng `vi-VN` của Chirp 3: HD (`voices.list`).
3. Cloud Text-to-Speech có nhận API key cho `text:synthesize` theo cách gọi REST ở mục 3.2 không
   (theo hiểu biết của người nghiên cứu là có; cần thử).
4. Lịch ngừng hoạt động của `gemini-2.5-flash-tts` trong Cloud TTS (nếu còn cân nhắc Gemini-TTS).
5. Phát âm tên quán trong dataset demo.

---

## 9. Câu hỏi cần chủ dự án trả lời (chặn giai đoạn I2)

Đã ghi vào `docs/TIEN_DO_UI_V4.md`, mã T1–T7:

- **T1.** Nhà cung cấp Google: Cloud TTS Chirp 3: HD (đề xuất), hay Gemini 3.8 Flash TTS, hay thử cả hai?
- **T2.** Xác thực với Google: API key chỉ bật Cloud TTS (đơn giản, không giới hạn được IP trên
  Render Free) hay service account (an toàn hơn, thêm thư viện `google-auth-library`)?
- **T3.** Cache âm thanh phía server: dùng Redis (cần `REDIS_URL` trên Render), hay chỉ cache trên máy?
- **T4.** Rate limit: tự viết bằng Redis, hay thêm thư viện `@nestjs/throttler`?
- **T5.** Giọng đọc của Collector mặc định bật hay tắt? (Merchant đề xuất mặc định tắt.)
- **T6.** Giọng: miền Bắc hay miền Nam, nam hay nữ? (Chọn sau khi nghe thử ở I2.2.)
- **T7.** Ngân sách tháng để đặt cảnh báo trên Google Cloud (đề xuất 5 USD)?

---

## 10. Nguồn tham khảo

Trang gốc đã đọc (✅):

- [Chirp 3: HD voices](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Gemini-TTS trên Cloud Text-to-Speech](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- [Cloud Text-to-Speech quotas and limits](https://docs.cloud.google.com/text-to-speech/quotas)
- [Gemini API: speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)

Nguồn thứ cấp về giá (⚠️):

- [Texttolab: Google Cloud TTS pricing (06/2026)](https://texttolab.com/blog/google-cloud-tts-pricing)
- [Costbench: Google Cloud Text-to-Speech pricing](https://costbench.com/software/ai-voice-tools/google-cloud-text-to-speech/)
- [Eesel: Gemini 3.8 Flash TTS pricing](https://www.eesel.ai/blog/gemini-3-8-flash-tts-pricing)
- [RouterPlex: Gemini 3.8 Flash TTS pricing](https://routerplex.com/blog/gemini-3-8-flash-tts-api-pricing)
- [Trang giá chính thức (chưa đọc được đầy đủ)](https://cloud.google.com/text-to-speech/pricing)
