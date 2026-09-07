# Quy Trình Hoạt Động (Workflow) Toàn Diện Nền Tảng Eco-Oil UCO
## Hệ Thống Quản Lý Chuỗi Cung Ứng Thu Gom Dầu Ăn Đã Qua Sử Dụng

---

## 1. Sơ Đồ Quy Trình Tổng Thể (End-to-End Workflow)

Quy trình vận hành khép kín của nền tảng Eco-Oil kết nối 4 bên tham gia qua 5 giai đoạn nghiệp vụ:

```mermaid
sequenceDiagram
    autonumber
    actor M as Quán ăn (Merchant)
    actor A as Quản trị viên (Admin)
    actor C as Tài xế (Collector)
    actor S as Trạm tiếp nhận (Station)
    participant API as Eco-Oil Backend API
    participant DB as PostgreSQL + PostGIS
    participant IDB as IndexedDB (Offline Storage)

    %% Giai đoạn 1: Onboarding
    rect rgb(240, 248, 255)
    Note over M, A: Giai đoạn 1: Đăng ký & Cấp phát can
    M->>API: 1. Đăng ký tài khoản & địa chỉ quán (GPS, phường)
    API->>DB: Lưu hồ sơ trạng thái PENDING
    A->>API: 2. Phê duyệt quán & gán mã can QR (Container)
    API->>DB: Cập nhật APPROVED, can trạng thái AT_MERCHANT
    end

    %% Giai đoạn 2: Tạo đơn & Lập tuyến
    rect rgb(255, 250, 240)
    Note over M, C: Giai đoạn 2: Báo đơn & Lập tuyến thu gom
    M->>API: 3. Báo can đầy, yêu cầu thu gom (đơn READY)
    API->>DB: Tạo CollectionOrder (READY)
    C->>API: 4. Yêu cầu xem trước lộ trình thu gom (Route Preview)
    API->>DB: Lấy đơn READY theo địa bàn, tính cự ly PostGIS & tối ưu điểm dừng
    C->>API: 5. Bắt đầu ca thu gom (Start Route)
    API->>DB: Tạo CollectionRoute (ACTIVE), khóa các đơn (ASSIGNED)
    end

    %% Giai đoạn 3: Thu gom thực địa & Offline
    rect rgb(240, 255, 240)
    Note over C, IDB: Giai đoạn 3: Thu gom tại quán (Hỗ trợ Offline)
    C->>C: 6. Đến quán, quét mã QR can, cân kg/đo lít, phân hạng A/B/C, chụp ảnh
    C->>IDB: 7. Ghi nhận giao dịch vào IndexedDB (client_uuid, offline-safe)
    IDB-->>API: 8. Tự động đồng bộ batch khi có mạng Internet
    API->>DB: Ghi CollectionTransaction, can chuyển sang IN_TRANSIT, đơn chuyển COLLECTED
    end

    %% Giai đoạn 4: Bàn giao tại trạm
    rect rgb(255, 245, 245)
    Note over C, S: Giai đoạn 4: Bàn giao dầu tại trạm trung chuyển
    C->>API: 9. Chọn trạm gần nhất, nộp danh sách can đã gom trong ca
    S->>API: 10. Trạm cân tổng thực nhận, đối chiếu hao hụt (Station Delivery)
    API->>DB: Tạo StationDelivery, can chuyển sang AT_STATION, cập nhật dung tích bồn trạm
    end

    %% Giai đoạn 5: Đối soát & Thanh toán
    rect rgb(245, 240, 255)
    Note over A, M: Giai đoạn 5: Đối soát & Quyết toán thanh toán
    A->>API: 11. Đối soát hao hụt, kiểm tra cảnh báo bất thường (Anomaly Alerts)
    A->>API: 12. Chốt kỳ quyết toán tuần (ISO Week Batching)
    API->>DB: Tạo Payment cho từng quán theo đơn giá cấu hình
    A->>API: 13. Xác nhận chi trả thành công (PAID)
    M->>API: 14. Quán kiểm tra tiền về trên Zalo Mini App
    end
```

---

## 2. Chi Tiết 5 Giai Đoạn Vận Hành

### Giai đoạn 1: Onboarding & Cấp phát tài nguyên
1. **Quán đăng ký:** Chủ quán mở Zalo Mini App, cấp quyền số điện thoại và vị trí hiện tại. Nhập tên quán, tên người đại diện, số nhà, chọn Phường/Xã phụ trách.
2. **Kiểm tra địa giới:** Hệ thống đối chiếu tọa độ GPS xem có nằm trong vùng phủ sóng thu gom hay không.
3. **Admin xét duyệt:** Admin kiểm tra hồ sơ quán trên trang quản trị. Nếu hợp lệ:
   - Phê duyệt quán (`APPROVED`).
   - Xuất 1 can rỗng từ kho can chưa gán (`UNASSIGNED`), quét mã QR và gán vào quán (`AT_MERCHANT`). Can được vận chuyển đến đặt tại quán.

---

### Giai đoạn 2: Phát sinh yêu cầu & Lập tuyến thu gom
1. **Quán báo đơn:** Khi lượng dầu chiên tích trữ gần đầy can, quán mở app bấm **"Yêu cầu thu gom"**, nhập số lít ước tính. Đơn hàng chuyển sang trạng thái `READY`.
2. **Lập tuyến (Route Planning):** 
   - Tài xế (Collector) mở ca làm việc trên app. Hệ thống truy vấn toàn bộ các đơn `READY` thuộc các phường mà tài xế được chỉ định.
   - Thuật toán AI Heuristic xếp lịch tuyến đường:
     - Lọc các quán có độ ưu tiên cao (can đầy, chờ nhiều ngày).
     - Kiểm tra tổng dung tích dự báo so với tải trọng thùng xe (chặn quá tải xe).
     - Sắp xếp thứ tự các điểm dừng theo lộ trình ngắn nhất.
3. **Bắt đầu ca (`Start Route`):** Collector bấm "Bắt đầu ca thu gom". Hệ thống chạy transaction khóa các đơn hàng sang `ASSIGNED`, ngăn không cho collector khác nhận trùng.

---

### Giai đoạn 3: Thu gom hiện trường & Đồng bộ ngoại tuyến (Offline-First)
1. **Tại hiện trường:** Collector đến quán, thực hiện quy trình kiểm định 4 bước:
   - **Quét QR:** Quét mã QR in trên thân can để đảm bảo lấy đúng can đã đăng ký của quán.
   - **Cân / Đo:** Đặt can lên cân điện tử lấy số kg (hoặc đo theo vạch lít). Hệ thống tự quy đổi tương ứng với hệ số tỷ trọng $0.91 \text{ kg/lít}$.
   - **Phân hạng chất lượng:** Chụp ảnh dầu. Module heuristic phân tích màu sắc, độ trong, cặn lắng để gợi ý hạng A/B/C. Collector xác nhận hạng dầu và đánh dấu nếu nghi ngờ có pha nước hoặc mỡ bẩn.
   - **Chụp ảnh bằng chứng & Lưu vị trí:** Chụp can dầu tại hiện trường (nén trực tiếp về 1280px) và lấy tọa độ GPS của điện thoại.
2. **Lưu trữ Offline (IndexedDB):**
   - Dữ liệu thu gom được lưu ngay lập tức vào cơ sở dữ liệu IndexedDB trên thiết bị người dùng với trạng thái `sync_status: 'pending'`.
   - Mỗi giao dịch được gán một mã `client_uuid` duy nhất. Tài xế có thể tiếp tục thu gom các quán tiếp theo dù mất sóng hoàn toàn.
3. **Đồng bộ tự động (Outbox Sync):**
   - Ngay khi máy có kết nối Internet trở lại (hoặc qua chu kỳ kiểm tra 30 giây), tiến trình đồng bộ ngầm gửi dữ liệu theo batch lên `/api/v1/sync/batch`.
   - Backend sử dụng câu lệnh `INSERT ... ON CONFLICT (client_uuid) DO NOTHING` để đảm bảo dù gửi lại nhiều lần cũng không bị trùng lặp giao dịch (Idempotency).
   - Sau khi ghi nhận thành công: Đơn hàng chuyển sang `COLLECTED`, can dầu chuyển sang trạng thái đang vận chuyển trên đường (`IN_TRANSIT`).

---

### Giai đoạn 4: Bàn giao tại trạm trung chuyển (Station Delivery)
1. **Chọn trạm bàn giao:** Kết thúc ca gom, collector mở danh sách trạm được hệ thống gợi ý (dựa trên khoảng cách gần nhất và dung tích bồn còn trống).
2. **Nộp can & Bàn giao:** 
   - Collector chọn các giao dịch đã thu gom trong ca muốn nộp vào trạm.
   - Trưởng trạm tiếp nhận các can dầu, đưa lên cân tổng của trạm để ghi nhận khối lượng thực tế nhập bồn.
3. **Kiểm tra sai lệch (Variance Check):**
   - Hệ thống tính độ sai lệch giữa tổng số đo collector gom tại các quán so với số đo thực tế trạm cân:
     $$\Delta = |\text{Tổng gom lẻ} - \text{Tổng trạm nhận}|$$
   - Nếu sai lệch vượt ngưỡng $2\%$, hệ thống tự động sinh cảnh báo `DELIVERY_VARIANCE_WARNING` để Admin vào điều tra (nghi ngờ rơi vãi hoặc tài xế bớt xén).
4. **Cập nhật kho:** Các can dầu chuyển sang trạng thái lưu kho trạm (`AT_STATION`), bồn trạm tăng thể tích lưu trữ tương ứng. Can rỗng sạch được bàn giao lại cho collector để luân chuyển vòng tiếp theo.

---

### Giai đoạn 5: Giám sát, Đối soát & Thanh toán
1. **Phát hiện bất thường (Anomaly Detection):**
   - Hệ thống chạy thuật toán Robust Z-Score quét toàn bộ giao dịch mới:
     - Phát hiện tỷ trọng dầu bất thường (dấu hiệu pha nước hoặc tạp chất).
     - Phát hiện tọa độ thu gom lệch quá 500m so với tọa độ đăng ký của quán (nghi gom dầu trôi nổi bên ngoài rồi ghi nhận vào quán).
   - Admin xem xét các cảnh báo và xác nhận phản hồi (`CONFIRMED_ANOMALY` hoặc `FALSE_POSITIVE`).
2. **Đối soát giao dịch (Reconciliation):**
   - Bộ phận vận hành so khớp giữa dữ liệu thu gom lẻ và phiếu giao trạm.
   - Xuất file báo cáo tổng hợp (CSV) phục vụ kiểm toán và tính thuế/chứng chỉ xanh.
3. **Lập bảng thanh toán (Weekly Payment Settlement):**
   - Định kỳ hàng tuần (theo chuẩn ISO Week), hệ thống quét toàn bộ các giao dịch hợp lệ đạt chuẩn (`PASS`).
   - Áp dụng biểu giá dầu đang có hiệu lực theo thời gian để tính số tiền chi trả cho từng quán ăn:
     $$\text{Thành tiền} = \text{Số lượng (lít/kg)} \times \text{Đơn giá}$$
   - Tạo phiếu thanh toán `Payment` ở trạng thái `PENDING`.
4. **Chi trả & Hoàn tất:** Kế toán chuyển khoản cho quán và chuyển trạng thái sang `PAID`. Chủ quán nhận được thông báo chi tiết trên Zalo Mini App.

---

## 3. Sơ Đồ Chuyển Đổi Trạng Thái Các Thực Thể (State Machines)

### 3.1. Vòng đời Can Dầu (`ContainerState`)
Vòng đời can dầu là mắt xích cốt lõi để bảo đảm tính truy xuất nguồn gốc:

```mermaid
stateDiagram-v2
    [*] --> UNASSIGNED: Tạo mã can mới trong kho
    UNASSIGNED --> AT_MERCHANT: Admin duyệt quán & gán can
    AT_MERCHANT --> IN_TRANSIT: Collector quét QR & thu gom thành công
    IN_TRANSIT --> AT_STATION: Bàn giao can đầy tại trạm tiếp nhận
    AT_STATION --> AT_MERCHANT: Can được súc rửa & chuyển lại cho quán
    AT_STATION --> MAINTENANCE: Can bị nứt, hỏng van, mờ QR
    MAINTENANCE --> AT_STATION: Sửa chữa & dán lại mã QR
    MAINTENANCE --> RETIRED: Hủy can không thể tái sử dụng
    RETIRED --> [*]
```

---

### 3.2. Vòng đời Đơn Thu Gom (`OrderStatus`)

```mermaid
stateDiagram-v2
    [*] --> READY: Quán bấm báo can đầy
    READY --> ASSIGNED: Collector nhận đơn vào tuyến thu gom
    READY --> CANCELLED: Quán chủ động hủy đơn khi chưa ai nhận
    ASSIGNED --> READY: Collector hủy tuyến (chưa lấy hàng)
    ASSIGNED --> COLLECTED: Collector hoàn tất thu gom tại quán
    COLLECTED --> [*]
```

---

### 3.3. Vòng đời Ca Thu Gom (`RouteStatus`)

```mermaid
stateDiagram-v2
    [*] --> PREVIEW: Hệ thống đề xuất danh sách điểm dừng
    PREVIEW --> ACTIVE: Collector xác nhận bắt đầu ca
    ACTIVE --> COMPLETED: Đã hoàn tất gom tại tất cả các điểm dừng
    ACTIVE --> CANCELLED: Collector hủy ca (chỉ được phép khi chưa gom điểm nào)
    COMPLETED --> [*]
```

---

### 3.4. Vòng đời Thanh Toán (`PaymentStatus`)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Chốt kỳ tuần, tạo phiếu chi tự động
    PENDING --> PAID: Kế toán hoàn tất chuyển tiền cho quán
    PENDING --> CANCELLED: Hủy phiếu do phát hiện gian lận sau đối soát
    PAID --> [*]
```

---

## 4. Các Cơ Chế An Toàn & Toàn Vẹn Dữ Liệu

| Cơ chế kỹ thuật | Vấn đề giải quyết | Cách thức thực thi trong mã nguồn |
|---|---|---|
| **Idempotency qua `client_uuid`** | Mất mạng làm tài xế bấm gửi nhiều lần dẫn đến ghi nhận trùng 2 lần tiền/dầu | Mỗi bản ghi sinh UUIDv4 từ client. Backend dùng `ON CONFLICT (client_uuid) DO NOTHING`. |
| **Khóa bi quan (`FOR UPDATE`)** | Hai collector cùng nhận 1 đơn hàng hoặc giao trạm cùng lúc | Sử dụng `prisma.$queryRaw` với `SELECT ... FOR UPDATE` trong transaction khi tạo ca và nộp trạm. |
| **Offline-first Outbox** | Vùng lõm sóng di động tại các ngõ hẻm hoặc tầng hầm nhà hàng | Toàn bộ payload lưu vào Dexie.js (IndexedDB). Background worker retry lũy tiến có jitter. |
| **Xác thực mã hóa Zalo OAuth v4** | Tránh tấn công giả mạo danh tính (CSRF, Man-in-the-middle) | Sử dụng chuẩn PKCE (`code_challenge`) kết hợp state mã hóa thuật toán quân sự `AES-256-GCM`. |
| **Cảnh báo lệch GPS** | Thu gom dầu trôi nổi không rõ nguồn gốc | Đo khoảng cách PostGIS (`ST_Distance`) giữa tọa độ lúc quét QR và tọa độ quán, ngưỡng cảnh báo 500m. |
| **Giám sát tồn bồn quá hạn** | Dầu lưu kho lâu ngày bị tăng chỉ số axit (FFA), hỏng chất lượng | Tự động tính `storageAgeDays` dựa vào mẻ dầu đầu tiên nhập trạm, cảnh báo sau 10 và 14 ngày. |
