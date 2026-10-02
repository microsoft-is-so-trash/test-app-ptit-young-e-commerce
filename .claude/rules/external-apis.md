---
paths:
  - "apps/api/**"
  - "apps/miniapp/**"
  - "apps/admin/**"
  - "packages/**"
---

# Dùng API bên ngoài (Google Maps, Gemini, Zalo AI)

Nguồn gốc và số liệu ổn định: `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md` (mục 7 và 8).

## Quy tắc

- **E1. Key.** Key Gemini, Zalo AI và key Google Maps phía server chỉ nằm trong biến môi trường
  của `apps/api`. Frontend chỉ được dùng key Google Maps riêng, giới hạn theo tên miền (referrer)
  và chỉ bật Maps JavaScript API. Không commit key; chỉ thêm tên biến vào `.env.example`.
  Tên biến: `GOOGLE_MAPS_SERVER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`,
  `VITE_GOOGLE_MAPS_BROWSER_KEY`, `GEMINI_API_KEY`, `ZALO_AI_API_KEY`.
- **E2. Model và phiên bản.** Tên model Gemini đặt trong biến môi trường (ví dụ
  `GEMINI_TTS_MODEL`), không viết cứng. Chỉ dùng model stable cho bản thật. Dùng Places API (New)
  và Routes API, không dùng Places API bản cũ, Directions API hay Distance Matrix API.
- **E3. Lỗi tạm thời.** Mỗi lần gọi có timeout ngắn. Với 429/503 hoặc lỗi mạng: thử lại tối đa 2
  lần, chờ tăng dần có jitter. Vẫn lỗi thì chuyển sang phương án dự phòng, ghi log phía server,
  không làm hỏng màn hình người dùng.
- **E4. Không nằm trên đường đi bắt buộc.** Lưu giao dịch thu gom, đồng bộ hàng chờ, nộp trạm và
  kết ca không được phụ thuộc vào Google Maps, Gemini hay Zalo AI.
- **E5. Offline cho Collector.** Dữ liệu từ API bên ngoài mà Collector cần khi chạy tuyến (âm
  thanh TTS, gợi ý trạm theo đường đi) phải được tạo sẵn và lưu trên máy lúc "Bắt đầu ca". Khi
  mất mạng dùng bản đã lưu, hoặc dự phòng: đường chim bay PostGIS cho trạm, `speechSynthesis` rồi
  chỉ chữ cho TTS.
- **E6. Chi phí.** Endpoint backend gọi API trả phí phải yêu cầu đăng nhập và có giới hạn số lần
  gọi. Lưu kết quả lặp lại (âm thanh theo hash nội dung + giọng + tốc độ; ma trận trạm theo vị
  trí làm tròn). TTS chỉ nhận mẫu câu + tham số, không nhận văn bản tự do.

## Phương án dự phòng theo tính năng

| Tính năng | Chính | Dự phòng |
|---|---|---|
| Chỉ đường | Link Google Maps (`buildGoogleMapsDirectionsUrl`, không cần key) | Hiện địa chỉ dạng chữ |
| Gợi ý trạm | Routes API, chế độ `TWO_WHEELER`, gọi từ backend | `ST_Distance` PostGIS hiện có |
| Vị trí trạm (admin) | Places API (New) + ghim trên bản đồ, admin xác nhận | Nhập tay lat/lng như hiện tại |
| TTS | Âm thanh đã lưu → nhà cung cấp chính → nhà cung cấp phụ | `speechSynthesis` → chỉ hiện chữ |
| Gợi ý hạng dầu | Thuật toán trên máy (`oil-image-analyzer.ts`) | Gemini chỉ bổ sung khi có mạng |
