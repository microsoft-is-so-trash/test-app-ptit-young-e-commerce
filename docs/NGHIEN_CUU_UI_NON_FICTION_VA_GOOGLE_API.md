# Nghiên cứu: UI non-fiction, tự động hoá, đọc giọng nói và Google API

Tài liệu tổng hợp toàn bộ nội dung nghiên cứu và trao đổi (ngày 02/10/2026) về việc chuẩn hoá UI
cho `apps/miniapp` (vai trò Merchant và Collector), cùng các nghiên cứu về Zalo AI TTS, Gemini API
và Google Maps Platform.

**Trạng thái:** tài liệu nghiên cứu, chưa phải kế hoạch triển khai. File kế hoạch markdown để
thực hiện việc chuẩn hoá chỉ được tạo sau khi chủ dự án duyệt các mục ở phần
[9. Câu hỏi còn mở](#9-câu-hỏi-còn-mở).

**Phương pháp:** audit bằng cách đọc source code, chưa chạy app để xem trực quan. Vì vậy các vấn
đề về khoảng cách, màu sắc, thứ bậc thị giác chưa được phát hiện.

---

## Mục lục

1. [Quyết định đã chốt](#1-quyết-định-đã-chốt)
2. [Non-fiction UI: định nghĩa](#2-non-fiction-ui-định-nghĩa)
3. [Kiểm kê UI Merchant và Collector](#3-kiểm-kê-ui-merchant-và-collector)
4. [Cấu trúc điều hướng 2 nhóm](#4-cấu-trúc-điều-hướng-2-nhóm)
5. [Rào cản cảm xúc](#5-rào-cản-cảm-xúc)
6. [Tự động hoá (trường phụ thuộc)](#6-tự-động-hoá-trường-phụ-thuộc)
7. [Đọc giọng nói (TTS): Zalo AI và Gemini](#7-đọc-giọng-nói-tts-zalo-ai-và-gemini)
8. [Google API: Gemini và Google Maps](#8-google-api-gemini-và-google-maps)
9. [Câu hỏi còn mở](#9-câu-hỏi-còn-mở)
10. [Bộ quy tắc chuẩn hoá đề xuất](#10-bộ-quy-tắc-chuẩn-hoá-đề-xuất)
11. [Lộ trình đề xuất](#11-lộ-trình-đề-xuất)
12. [Nguồn tham khảo](#12-nguồn-tham-khảo)

---

## 1. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Branch làm việc | `ui_version_4`. Không làm trên `ui_version_3` |
| Định hướng UI | **Non-fiction UI**: mọi thứ hiện trên màn hình phải là thật |
| Các phần giả hiện có | Cố ý **giữ lại để demo** |
| Thanh điều hướng | Tối giản về **2 nhóm** |
| Nơi lưu bộ quy tắc | Trong `.claude/rules/` để agent tự tuân theo |
| Thứ tự làm | Merchant trước, rồi đến Collector |
| File kế hoạch | Chỉ tạo sau khi chủ dự án đọc và duyệt nội dung nghiên cứu |
| Thứ tự các giai đoạn (tự động hoá, TTS, Google API) | Chưa chốt, chờ trả lời sau nghiên cứu Gemini |

---

## 2. Non-fiction UI: định nghĩa

**Mọi thứ hiện trên màn hình phải là thật.** Thông tin phải lấy từ dữ liệu thật, nút bấm phải
tạo ra kết quả thật. Cái gì không có backend thì không hiện ra.

Cách kiểm tra cho từng phần tử: *phần tử này lấy dữ liệu từ đâu? Bấm vào thì gọi đến đâu?* Không
trả lời được thì phần tử đó là "giả".

Áp dụng:

- Không dùng nhãn "Sắp có", vì nhãn này vẫn là hứa hẹn một thứ chưa tồn tại.
- Thông tin viết cứng (chứng nhận, ngân hàng, trạng thái kết nối, phiên bản build) cũng là giả.
- Công tắc chỉ lưu trong bộ nhớ tạm, tải lại trang là mất, cũng là giả.
- Danh sách phần giả bị gỡ khỏi bản thật được ghi vào backlog để sau này làm thật thì thêm lại.

**Dung hoà với quyết định giữ phần giả cho demo** (đề xuất, chờ duyệt): quy tắc non-fiction áp
dụng cho bản thật. Các phần giả chỉ hiện khi bật chế độ demo (`VITE_DEMO_MODE`), nhờ vậy bản
thật vẫn sạch mà bản demo vẫn đủ nội dung trình diễn.

### Phân loại phần tử UI

| Loại | Dấu hiệu | Cách xử lý |
|---|---|---|
| Hành động | Bấm vào thì dữ liệu thật thay đổi | Giữ, mỗi màn tối đa 1 nút chính |
| Mở rộng | Bấm vào thì hiện thêm thông tin | Đưa vào menu thả xuống ngay trong thẻ |
| Thiết lập | Bấm vào không thấy gì ngay, chỉ đổi hành vi về sau | Gom vào một mục "Cài đặt chung" |
| Giả | Không làm gì, hoặc dữ liệu viết cứng | Gỡ khỏi bản thật (giữ trong chế độ demo) |
| Trùng | Cùng một thứ xuất hiện ở 2 nơi trở lên | Chỉ giữ 1 nơi |

---

## 3. Kiểm kê UI Merchant và Collector

Đường dẫn tương đối so với `apps/miniapp/src/`, trừ khi ghi khác.

### 3.1. Merchant: các phần giả

Đã tìm trong `apps/api` và xác nhận backend **không có** endpoint tương ứng.

| Vị trí | Vấn đề |
|---|---|
| `components/RequestContainerSheet.tsx`, gọi từ `pages/AccountPage.tsx:347` | **Nghiêm trọng nhất:** không gọi API nào nhưng vẫn báo "Đã gửi yêu cầu cấp thêm can". Quán sẽ chờ can không bao giờ tới |
| `pages/AccountPage.tsx:20-21, 265-283` | 2 công tắc (thông báo Zalo OA, cảnh báo can đầy 85%) chỉ là `useState`, tải lại là mất |
| `pages/AccountPage.tsx:215, 289, 300` | "Thay đổi tài khoản thụ hưởng", "Bảo mật & Phiên làm việc Zalo", "Tải chứng nhận phát thải CO2e" có mũi tên/biểu tượng nhưng không có `onClick` |
| `pages/AccountPage.tsx:193`, `pages/PaymentsPage.tsx:138` | "MB Bank Quân Đội 0984\*\*\*\*212" và "VietQR 247 · MB Bank" giống nhau cho mọi quán |
| `pages/AccountPage.tsx:62, 83, 100, 320` | "Trực tuyến" (chấm nhấp nháy), "ĐÃ XÁC THỰC ISCC-EU", số điện thoại giả "0908 \*\*\* 892" khi thiếu dữ liệu, "Hà Nội Cluster · Staging Node · Build v2.4.0" đều viết cứng |
| `pages/HomePage.tsx:121-126` | "Cloudflare GPS Relay: Kết nối ổn định" viết cứng, không phản ánh trạng thái thật |
| `components/BrandHeader.tsx:33` | Avatar trông như nút nhưng không bấm được |
| `pages/StationDeliveryFlow.tsx:474` (Collector) | "Số phiếu nộp trạm: 1" viết cứng |

### 3.2. Merchant: trùng lặp và số liệu không khớp

- Tiền tuần này hiện 2 lần trên cùng màn Trang chủ: thẻ lớn và ô thống kê "Tiền ước tính tuần"
  (`pages/HomePage.tsx`).
- Danh sách can có ở cả Trang chủ và Tài khoản.
- Xuất PDF báo cáo CO2 chạy thật ở Hành trình xanh, nhưng mục tương tự ở Tài khoản là giả.
- Tên quán lặp 2 lần ở thẻ hồ sơ Tài khoản ("{tên} · Đại diện pháp lý").
- 6 tab chỉ có biểu tượng, không có chữ (`App.tsx:47-62`), người dùng phải đoán nghĩa.
- Hệ số CO2 không thống nhất: 2.65 ở `pages/HistoryPage.tsx:48`, nhưng 2.5 ở
  `pages/GreenJourneyPage.tsx:11` và `pages/collector/CollectorStatsPage.tsx:11`.
- Đơn giá ước tính 8.000đ (`VITE_ESTIMATED_PRICE_PER_LITER`) trong khi giá dầu thật lấy từ API là
  20.000đ.
- Tổng số liệu ở Lịch sử chỉ tính trên các trang đã tải (phân trang), nên có thể sai.
- Trạng thái "đã đọc" của thông báo không được lưu, tải lại là mất.

### 3.3. Collector: ít phần giả, nhưng quá tải

- **Màn Tuyến** có thể xếp chồng tới 9 thông báo cùng lúc: mất mạng, kết quả tải lại, lỗi tải,
  đang lấy GPS, dùng tâm phường, dữ liệu cache, biên nhận đã lưu, hàng chờ đồng bộ, ca đã sẵn
  sàng (`pages/collector/CollectorRouteScreen.tsx:70-120` và `pages/CollectorFlow.tsx`).
- **Mỗi thẻ điểm thu** có 5 chỗ bấm: Chi tiết AI, Gọi quán, Chỉ đường, Thu gom, Sao chép số
  (`CollectorRouteScreen.tsx:249-284`).
- **Bị lặp:**
  - Đăng xuất ở 2 nơi: nút "Thoát" trên header và tab Tài khoản.
  - Số giao dịch chờ đồng bộ ở 3 nơi: badge trên header, thông báo, mục "Dữ liệu trên máy" ở Tài
    khoản.
  - Tab "Lịch → Cần thu hôm nay" chỉ là bản sao để xem của tab Tuyến, còn ghi "Vào tab Tuyến để
    bắt đầu thu gom".
- **Bước thừa:**
  - Màn Tóm tắt ca chỉ để bấm "Đi nộp trạm".
  - Kết ca phải bấm 2 lần: "Kết ca" rồi sang màn mới bấm "Kết thúc ca".
  - Màn quét mã can: sau khi khớp vẫn phải bấm "Tiếp tục nhập giao dịch".
- **Màn nhập thu gom có 7 khối.** Mục "Đạt / Cần kiểm tra" tách riêng dù liên quan trực tiếp đến
  hạng dầu A/B/C và ô "Nghi ngờ pha lẫn".
- **Lộ thông tin kỹ thuật cho người dùng:** mã UUID đầy đủ (`OutboxQueueScreen.tsx`),
  "provider: on-device-heuristic · model: …", "Mã giao dịch: xxxx…".
- ⚠️ **Lỗ hổng ở màn quét mã can** (`pages/collector/CollectorQrScreen.tsx:13`): ô nhập tay được
  điền sẵn đúng mã can cần thu (`useState(stop.container_code)`). Bấm "Kiểm tra mã can" là qua
  luôn mà không cần quét QR, nên việc đối chiếu can mất tác dụng.

### 3.4. Lỗi ngoài phạm vi UI

`components/MerchantApprovalView.tsx:7, 31`: khi quán gửi lại hồ sơ bị từ chối, app gửi kèm
`ward_id` viết cứng (`10000000-0000-4000-8000-000000000001`). Backend chấp nhận luôn
(`apps/api/src/modules/merchants/merchants.service.ts:283-291`), nên quán bị chuyển sang phường
khác. Cần sửa riêng.

---

## 4. Cấu trúc điều hướng 2 nhóm

Chia theo hai câu hỏi: **"Hôm nay tôi cần làm gì?"** và **"Mọi thứ về tôi"**. Ở nhóm 2, mỗi mục
là một menu thả xuống: phần chính là những gì bấm vào thì mở ra tính năng.

### Merchant: từ 6 tab xuống 2 tab

| Nhóm | Nội dung |
|---|---|
| **Hôm nay** | Nút "Sẵn sàng thu gom" (nút chính duy nhất); trạng thái can; đơn đang mở (chỉ hiện khi có, kèm nút Huỷ); tiền tuần này (hiện 1 lần); giá dầu hôm nay |
| **Của tôi** | Các mục mở rộng được: Lịch sử thu gom (gộp tab Đơn và tab Lịch sử) · Tiền theo kỳ · Hành trình xanh (kèm xuất PDF) · Hồ sơ quán · Mời bạn · Cài đặt chung (đăng xuất) |

### Collector: từ 5 tab xuống 2 tab

| Nhóm | Nội dung |
|---|---|
| **Ca hôm nay** | 1 dải trạng thái (mạng, hàng chờ, GPS); Bắt đầu ca; danh sách điểm có nút chuyển sang bản đồ; Thu gom; Nộp trạm |
| **Của tôi** | Các mục mở rộng được: Đã thu và thống kê · Hồ sơ và xe · Địa bàn · Cài đặt chung (giọng đọc nếu làm TTS, đăng xuất) |

Bỏ vì trùng lặp: tab Lịch / "Cần thu hôm nay", tab Bản đồ (thành nút chuyển trong "Ca hôm nay"),
nút "Thoát" trên header, avatar không bấm được.

**Thẻ điểm thu:** chỉ còn 1 nút chính "Thu gom". Bấm vào thẻ thì mở menu với Gọi quán, Chỉ
đường, Sao chép số, Chi tiết AI.

**Dải trạng thái duy nhất** xếp theo ưu tiên: lỗi > mất mạng > hàng chờ > GPS > dữ liệu cache.
Bấm vào để xem chi tiết.

### Hai kiểu hiển thị thanh điều hướng (chưa chốt)

- **A (đề xuất):** giữ thanh dưới đáy màn hình, 2 nút có chữ. Ngón cái dễ với tới, hợp với
  Collector thao tác một tay ngoài trời.
- **B:** bỏ thanh dưới; màn chính chiếm toàn màn hình, nút "Của tôi" nằm ở góc trên.

---

## 5. Rào cản cảm xúc

Những điểm gây lo lắng hoặc khó chịu trong code hiện tại:

- **Mất niềm tin:** chỉ cần quán phát hiện 1 thông tin giả (chứng nhận, ngân hàng, báo gửi thành
  công) là họ nghi ngờ cả số tiền. Với app liên quan đến tiền, đây là rủi ro lớn nhất.
- **Báo thành công giả** ("Đã gửi yêu cầu cấp can"): quán chờ thứ không bao giờ tới.
- **Số liệu không khớp** (CO2, đơn giá): tạo cảm giác bị tính sai.
- **Nút bị khoá mà không nói lý do**, ví dụ nút "Thu gom" khi giao dịch đang chờ đồng bộ.
- **Hộp thoại hệ thống** `window.confirm` khi đăng xuất hoặc huỷ ca trông giống thông báo lỗi.
- **Nút đỏ chữ in hoa** "ĐĂNG XUẤT TÀI KHOẢN QUÁN" trông như cảnh báo.
- **Collector bị "nghi ngờ":** nhiều cảnh báo AI màu vàng/đỏ cộng thêm 2 ô "Tôi đã kiểm tra…"
  khiến người thu gom có cảm giác bị nghi gian lận.

Nên giữ:

- Danh sách "Còn thiếu: …" khi chưa gửi được giao dịch.
- Thông báo "Đã lưu an toàn" kèm tự đồng bộ.
- Ẩn thanh tab khi đang thao tác dở (`FOCUSED_SCREENS` trong `CollectorShell.tsx`).

Hướng chung: trung thực hơn ấn tượng; mỗi màn 1 việc chính; luôn cho biết dữ liệu đã lưu chưa và
khi nào được xử lý; giọng văn nhẹ nhàng.

---

## 6. Tự động hoá (trường phụ thuộc)

Lấy cảm hứng từ app lập task: chỉnh thời lượng thì thời điểm kết thúc tự cập nhật.

**Nguyên tắc:**

- Mỗi cặp ô có một ô gốc, ô còn lại tự tính theo và được đánh dấu "tự tính".
- Người dùng sửa tay ô tự tính thì giữ nguyên số họ nhập, không ghi đè.
- App chỉ tự **điền sẵn, chọn sẵn, chuyển màn** khi chắc chắn.
- App **không bao giờ** tự gửi, tự nộp trạm, tự huỷ hay tự xử lý tiền thay người dùng.
- Về kỹ thuật: giá trị tự tính viết thành hàm thuần trong `lib/` để kiểm thử bằng `node:test`;
  không dùng `useEffect` để đồng bộ 2 state với nhau.

**Đã có sẵn trong app:** đổi kg sang lít (chỉ khi ô lít trống), sắp xếp tuyến theo GPS, dùng toạ
độ tâm phường khi mất GPS, tự đồng bộ hàng chờ, gợi ý trạm.

**Đề xuất thêm:**

| # | Khi người dùng… | App tự động… | Nơi |
|---|---|---|---|
| 1 | Nhập kg | Lít tự tính (chia 0,91), và ngược lại; ô vừa sửa là ô gốc. Hiện ô lít được điền sẵn số quán khai nên nhập kg không làm lít đổi, 2 số mâu thuẫn | `CollectorEntryScreen` |
| 2 | Chọn hạng C hoặc tick "Nghi ngờ pha lẫn" | Tự chuyển sang "Cần kiểm tra" (vẫn sửa được), bỏ được 1 khối | `CollectorEntryScreen` |
| 3 | Quét QR khớp | Tự chuyển sang màn nhập, bỏ nút "Tiếp tục nhập giao dịch" | `CollectorQrScreen` |
| 4 | Mở màn nhập | Tự lấy GPS ngay, nút "Lấy lại GPS" chỉ hiện khi lỗi | `CollectorEntryScreen` |
| 5 | AI đánh giá hạng dầu với độ tin cậy cao, chưa chọn hạng | Chọn sẵn hạng đó, ghi rõ "AI chọn sẵn" | `CollectorEntryScreen` |
| 6 | Thu xong điểm cuối | Hiện luôn "Đi nộp trạm" trên màn Tuyến, bỏ màn Tóm tắt | `CollectorFlow` |
| 7 | Vào bước nộp trạm | Chọn sẵn trạm gần nhất còn đủ sức chứa | `StationDeliveryFlow` |
| 8 | Nộp trạm đã đồng bộ | Gộp "Kết ca" và "Kết thúc ca" thành 1 lần bấm | `StationDeliveryFlow` |
| 9 | Merchant bấm "Sẵn sàng thu gom" | Điền sẵn số lít ước tính của can (`estimated_liters`), chỉ cần 1 chạm | `OrderSheet` |
| 10 | Can ước tính đầy từ 85% | Nhắc báo thu gom trong thông báo (biến công tắc giả thành thật, tính ở client từ dữ liệu dashboard) | `notifications` |
| 11 | Quán đăng ký mới | Đoán phường từ GPS thay vì chọn dropdown (cần thêm API) | `MerchantApprovalView` |
| 12 | Đánh dấu thông báo đã đọc | Lưu trạng thái đã đọc | `NotificationBell` |

---

## 7. Đọc giọng nói (TTS): Zalo AI và Gemini

### 7.1. Zalo AI TTS

Thông tin xác minh qua mã nguồn mở đang dùng API này (trang tài liệu chính thức zalo.ai bị chặn
mạng ở môi trường nghiên cứu nên chưa đối chiếu được):

- `POST https://api.zalo.ai/v1/tts/synthesize`, header `apikey: <key>`.
- Body dạng form:
  - `input`: văn bản cần đọc.
  - `speaker_id`: 1 nữ miền Nam, 2 nữ miền Bắc, 3 nam miền Nam, 4 nam miền Bắc.
  - `speed`: từ 0,8 đến 1,2.
  - `encode_type`: định dạng file.
- Kết quả trả về chứa `data.url`, là link file âm thanh do Zalo lưu.
- **Chưa xác minh:** giới hạn ký tự mỗi lần (một nguồn ghi 500, plugin mã nguồn mở cắt ở khoảng
  2.000), giá, hạn mức, link âm thanh có hết hạn không. Cần mua gói để có API key.

### 7.2. Gemini TTS

Theo kết quả tìm kiếm (chưa mở được trang gốc):

- Có Gemini 3.8 Flash TTS và Gemini 3.8 Flash-Lite TTS, đều hỗ trợ tiếng Việt.
- Tiếng Việt (`vi-VN`) đã chính thức (GA) trên dịch vụ Cloud Text-to-Speech (Gemini-TTS).
- Kết quả trả về là dữ liệu âm thanh thô, backend phải chuyển sang mp3 (theo hiểu biết của người
  nghiên cứu, cần kiểm lại).

### 7.3. So sánh

| | Zalo AI TTS | Gemini TTS |
|---|---|---|
| Giọng Việt | 4 giọng (nam/nữ, Bắc/Nam) | Nhiều giọng, điều chỉnh được giọng đọc bằng câu mô tả |
| Ổn định | Chưa tìm thấy cam kết | Qua AI Studio không có cam kết; qua Cloud TTS hoặc Vertex AI thì có |
| Kết quả trả về | Link file âm thanh | Dữ liệu âm thanh thô |
| Tài khoản | Gói Zalo AI | Google Cloud có gắn thanh toán |

### 7.4. Dùng ở đâu

1. **Collector (giá trị cao nhất):** đang đi xe, tay bận, ngoài trời khó nhìn màn hình. Ví dụ:
   "Đã lưu 18 lít. Điểm tiếp theo: Quán Bà Ba, cách 350 mét"; "Sai can, kiểm tra lại mã"; "Còn 2
   giao dịch chưa đồng bộ" trước khi kết ca.
2. **Merchant:** nút "Nghe" trên thông báo, ví dụ "Người thu gom đã nhận đơn". Hữu ích cho chủ quán
   lớn tuổi.

### 7.5. Kiến trúc đề xuất

- Module `tts` ở backend NestJS, endpoint `POST /api/v1/tts`, có đăng nhập (JWT) và giới hạn số
  lần gọi.
- Endpoint nhận **mẫu câu kèm tham số**, không nhận văn bản tự do, để không bị lợi dụng làm dịch
  vụ đọc miễn phí.
- API key đặt trong biến môi trường của backend (ví dụ `ZALO_AI_API_KEY`, `GEMINI_API_KEY`), không
  bao giờ để trong miniapp.
- Một lớp trung gian `TtsProvider` để đổi nhà cung cấp dễ dàng. Thứ tự lấy âm thanh:
  1. File đã lưu sẵn (theo hash của nội dung câu + giọng + tốc độ).
  2. Nhà cung cấp chính.
  3. Nhà cung cấp phụ.
  4. Giọng đọc có sẵn của điện thoại (`speechSynthesis`).
  5. Chỉ hiện chữ.
- Lưu file âm thanh vào kho của mình, không phụ thuộc link của nhà cung cấp.
- **Khi mất sóng:** lúc bấm "Bắt đầu ca", app đã tải sẵn tuyến và mã QR (`prefetchRouteData`).
  Tạo sẵn âm thanh cho từng điểm ngay lúc đó và lưu trên máy (Cache Storage/IndexedDB). Nếu nhà
  cung cấp lỗi thì chỉ làm bước bắt đầu ca chậm hơn, không ảnh hưởng khi đang chạy tuyến.
- Có công tắc bật/tắt giọng đọc trong Cài đặt chung (công tắc thật).

### 7.6. Rủi ro cần thử trên máy thật

- iOS và trình duyệt trong Zalo có thể chặn phát âm thanh nếu không do người dùng chạm. Cách xử
  lý: "mở khoá" âm thanh ngay khi bấm "Bắt đầu ca".
- Có thể phải khai báo tên miền chứa file âm thanh trong cấu hình Zalo Mini App.
- Độ trễ mạng khi tạo âm thanh.
- Đọc to số tiền ở nơi đông người, nên cần tắt được và mặc định không đọc số tiền.

---

## 8. Google API: Gemini và Google Maps

Các trang tài liệu gốc của Google (ai.google.dev, developers.google.com, docs.cloud.google.com) bị
chặn mạng ở môi trường nghiên cứu. Số liệu lấy từ kết quả tìm kiếm có trích các trang đó, cùng
một số blog bên ngoài. Chỗ nào chưa chắc đã ghi rõ.

### 8.1. Kết luận nhanh

- **Google Maps ổn định, dùng được cho bản chạy thật** (dịch vụ chính thức, cam kết hoạt động
  99,9% mỗi tháng). Google Maps không biết kho tập kết của mình ở đâu: toạ độ kho là dữ liệu của
  mình, đã có trong database. Google Maps chỉ nên dùng để giúp admin nhập vị trí kho chính xác,
  tính quãng đường đi thật thay cho đường chim bay, và chỉ đường (đã có, miễn phí).
- **Gemini mạnh nhưng kém ổn định hơn nhiều:** bản qua AI Studio không có cam kết hoạt động,
  thường xuyên lỗi quá tải, model bị thay rất nhanh. Chỉ dùng cho tính năng phụ có phương án thay
  thế, không bao giờ đặt vào các bước bắt buộc (lưu giao dịch, nộp trạm, kết ca).

### 8.2. Gemini API

**Hiện trạng code:** dự án chưa dùng AI thật nào. Phân hạng dầu từ ảnh là thuật toán chạy trên máy
(`apps/miniapp/src/lib/oil-image-analyzer.ts`), và code ghi rõ đây không phải AI dùng cho bản
thật.

**Độ ổn định**

| Khía cạnh | Thực tế |
|---|---|
| Cam kết hoạt động | Qua AI Studio: **không có**. Qua Vertex AI: 99,5% mỗi tháng |
| Lỗi hay gặp | 429 (vượt hạn mức) và 503 (quá tải) thường xuyên vào giờ cao điểm. Sự cố lớn tháng 2/2026 (thay đổi cấu hình bộ lọc an toàn) và ngày 27/3/2026 |
| Model bị thay nhanh | `gemini-2.0-flash` tắt ngày 1/6/2026. `gemini-2.5-flash` và `gemini-2.5-pro` tắt ngày 16/10/2026. Model preview chỉ được báo trước tối thiểu 2 tuần; model experimental không dùng cho bản thật |
| Gói miễn phí | Bị cắt 50–80% từ tháng 12/2025. Từ 1/4/2026 dòng Pro không còn miễn phí |
| Việt Nam | Có trong danh sách quốc gia được hỗ trợ |

Model hiện tại theo kết quả tìm kiếm: dòng Gemini 3.x (ví dụ `gemini-3.8-flash`). Chưa xác minh mã
model chính xác trên trang gốc.

**Dùng Gemini vào đâu trong dự án**

| Việc | Giá trị | Rủi ro | Đánh giá |
|---|---|---|---|
| Đọc giọng nói cho Collector | Cao | Thấp, nếu tạo sẵn âm thanh lúc bắt đầu ca | Nên làm, thử song song với Zalo AI |
| Gợi ý hạng dầu từ ảnh | Trung bình | Cao, vì Collector hay mất sóng và Gemini hay lỗi 503 | Chỉ chạy khi có mạng, chạy sau thuật toán trên máy, không được chặn nút lưu |
| Soạn nội dung thông báo cho quán | Thấp | Không đáng kể | Không cần, câu mẫu cố định là đủ |

### 8.3. Google Maps cho kho tập kết (trạm)

**Hiện trạng code**

- Admin gõ tay vĩ độ/kinh độ của trạm (`apps/admin/src/components/stations-view.tsx:617`).
- Gợi ý trạm dựa trên đường chim bay bằng PostGIS `ST_Distance`
  (`apps/api/src/modules/stations/stations.service.ts:137-175`), không tính hẻm, đường một chiều.
- Chỉ đường bằng link Google Maps (`buildGoogleMapsDirectionsUrl`,
  `apps/miniapp/src/lib/zalo-client.ts:379`), không cần API key, không tốn tiền.
- Bản đồ của Collector dùng Leaflet với máy chủ bản đồ OpenStreetMap công cộng
  (`CollectorMapPage.tsx`). Máy chủ này không có cam kết hoạt động và không cho phép dùng với lưu
  lượng lớn. Đây là rủi ro sẵn có ngay lúc này.

**Các phương án**

| Việc | API của Google | Chi phí | Đề xuất |
|---|---|---|---|
| Admin nhập vị trí trạm: gõ địa chỉ, chọn gợi ý, kéo ghim trên bản đồ để xác nhận | Places API (New) hoặc Geocoding | Vài chục lượt mỗi tháng, nằm trong mức miễn phí | **Nên làm** |
| Xếp trạm theo đường đi xe máy thật | Routes API (Compute Route Matrix), chế độ `TWO_WHEELER`. Việt Nam được hỗ trợ, giá cao hơn chế độ ô tô | Mỗi lần gợi ý tốn 1 điểm đi nhân số trạm | Làm có điều kiện: gọi từ backend, lưu kết quả, lỗi thì quay về đường chim bay |
| Chỉ đường | Link Google Maps (đang dùng) | Miễn phí | Giữ nguyên |
| Hiển thị bản đồ | Maps JavaScript API | 10.000 lượt mỗi tháng miễn phí | Cân nhắc thay máy chủ OpenStreetMap công cộng |

**Những điều cần biết**

- **Giá:** từ 1/3/2025, Google bỏ khoản tín dụng 200$ mỗi tháng. Mỗi loại API (SKU) có mức miễn
  phí riêng: Essentials 10.000 lượt, Pro 5.000 lượt, Enterprise 1.000 lượt mỗi tháng, không cộng
  dồn giữa các API.
- **API cũ:** Places API bản cũ đã đóng với dự án mới, phải dùng Places API (New). Theo hiểu biết
  của người nghiên cứu, Directions và Distance Matrix cũng đã chuyển sang dạng "cũ" và nên dùng
  Routes API thay thế (cần kiểm lại).
- **Cam kết:** hoạt động 99,9% mỗi tháng. Không đạt thì được hoàn 10% (99,0–99,9%), 25%
  (95,0–99,0%) hoặc 50% (dưới 95%) hoá đơn.
- **Rủi ro riêng ở Việt Nam:** địa chỉ trong hẻm và tên phường sau đợt sắp xếp hành chính có thể
  chưa được Google cập nhật. Admin luôn phải tự xác nhận ghim trên bản đồ, không tin geocode tự
  động.
- **Khi mất mạng:** mọi API của Google Maps đều cần mạng. Nên tính danh sách trạm gợi ý ngay lúc
  bắt đầu ca (giống cách app tải sẵn tuyến và mã QR). Khi mất mạng dùng danh sách đã lưu cùng
  khoảng cách đường chim bay.
- **Zalo Mini App:** nếu nhúng bản đồ Google, API key phải cho phép tên miền `https://h5.zdn.vn` và
  `zbrowser://h5.zdn.vn`. Cần thử trên máy thật.
- **API key:** dùng 2 key riêng. Key backend chỉ được gọi từ IP máy chủ và chỉ bật Routes/Places.
  Key giao diện chỉ dùng được từ tên miền của app và chỉ bật Maps JavaScript. Đặt hạn mức gọi mỗi
  ngày và cảnh báo khi chi tiêu vượt ngân sách.
- **Thanh toán:** phải có tài khoản thanh toán (thẻ) dù chỉ dùng trong mức miễn phí.

**Kết luận về ổn định:** Google Maps ổn định hơn Gemini rất nhiều. Phương án dự phòng vẫn bắt
buộc, nhưng lý do là Collector hay mất sóng chứ không phải vì Google kém ổn định.

---

## 9. Câu hỏi còn mở

1. **Thứ tự các giai đoạn.** Đề xuất:
   1. Dọn UI (Merchant rồi Collector).
   2. Tự động hoá.
   3. Google Maps: admin nhập vị trí trạm và gợi ý trạm theo đường đi thật.
   4. Đọc giọng nói: thử song song Zalo AI và Gemini rồi chọn.
   5. Gợi ý hạng dầu bằng Gemini: để cuối cùng, hoặc không làm.
2. **Phần giả chỉ hiện ở chế độ demo** (`VITE_DEMO_MODE`): đồng ý không?
3. **Kiểu thanh điều hướng:** A (thanh dưới đáy, 2 nút có chữ, đề xuất) hay B (nút "Của tôi" ở góc
   trên)?
4. **Tài khoản:** đã có Google Cloud có gắn thanh toán chưa? Đã có Zalo AI API key chưa? Giọng đọc
   mặc định số mấy (1–4)?

---

## 10. Bộ quy tắc chuẩn hoá đề xuất

Sẽ lưu thành 2 file để agent tự tuân theo, sau khi được duyệt:

- `.claude/rules/ui-non-fiction.md`: quy tắc UI (U1–U13).
- `.claude/rules/external-apis.md`: quy tắc dùng API bên ngoài (E1–E6).

### Quy tắc UI

- **U1.** Mọi chỗ bấm được phải thuộc một trong ba loại Hành động / Mở rộng / Thiết lập. Không
  thuộc loại nào thì xoá.
- **U2.** Non-fiction: không có thông tin giả, không báo thành công giả. Tính năng chưa có backend
  không hiện ở bản thật (chỉ được hiện ở chế độ demo, nếu được duyệt).
- **U3.** Mỗi màn tối đa 1 nút chính. Hành động phụ nằm trong menu thả xuống của thẻ.
- **U4.** Mỗi vai trò chỉ có một mục "Cài đặt chung" cho các thiết lập.
- **U5.** Mỗi thông tin hoặc hành động chỉ có một nơi chính thức.
- **U6.** Mỗi màn tối đa 1 dải trạng thái, xếp theo mức ưu tiên, bấm vào để xem chi tiết.
- **U7.** Thanh điều hướng 2 nhóm ("Hôm nay"/"Ca hôm nay" và "Của tôi"), luôn có chữ.
- **U8.** Ô tự tính phải ghi rõ "tự tính" và tôn trọng số người dùng sửa tay. Phép tính viết thành
  hàm thuần có kiểm thử.
- **U9.** App được tự điền, tự chọn, tự chuyển màn. App không tự gửi, tự nộp, tự huỷ, tự xử lý
  tiền.
- **U10.** Nút bị khoá phải nói lý do; thông báo lỗi phải nói cách sửa.
- **U11.** Hằng số nghiệp vụ (hệ số CO2, đơn giá, mật độ dầu) chỉ lấy từ một nguồn duy nhất.
- **U12.** Không hiện thông tin kỹ thuật (UUID, model AI, provider) cho người dùng cuối.
- **U13.** Giọng đọc luôn có chữ đi kèm, tắt được, và mặc định không đọc số tiền.

### Quy tắc dùng API bên ngoài

- **E1.** Mọi API key (Gemini, Maps, Zalo AI) chỉ nằm ở backend hoặc được giới hạn chặt. Không đặt
  key không giới hạn trong miniapp.
- **E2.** Tên model đặt trong biến môi trường, không viết cứng trong code. Chỉ dùng model ổn định
  cho bản thật; theo dõi trang deprecations.
- **E3.** Đặt thời gian chờ ngắn. Với lỗi 429 hoặc 503, thử lại tối đa 2 lần, mỗi lần chờ lâu hơn.
  Vẫn lỗi thì chuyển sang phương án dự phòng.
- **E4.** Không đặt API bên ngoài vào các bước bắt buộc (lưu giao dịch, nộp trạm, kết ca).
- **E5.** Những gì Collector cần dùng khi mất sóng thì tạo sẵn lúc bắt đầu ca.
- **E6.** Luôn đặt hạn mức gọi và cảnh báo ngân sách.

---

## 11. Lộ trình đề xuất

Thứ tự giai đoạn chờ chốt (xem mục 9). Mỗi giai đoạn làm Merchant trước, Collector sau.

1. **Dọn UI, rủi ro thấp:** gỡ phần giả khỏi bản thật (giữ trong chế độ demo), bỏ trùng lặp, thêm
   chữ cho tab, gộp thông báo của Collector.
2. **Đổi cấu trúc:** thanh điều hướng 2 nhóm, thẻ điểm thu dạng menu thả xuống, mục Cài đặt chung,
   bỏ màn trung gian (Tóm tắt ca, gộp kết ca).
3. **Tự động hoá:** các mục ở phần 6, mỗi mục kèm kiểm thử hàm thuần.
4. **Google Maps:** admin nhập vị trí trạm, gợi ý trạm theo đường đi thật có phương án dự phòng.
5. **Đọc giọng nói:** module backend, cache, tạo sẵn lúc bắt đầu ca; Collector trước, Merchant sau.
6. **Gợi ý hạng dầu bằng Gemini:** tuỳ chọn, cuối cùng.

Theo quy trình sẵn có trong `eco-oil-miniapp-redesign-plan.md`, mỗi thay đổi được phân vào nhóm A
(thuần trình bày, CSS/markup) hoặc nhóm B (đổi tương tác/tính năng, cần duyệt riêng và viết kiểm
thử trước).

---

## 12. Nguồn tham khảo

**Zalo AI TTS**

- [ZaloTTS · PyPI](https://pypi.org/project/ZaloTTS/)
- [minhdanh/ha-zalo-tts](https://github.com/minhdanh/ha-zalo-tts)
- [Mytour: Zalo AI Text To Speech](https://mytour.vn/en/blog/bai-viet/transforming-text-into-speech-with-zalo-ai-text-to-speech.html)

**Gemini API**

- [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- [Diễn đàn Google AI: thay thế gemini-2.5 trước khi khai tử](https://discuss.ai.google.dev/t/clarification-on-stable-replacement-models-for-gemini-2-5-flash-and-gemini-2-5-pro-before-june-2026-deprecation/130009)
- [Gemini TTS](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini 3.8 Flash TTS](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts)
- [Gemini-TTS trên Cloud Text-to-Speech](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts)
- [Diễn đàn Google AI: lỗi 429/503 liên tục](https://discuss.ai.google.dev/t/continuously-experiencing-429-and-503-errors-in-gemini-models/185959)
- [Sự cố Vertex AI Gemini](https://status.cloud.google.com/incidents/41E5S3mkTGDfkZuJZH5k)
- [Apiyi: sự cố 27/3/2026](https://help.apiyi.com/en/google-gemini-aistudio-api-outage-march-2026-nano-banana-alternative-guide-en.html)
- [Apiyi: thay đổi gói miễn phí 4/2026](https://help.apiyi.com/en/google-gemini-api-free-tier-changes-april-2026-guide-en.html)
- [Costlayer: giới hạn gói miễn phí](https://costlayer.ai/blog/google-gemini-api-free-tier-restrictions-april-2026)
- [Vertex AI Gemini SLA](https://cloud.google.com/vertex-ai/generative-ai/sla)
- [Hoerr: AI Studio vs Vertex AI](https://hoerrsolutions.com/google-ai-studio-gemini-vertex-ai-comparison/)
- [Gemini available regions](https://ai.google.dev/gemini-api/docs/available-regions)

**Google Maps Platform**

- [Google Maps March 2025 changes](https://developers.google.com/maps/billing-and-pricing/march-2025)
- [Maps pricing overview](https://developers.google.com/maps/billing-and-pricing/overview)
- [Woosmap: giá Google Maps 2026](https://www.woosmap.com/blog/google-maps-api-pricing-breakdown)
- [Google Maps Platform SLA](https://cloud.google.com/maps-platform/terms/sla)
- [Routes two-wheeled coverage](https://developers.google.com/maps/documentation/routes/coverage-two-wheeled)
- [Maps deprecations](https://developers.google.com/maps/deprecations)
- [Places API legacy (issue use-places-autocomplete)](https://github.com/wellyshen/use-places-autocomplete/issues/1146)
- [GoGoDuk: so sánh API bản đồ Việt Nam](https://gogoduk.com/blog/map-api-viet-nam-tot-nhat)
- [Zalo Mini App: whitelist domain](https://miniapp.zaloplatforms.com/community/4855799520141856207/ho-tro-ve-whitelist-domain-o-zalo-mini-app)
- [Google Maps domains](https://developers.google.com/maps/domains)
