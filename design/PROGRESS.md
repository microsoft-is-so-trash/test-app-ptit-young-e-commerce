# EcoOil UI Snapshot — Progress & Handoff Log

> File nay la diem dong bo DUY NHAT giua cac agent (Claude/Cowork, Opus 4.6 tren Antigravity, hoac agent khac sau nay) cung lam nhiem vu "dung file thiet ke UI that tu source code that". BAT BUOC doc file nay TRUOC khi bat dau bat ky phien nao. Cap nhat file nay SAU khi hoan tat 1 section/frame hoac truoc khi ket thuc phien, roi commit vao git.
> Nguon su that ve NOI DUNG THIET KE la chinh file Figma/Penpot dang chay — file log nay chi la con tro/tom tat de ban giao. Neu log va file thiet ke that lech nhau, tin file thiet ke that va sua lai log nay cho khop.

## Ban chinh hien tai (source of truth)
- Backend dang duoc de xuat: **CHUA CHOT DUT DIEM** — xem "Ghi chu 2026-09-17" ben duoi truoc khi chon.
- Figma: file "EcoOil-UI-Demo", fileKey `vLd5vfZup8uf66O4aJGEqf`, URL https://www.figma.com/design/vLd5vfZup8uf66O4aJGEqf/EcoOil-UI-Demo
- Penpot: MCP server (`mcp__Penpot__*`) vua duoc noi trong phien 2026-09-17, CHUA tao file/noi dung nao. Can chay `high_level_overview` truoc khi dung bat ky tool Penpot nao khac.

## Agent thuc thi duoc chi dinh
- Tu 2026-09-17: TOAN BO qua trinh thuc thi (dung UI that vao file thiet ke, tren ca Figma lan Penpot) duoc giao cho **Opus 4.6 chay trong Antigravity IDE/CLI**, khong con la Claude/Cowork nua.
- Vai tro cua Claude/Cowork ke tu day: dieu phoi/duy tri file nay + kiem tra tinh kha thi ky thuat khi duoc hoi, KHONG tu y ghi vao file thiet ke (khong tu nhan khoa phien o muc duoi) tru khi nguoi dung doi lai quyet dinh nay va cap nhat lai dong nay.
- Phuong an du phong dang can nhac them: Gemini 3.8 Flash (high effort) tren Antigravity — xem danh gia kha thi rieng ngoai file nay (chua chot dung, ghi trong chat voi nguoi dung 2026-09-17). Neu doi executor, cap nhat lai dong tren.

## Khoa phien (tranh 2 agent ghi de nhau)
- Dang co agent nao giu khoa khong: KHONG
- Quy uoc: agent nao chuan bi goi lenh GHI (use_figma / execute_code) phai sua dong tren thanh "CO — <ten agent/model> — bat dau <ISO timestamp>", va xoa/ghi lai thanh KHONG khi xong hoac ban giao. Neu thay dang la CO va agent do da im lang qua lau (vd qua 1 gio), agent moi duoc nhan khoa nhung phai ghi ro trong nhat ky ben duoi la da nhan khoa "mo".

## Checklist theo scope (khop <kiem_kho_man_hinh> trong prompt goc)

### Web Admin (13 route — apps/admin/src/app/*/page.tsx)
- [~] / (Dashboard) — da lam: PageHeader, 4 KPI card, bieu do 14 ngay. CON THIEU: bang "10 giao dich gan nhat" (9 cot) va bang "Quan trong khu vuc" (3 cot) — DU LIEU THAT DA DOI CHIEU XONG tu demo-dataset.ts/demo-admin-overview.ts/demo-admin-ai.ts/demo-admin-store.ts, san sang nhap ngay, chi con thieu luot goi tool.
- [ ] /login
- [ ] /merchants
- [ ] /collectors
- [ ] /stations
- [ ] /containers
- [ ] /approvals
- [ ] /payments
- [ ] /reconciliation
- [ ] /operations-map (Leaflet — can chien luoc rieng, xem rao_chan trong prompt)
- [ ] /alerts
- [ ] /ai-performance
- [ ] /wards

### Miniapp — Merchant (apps/miniapp/src/pages/*.tsx)
- [ ] LoginScreen
- [ ] HomePage
- [ ] OrdersPage
- [ ] HistoryPage
- [ ] GreenJourneyPage
- [ ] PaymentsPage
- [ ] AccountPage
- [ ] OrderSheet
- [ ] RequestContainerSheet
- [ ] EditMerchantInfoSheet
- [ ] MockPaymentQr
- [ ] MerchantApprovalView

### Miniapp — Collector (apps/miniapp/src/pages/collector/*.tsx + StationDeliveryFlow.tsx)
- [ ] CollectorShell
- [ ] CollectorEntryScreen
- [ ] CollectorQrScreen
- [ ] CollectorRouteScreen
- [ ] CollectorSchedulePage
- [ ] CollectorStatsPage
- [ ] CollectorSummaryScreen
- [ ] CollectorAccountPage
- [ ] OutboxQueueScreen
- [ ] SavedStationReceiptView
- [ ] StationSelectScreen
- [ ] StationDeliveryReview
- [ ] StationDeliveryReceipt
- [ ] ShiftCloseout

Ky hieu: [ ] chua lam · [~] dang lam do · [x] xong, da doi chieu screenshot voi source that

## Nhat ky ban giao (moi nhat len tren)

### 2026-09-17 (cap nhat 2) — Claude Sonnet 5 (Cowork)
- Quyet dinh: giao toan bo viec thuc thi con lai (tat ca route/man con thieu trong checklist ben tren) cho Opus 4.6 chay trong Antigravity IDE/CLI, ly do: giam rui ro het token/quota giua chung o 1 agent duy nhat, va Antigravity da xac nhan ho tro noi MCP server truc tiep (bao gom Penpot MCP) nen co the doc/ghi thang vao dung file thiet ke dang la ban chinh o tren.
- Da danh gia (ngoai prompt, khong dua vao day): tinh kha thi dung Gemini 3.8 Flash (high effort) lam phuong an thay the/du phong cho Opus 4.6 — ket luan: kha thi ky thuat (co tool-use, effort level, context 1M token) nhung diem benchmark agentic/computer-use thap hon Opus kha nhieu (Terminal-bench 4.0: 19.1% vs 51.8%; OSWorld-2.0: 59.0% vs 75.4%), cong voi do tre phan hoi cao va ton nhieu token hon o muc effort cao — de gay loi lap/sai sot voi cac API co nhieu "gotcha" nhu Figma/Penpot Plugin API da tung gap trong phien nay. Khuyen nghi: dung Opus 4.6 lam chinh, Gemini 3.8 Flash chi la lua chon du phong hang 2 neu Opus khong kha dung.
- Chua dung vao file thiet ke trong lan cap nhat nay (chi sua PROGRESS.md).

### 2026-09-17 — Claude Sonnet 5 (Cowork)
- Da lam: tao file Figma "EcoOil-UI-Demo", Variables "Admin / M3" (30 mau + 2 radius), 2 Effect Style (m3-1, m3-2), 6 Text Style, component AdminSidebar (id 10:10) va AdminHeader (id 12:2), frame Dashboard (id 12:12) voi PageHeader + 4 KpiCard + bieu do 14 ngay (da doi chieu screenshot khop voi localhost that).
- Dang dang do: da THU gop toan bo file ve 1 page duy nhat (Section "Web Admin" + Section "Cover & Ghi chu pham vi") theo yeu cau cua nguoi dung, nhung script bi CHANH GIUA CHUNG boi loi rate limit cua Figma MCP (Starter plan) — CHUA XAC NHAN duoc script da chay xong hay chua. Viec dau tien cua phien sau la goi get_metadata/use_figma read-only de kiem tra lai cau truc page/section that su tren Figma truoc khi lam tiep, KHONG duoc gia dinh la da gop xong.
- Blocker: Figma MCP tren team "Pham Gia Khanh's team" (plan Starter) bi chan quota tool-call nhieu lan trong ngay 15–17/9 ("You've reached the Figma MCP tool call limit on the Starter plan"), khong on dinh — co luc goi duoc 1-2 lenh roi lai bi chan.
- Da lam thu Penpot: nguoi dung da tu ket noi Penpot MCP server (custom connector) vao phien Cowork. Chua build noi dung gi ben Penpot.
- Viec tiep theo nen lam: (1) xac minh trang thai Section tren Figma bang lenh read-only; (2) neu Figma van bi chan, uu tien chuyen sang build tiep tren Penpot (khong bi gioi han quota) thay vi cho Figma; (3) hoan tat 2 bang con thieu cua Dashboard bang du lieu that da co san trong log nay; (4) sau moi section hoan tat, xuat SVG snapshot theo huong dan <phuong_an_du_phong_va_dong_bo> trong prompt va cap nhat lai file nay.
- Snapshot SVG da xuat: chua co (chua thuc hien buoc export nao trong phien nay).
