# Nghiên cứu: kiểm tra tỷ lệ khối lượng / thể tích (tỷ trọng) để phát hiện dầu pha loãng

Ngày 05/10/2026. Trạng thái: **đề xuất, chưa làm**. Ngoài phạm vi kế hoạch UI v4; muốn làm phải được
chủ dự án duyệt thành task/giai đoạn riêng.

Vấn đề cần giải: dầu nhẹ (thể tích lớn so với khối lượng) nên thu mua tính theo cân. Có nghi vấn quán pha
thêm nước hoặc chất khác để tăng số kg/lít bán ra. Cần một mô hình cho biết tỷ lệ kg/lít "đúng" là bao
nhiêu, để kiểm tra giao dịch có hợp lệ hay không.

---

## 1. Kết luận ngắn

1. **Tỷ trọng là tín hiệu đúng, nhưng đo bằng cân + vạch chia trên can thì quá thô.** Pha 10% nước chỉ
   làm tỷ trọng tăng 0,86%; sai số của cân và vạch chia trên can là ±2,5–5%. Chênh nhiệt độ 15 °C và
   35 °C đã làm tỷ trọng lệch 1,4%.
2. **Muốn phát hiện pha nước từ khoảng 3%** cần đo tỷ trọng bằng **tỷ trọng kế** (sai số ±0,001 g/mL) và
   **hiệu chỉnh nhiệt độ** về 15 °C, kết hợp **kiểm tra lớp nước lắng đáy can**. Nước không tan trong dầu,
   lắng xuống đáy, nên lấy mẫu ở mặt trên sẽ không thấy.
3. **Mô hình đề xuất có 4 tầng** (mục 4). Tầng 1 là công thức vật lý, giải thích được, làm được ngay.
   Tầng 4 (học máy) chỉ làm khi đã có nhãn thật từ kết quả kiểm nghiệm MIU ở trạm.
4. **Trong code hiện tại có một lỗi khiến kiểm tra tỷ trọng gần như không bao giờ chạy** (mục 3.2).

---

## 2. Số liệu vật lý

| Đại lượng | Giá trị | Nguồn |
|---|---|---|
| Tỷ trọng dầu thực vật ở 15 °C | 0,911–0,927 kg/L (ô liu 0,913; đậu nành 0,923; hướng dương 0,924; dừa 0,927) | [densitycalculator.net](https://densitycalculator.net/density-of/oil), [J. AOCS 1999](http://lib3.dss.go.th/fulltext/Journal/J.AOCS/J.AOCS/1999/no.12/dec1999,vol76,no12,p1415-1419.pdf) |
| Dầu ăn đã qua sử dụng (UCO) | ≈ 0,92 g/mL ở 15,6 °C; 0,91–0,93 trong khoảng 15–25 °C | [svlele UCO typical analysis](https://www.svlele.com/ruco_msds.pdf) |
| Hệ số nhiệt | Tỷ trọng giảm tuyến tính ≈ 0,00064 kg/L mỗi 1 °C | [Temperature dependence of density and viscosity of vegetable oils](https://files01.core.ac.uk/download/pdf/41768478.pdf) |
| Nước ở 15 °C | 0,999 kg/L | — |
| Dầu khoáng nhẹ (diesel, dầu hoả) | ≈ 0,80–0,85 kg/L | — |
| Chuẩn thương mại UCO | MIU (độ ẩm + tạp chất + chất không xà phòng hoá) tối đa 2%; người mua trừ tiền khi vượt | [S&P Global Platts](https://www.spglobal.com/commodityinsights/PlattsContent/_assets/_files/en/our-methodology/methodology-specifications/global_biofuels.pdf), [Baker Commodities](https://bakercommodities.com/blog/2026/01/22/uco-contanmination-and-rebate-potential/) |

⚠️ Chưa xác minh: dầu cọ (palm olein, phổ biến ở quán Việt Nam) đông một phần khi trời lạnh, nên đọc
thể tích trên vạch can không tin được vào mùa đông Hà Nội. Cần thử thực tế.

### Độ nhạy (tính bằng hỗn hợp tuyến tính theo thể tích)

| Pha thêm | Tỷ trọng (15 °C) | Thay đổi |
|---|---|---|
| 0% | 0,9200 | — |
| 5% nước | 0,9240 | +0,43% |
| 10% nước | 0,9279 | +0,86% |
| 20% nước | 0,9358 | +1,72% |
| 10% dầu khoáng nhẹ | 0,9115 | −0,92% |
| 20% dầu khoáng nhẹ | 0,9030 | −1,85% |

| Cách đo | Sai số tỷ trọng | Lượng nước nhỏ nhất phân biệt được (2σ) |
|---|---|---|
| Cân treo ±0,1 kg + vạch can ±1 L (20 L) | ±5,0% | không phát hiện được |
| Cân ±0,05 kg + vạch can ±0,5 L | ±2,5% | ~59% |
| Tỷ trọng kế ±0,001 g/mL, có hiệu chỉnh nhiệt độ | ±0,11% | ~3% |

Hệ quả: chỉ lấy "kg chia lít" ở quán thì chỉ bắt được trường hợp pha rất lộ liễu. Muốn có giá trị thật
phải đo bằng tỷ trọng kế, hoặc đo ở quy mô lớn tại trạm (sai số tương đối nhỏ hơn nhiều).

---

## 3. Dự án đang có gì

### 3.1. Đã có

- Hằng số `DEFAULT_DENSITY_KG_PER_LITER = 0,91` (`packages/shared-types`), biến `DENSITY_KG_PER_LITER`.
- Giao dịch lưu `actual_liters`, `actual_kg`, `mass_source` (`SCALE` hoặc `ESTIMATED_FROM_VOLUME`) và
  `density_factor` (khác null khi một trong hai số được **suy ra** bằng 0,91).
- `transaction-anomaly-scorer.ts` có tín hiệu `DENSITY_OUTLIER`:
  - Đủ 5 mẫu của quán: robust z-score (median + MAD), ngưỡng 3,5.
  - Chưa đủ mẫu: so với 0,91, chỉ cảnh báo khi lệch **trên 20%**. Mức này tương đương pha hơn 200% nước,
    nên gần như không bao giờ cảnh báo.
- Người thu gom tự tick "Nghi ngờ pha lẫn" → cảnh báo `SUSPECTED_ADULTERATION`, bắt buộc có ảnh.
- Nộp trạm so tổng kg giao dịch với kg trạm cân, lệch hơn 2% thì gắn cờ.
- Thanh toán theo `PER_LITER` hoặc `PER_KG` (bảng `oil_prices`).

### 3.2. Lỗi làm kiểm tra tỷ trọng gần như không chạy

`collections.service.ts:134`: khi chỉ nhập kg, số lít được **suy ra** bằng `kg / 0,91` và giao dịch vẫn
mang `mass_source = SCALE`. `transaction-anomaly-scorer.ts:309-318` lấy mọi giao dịch `SCALE` có đủ kg
và lít làm mẫu tỷ trọng, nên:

- Tỷ trọng của giao dịch đó luôn đúng 0,91, không bao giờ bất thường.
- Mẫu 0,91 giả này còn lẫn vào dữ liệu nền của quán, làm MAD = 0 và kéo median về 0,91.

Từ UI v4 (C5.1, quyết định Q14) app chỉ gửi ô người dùng nhập, nên gần như mọi giao dịch đều rơi vào
trường hợp này. Cách sửa: chỉ tính tỷ trọng khi **cả kg và lít đều đo thật** (`density_factor` là null),
không dùng giá trị suy ra.

---

## 4. Mô hình đề xuất (4 tầng)

### Tầng 1 — Mô hình vật lý (làm được ngay, giải thích được)

Đầu vào cho mỗi giao dịch:
- `m`: kg trên cân.
- `V`: lít đo độc lập (vạch can), **hoặc** `ρ_obs` đọc trên tỷ trọng kế.
- `T`: nhiệt độ dầu (°C), đo bằng nhiệt kế que.

Công thức:

```
ρ_obs   = m / V                       (hoặc đọc thẳng từ tỷ trọng kế)
ρ_15    = ρ_obs + 0,00064 · (T − 15)  (đưa về 15 °C)
φ_nước  = (ρ_15 − ρ_dầu) / (0,999 − ρ_dầu)      với ρ_dầu = 0,920 (hiệu chỉnh theo dữ liệu thật)
σ_φ     = σ_ρ / (0,999 − ρ_dầu)                  (σ_ρ lấy từ sai số dụng cụ ở mục 2)
```

Kết luận (hàm thuần, có test, không phụ thuộc mạng):

| Kết quả | Điều kiện | Hành động |
|---|---|---|
| ĐẠT | ρ_15 nằm trong [0,905; 0,935] mở rộng thêm 2σ_ρ | Thu bình thường |
| KIỂM TRA | φ_nước − 2σ_φ > 2% (vượt chuẩn MIU), hoặc ρ_15 < 0,905 (nghi dầu khoáng nhẹ) | Bắt buộc chụp ảnh và kiểm tra lớp lắng đáy; tạo cảnh báo cho admin |
| KHÔNG ĐỦ DỮ LIỆU | Chỉ có kg hoặc chỉ có lít, hoặc thiếu nhiệt độ | Không kết luận; không lấy làm mẫu thống kê |

### Tầng 2 — Nền thống kê theo quán (sửa từ code đang có)

- Dùng `ρ_15` (đã hiệu chỉnh nhiệt độ), không dùng `m/V` thô.
- Chỉ lấy mẫu có `volume_source = MEASURED` (lít đo thật) — sửa lỗi ở mục 3.2.
- Giữ robust z-score (median + MAD, ngưỡng 3,5). Thay ngưỡng 20% khi thiếu mẫu bằng dải vật lý của tầng 1.
- Thêm theo dõi xu hướng: tỷ trọng của một quán tăng dần qua nhiều lần thu → dấu hiệu pha nước tăng dần.

### Tầng 3 — Đối soát ở trạm (chính xác hơn, nguồn nhãn)

- Trạm cân tổng và đo thể tích bể. Khối lượng lớn nên sai số tương đối nhỏ; dùng tỷ trọng kế cho mẫu bể.
- Lấy mẫu ngẫu nhiên 5–10% số can, giữ mẫu theo mã can, gửi kiểm nghiệm MIU (độ ẩm bằng sấy hoặc
  Karl Fischer). Kết quả MIU vừa dùng để trừ tiền, vừa là **nhãn đúng/sai** cho tầng 4.
- Thanh toán theo thông lệ ngành: `kg_tính_tiền = kg × (1 − MIU%)` khi MIU vượt 2%.

### Tầng 4 — Mô hình học (chỉ khi đã có nhãn)

- Khi có vài trăm giao dịch có kết quả MIU: hồi quy logistic (dễ giải thích) dự đoán xác suất MIU > 2%.
- Đặc trưng: độ lệch `ρ_15` so với dải chuẩn, robust z theo quán, hạng AI từ ảnh, có/không lớp lắng
  đáy, số lít so với lịch sử, nhiệt độ.
- Chưa có nhãn thì **không** gọi là "AI phát hiện pha loãng"; chỉ hiển thị kết quả tầng 1–3.

---

## 5. Dụng cụ cho người thu gom (chi phí thấp)

| Dụng cụ | Mục đích | Ghi chú |
|---|---|---|
| Cân treo điện tử (đã có) | Đo kg | Nên có độ chia 0,05 kg |
| Tỷ trọng kế thuỷ tinh dải 0,900–0,950 + ống đong | Đo `ρ_obs` | Sai số ±0,001; giá rẻ |
| Nhiệt kế que | Đo T để hiệu chỉnh | Bắt buộc nếu dùng tỷ trọng |
| Ống lấy mẫu đáy trong suốt, hoặc keo dò nước | Thấy lớp nước lắng | Pha nước thường lắng ở đáy, đo mặt trên không thấy |
| Lọ giữ mẫu có dán mã can | Đối chứng khi tranh chấp, kiểm nghiệm ở trạm | |

---

## 6. Ảnh hưởng tới app (nếu duyệt)

| Phần | Thay đổi |
|---|---|
| Màn nhập thu gom (miniapp) | Thêm ô "Tỷ trọng kế (tuỳ chọn)", "Nhiệt độ dầu", câu hỏi "Có lớp nước ở đáy can?". Khi có cả kg và lít đo thật thì gửi cả hai. **Mâu thuẫn với Q14** (chỉ gửi ô người dùng nhập) — cần chủ dự án quyết |
| Cơ sở dữ liệu | Thêm cột `volume_source`, `oil_temperature_c`, `hydrometer_density`, `water_layer_observed`, `density_15c`, `water_fraction_estimate`. Đổi schema Prisma là vùng cấm (S5), cần duyệt |
| API | Hàm thuần tầng 1 trong `apps/api/src/modules/collections/`, có test; sửa lỗi ở mục 3.2 |
| Trạm, admin | Nhập kết quả MIU theo mã can; trừ tiền theo MIU; biểu đồ tỷ trọng theo quán |
| Thanh toán | Tuỳ chọn trừ theo MIU — ảnh hưởng tiền của quán, cần chủ dự án quyết |

---

## 7. Câu hỏi cần chủ dự án quyết

1. Có làm thành giai đoạn riêng (sau I2) không? Hay chỉ sửa lỗi ở mục 3.2 trước, vì sửa lỗi không cần
   đổi schema?
2. Người thu gom có được trang bị tỷ trọng kế, nhiệt kế, ống lấy mẫu đáy không? Không có thì tầng 1 chỉ
   bắt được trường hợp pha rất lộ liễu.
3. Có áp dụng trừ tiền theo MIU ở trạm không? Đây là thay đổi về tiền của quán.
4. Có bỏ quyết định Q14 để màn nhập gửi cả kg và lít khi người thu gom đo cả hai không?
