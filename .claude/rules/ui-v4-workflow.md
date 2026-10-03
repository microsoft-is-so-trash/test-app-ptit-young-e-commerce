# Quy trình tự thực thi kế hoạch UI v4

File này biến kế hoạch `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` thành quy trình agent tự chạy được. Đọc
xong file này là đủ để bắt đầu; không cần chờ người dùng giải thích thêm.

**Áp dụng khi:** người dùng gọi `/ui-v4`, hoặc yêu cầu làm/tiếp tục kế hoạch UI v4, hoặc yêu cầu
làm một task có mã M*, C*, I1*, I2*, I3*. Việc khác trong repo không áp dụng file này.

## 1. Tài liệu và thứ tự ưu tiên

Đọc theo thứ tự ở đầu mỗi phiên:

1. `docs/TIEN_DO_UI_V4.md`: **trạng thái duy nhất** của công việc (task nào xong, đang làm gì,
   câu hỏi đang mở, quyết định đã có).
2. `docs/KE_HOACH_CHUAN_HOA_UI_V4.md`: task, file, tiêu chí nghiệm thu.
3. `.claude/rules/ui-non-fiction.md` (U1–U13) và `.claude/rules/external-apis.md` (E1–E7).
4. Tài liệu nghiên cứu: `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md`,
   `docs/NGHIEN_CUU_TTS_GOOGLE.md`. Chỉ đọc mục cần cho task đang làm.

Khi các nguồn mâu thuẫn, nguồn đứng trước thắng: (a) câu trả lời của chủ dự án trong chat và mục
"Quyết định" của file tiến độ → (b) kế hoạch → (c) quy tắc U/E → (d) tài liệu nghiên cứu → (e) quy
tắc chung ECC (`.claude/AGENTS.md`, `.claude/rules/ecc/`). Mâu thuẫn giữa (a)–(d) với nhau thì
**dừng hỏi** (điều kiện S2), không tự chọn.

Riêng cho kế hoạch này, các quy tắc ECC sau được thay thế:

- Không tạo tài liệu PRD/architecture riêng: kế hoạch đã là tài liệu đó.
- Không tự gửi báo cáo tiến độ giữa chừng (xem mục 5).
- Không tự mở rộng phạm vi: thấy vấn đề ngoài kế hoạch thì ghi vào mục "Phát hiện ngoài phạm vi"
  của file tiến độ, không sửa.
- Dùng tác tử phụ đúng theo Society Charter (mục 2 của kế hoạch): chỉ một luồng ghi; không áp dụng
  "ALWAYS parallel", không tự gọi planner/architect/tdd-guide, không chạy phân tích 5 vai.

## 2. Vòng lặp thực thi

Lặp lại các bước dưới đây cho tới khi gặp điều kiện dừng (mục 3) hoặc hết giai đoạn.

### B0. Kiểm tra môi trường (đầu mỗi phiên)

- Có `git`, `node`, `pnpm` trong PATH. Máy của chủ dự án chạy agent trong container không cài sẵn
  `git`/`node`; trước mọi lệnh shell, thêm vào đầu lệnh:

  ```bash
  export PATH=$HOME/.local/share/agent-tools/bin:$HOME/.local/share/pnpm/bin:$PATH
  ```

  (`agent-tools/bin/git` gọi git của máy host; `pnpm/bin/node` là Node 22 cài bằng
  `pnpm env use --global 22`). Vẫn thiếu công cụ → dừng hỏi (S9).
- Chưa có `node_modules` hoặc `pnpm-lock.yaml` mới hơn lần cài trước → chạy `pnpm install`.
- Branch hiện tại là `ui_version_4`. Nếu branch chưa tồn tại: tạo từ `ui_version_3`
  (`git switch -c ui_version_4 ui_version_3`) và ghi vào nhật ký. Nếu đang ở branch khác có thay
  đổi chưa commit → dừng hỏi (S9).
- Working tree sạch, hoặc chỉ có thay đổi của task đang làm dở ghi trong file tiến độ. Có thay đổi
  lạ không rõ nguồn → dừng hỏi (S9).
- Đối chiếu `git log --oneline -20` với bảng task trong file tiến độ. Lệch (task đánh dấu xong mà
  không có commit, hoặc ngược lại) → sửa lại file tiến độ theo git nếu xác định chắc chắn được bằng
  cách đọc code; không chắc → dừng hỏi (S9).

### B1. Chọn việc

- Làm theo thứ tự giai đoạn M → C → I1 → I2 → I3. Không bắt đầu giai đoạn mới khi giai đoạn trước
  chưa được chủ dự án duyệt (ghi trong mục "Quyết định").
- Trong giai đoạn, chọn task đầu tiên trong bảng có trạng thái `chưa làm` hoặc `đang làm` và
  **không** bị chặn bởi câu hỏi đang mở. Task bị chặn thì bỏ qua, làm task kế tiếp không phụ thuộc
  nó. Nếu mọi task còn lại đều bị chặn → gửi câu hỏi (mục 4) và dừng.

### B2. Rà soát đầu giai đoạn (chỉ làm 1 lần, khi bắt đầu một giai đoạn)

Mục tiêu: gom mọi điểm chưa rõ của cả giai đoạn vào **một** lần hỏi, thay vì hỏi rải rác.

1. Đọc toàn bộ task của giai đoạn trong kế hoạch.
2. Với mỗi task: mở các file được nêu, xác nhận dòng/hàm/component được nhắc tới còn tồn tại và
   khớp mô tả; liệt kê những gì sẽ thay đổi. Nếu bảng 2.4 của kế hoạch cho phép rà soát song song
   (hiện chỉ I2): gọi tối đa 3 agent `Explore` (model sonnet), mỗi agent một nhánh, theo mẫu brief ở
   trường 4 của Society Charter (mục 2.3 của kế hoạch). Kiểm `git status` trước và sau như ở B6.
   Tác tử chính kiểm lại mọi file:dòng mà agent báo trước khi dùng để đặt câu hỏi.
3. Đánh dấu mọi điểm thuộc danh sách S1–S14. Ghi tất cả vào mục "Câu hỏi đang mở" của file tiến độ.
4. Có câu hỏi → gửi một tin nhắn gom tất cả câu hỏi (mục 4) rồi dừng. Không có → bắt đầu B3.

### B3. Thực hiện task

1. Đổi trạng thái task thành `đang làm` trong file tiến độ.
2. Phân loại: nhóm A (thuần trình bày: CSS/markup) hay nhóm B (đổi tương tác, state, tính năng).
   Phân loại khác với kế hoạch → dừng hỏi (S2).
3. Nhóm B: viết test trước, chạy và thấy **FAIL** (RED). Logic mới tách thành hàm thuần trong
   `src/lib/`, test bằng `node:test`, thêm file test vào script `test` của
   `apps/miniapp/package.json`. Sau đó sửa code cho tới khi test **PASS** (GREEN).
   **Bằng chứng RED:** ghi vào cột "Ghi chú" tên test và dòng FAIL thấy được trước khi sửa code.
   Không có dòng này thì task chưa xong.
4. Tuân theo U1–U13, E1–E7 cho mọi phần tử mới hoặc phần tử thật đang sửa. Phần giả và dataset
   demo: giữ nguyên chữ và hành vi, đặt lại vào vị trí mới khi tái cấu trúc.
5. Chỉ sửa đúng phạm vi task. Không "tiện tay" sửa chỗ khác.

### B4. Cổng kiểm tra

Chạy ở gốc repo, tất cả phải pass:

```bash
pnpm --filter @eco-oil/miniapp typecheck
pnpm --filter @eco-oil/miniapp lint
pnpm --filter @eco-oil/miniapp test
pnpm --filter @eco-oil/miniapp build
git diff --stat HEAD
```

- Task có sửa `apps/api`: chạy thêm `pnpm --filter @eco-oil/api typecheck`, `lint`, `test`.
  Task có sửa `apps/admin`: chạy thêm lệnh tương ứng của `@eco-oil/admin`.
- Lỗi do chính thay đổi của task: tự sửa, tối đa **2 vòng**. Vẫn lỗi → dừng hỏi (S7).
- Lỗi đã có từ trước (lỗi cả khi stash thay đổi của task) → dừng hỏi (S7), không tự sửa.
- `git diff --stat` lệch xa kỳ vọng (file ngoài phạm vi bị sửa, số dòng lớn bất thường) → dừng
  điều tra; không giải thích được → dừng hỏi (S8).

### B5. Kiểm tra trực quan (mọi task có đổi giao diện)

- Chạy miniapp với `VITE_DEMO_MODE=true VITE_DEMO_OFFLINE=true`, chụp màn hình khung 375×812
  trước và sau khi sửa. Repo không có Playwright; dùng một trong hai cách:
  - Màn mở được bằng URL: `google-chrome --headless --window-size=375,812 --screenshot=<file> <url>`.
  - Màn cần thao tác (bấm, nhập): trình duyệt có sẵn trong phiên (browser pane), chỉnh khung 375×812,
    chụp và ghi rõ các bước thao tác vào cột "Ghi chú" của task.
- Chạy app bằng `preview_start` với cấu hình `eco-oil-miniapp-demo` trong `.claude/launch.json`
  (đã bật sẵn hai cờ demo). Ảnh chụp từ browser pane được lưu thành file `.jpg` trong thư mục
  `tool-results` của phiên; chép file đó vào repo. Browser pane chụp chậm một nhịp sau khi bấm:
  chụp lại lần nữa nếu ảnh vẫn là màn trước.
- Lưu ảnh vào `design/snapshots/ui-v4/<mã task hoặc giai đoạn>/` (ví dụ `M-before/`, `M-after/`).
- Xem ảnh và đối chiếu tiêu chí nghiệm thu của task. Chưa nhìn thấy kết quả thì chưa coi là xong.
- Không chạy được app hoặc không chụp được ảnh → dừng hỏi (S9).

### B6. Tự rà soát trước khi commit

Đi qua checklist và ghi kết quả ngắn vào cột "Ghi chú" của task:

- [ ] Đạt tiêu chí nghiệm thu trong kế hoạch.
- [ ] Không vi phạm U1–U13 / E1–E7; không thêm phần giả mới; phần giả cũ vẫn đúng chữ.
- [ ] Không có `console.log` gỡ lỗi, không có key/secret, không có `window.confirm` mới.
- [ ] Không sửa vùng cấm (mục 6).
- Review bằng tác tử phụ theo bảng 2.4 và Society Charter (mục 2 của kế hoạch):
  - `security-reviewer`: bắt buộc với task chạm key, endpoint gọi API trả phí, xác thực hoặc rate
    limit (I1.2, I2.1, và I1.1 nếu gọi Places qua backend).
  - `code-reviewer`: một lần cuối giai đoạn trên toàn bộ diff của giai đoạn (trước B8), hoặc sau
    task lớn nếu bảng 2.4 ghi.
  - Hai reviewer chạy song song, ở chế độ nền. Brief theo mẫu trường 4; chỉ gửi khoảng commit và
    quy tắc, không gửi lập luận của tác tử chính.
  - Trần: tối đa 12 lần gọi tác tử phụ mỗi giai đoạn, mỗi vai không quá 3 lần (trường 9).
- **Kiểm chỉ đọc:** lưu `git status --porcelain` và `git diff --stat` ngay trước khi gọi, so lại
  sau khi tác tử phụ trả kết quả. Khác nhau → dừng hỏi (S8), không tự xoá thay đổi.
- Phân xử: test/lệnh tái lập được > file:dòng > kế hoạch và U/E > ý kiến reviewer. Vấn đề
  CRITICAL/HIGH phải sửa (vẫn tính trong giới hạn 2 vòng của B4), hoặc chứng minh là báo nhầm bằng
  test hay file:dòng. Muốn bỏ qua mà không chứng minh được → dừng hỏi (S7).
- Mỗi lần gọi ghi 1 dòng nhật ký: `conv_id — vai — đầu vào — kết quả (số lỗi theo mức) — xử lý`.
  Lỗi của chính tác tử phụ gắn nhãn MAST: FM1 (thiết kế/brief), FM2 (lệch pha: làm ngoài brief,
  ghi file), FM3 (kiểm chứng: bỏ sót, kết luận không có bằng chứng).

### B7. Commit và ghi tiến độ

- Mỗi task một commit, dạng `<type>: <mô tả> (<mã task>)`, type thuộc feat/fix/refactor/docs/test/chore.
  Không dùng `--no-verify`, không `--amend` commit đã push, không force push.
- `git push origin ui_version_4` (đã được chủ dự án cho phép trong kế hoạch). Push lỗi → dừng hỏi (S9).
- Cập nhật file tiến độ: trạng thái `xong`, mã commit, ghi chú (kết quả B6, đường dẫn ảnh B5).
  Commit file tiến độ cùng commit của task.
- **Không nhắn gì cho người dùng.** Quay lại B1.

### B8. Kết thúc giai đoạn

Khi mọi task của giai đoạn đã `xong` (hoặc `bị chặn` với câu hỏi đã gửi):

1. Chụp màn hình trước/sau toàn bộ các màn của giai đoạn.
2. Gọi agent `ui-v4-verifier` (kiểm chỉ đọc như ở B6). Brief gồm: tiêu chí nghiệm thu của từng
   task trích nguyên văn từ kế hoạch, khoảng commit của giai đoạn, đường dẫn ảnh, danh sách lệnh
   cổng kiểm tra. Không gửi ghi chú hay lập luận của tác tử chính.
   - Tiêu chí "không đạt": sửa (tính trong giới hạn 2 vòng) rồi chạy verifier lại tối đa 1 lần.
     Vẫn không đạt, hoặc tác tử chính không đồng ý → ghi cả hai lập luận vào báo cáo, chủ dự án
     quyết. Không tranh luận nhiều vòng.
   - "Chưa đủ bằng chứng" (ví dụ cần máy thật): ghi nguyên vào báo cáo.
3. Ghi mục "Báo cáo giai đoạn" vào file tiến độ, kèm kết quả verifier và số lần gọi từng vai tác
   tử phụ (số liệu pilot, mục 2.5 của kế hoạch).
4. Gửi báo cáo giai đoạn (mục 5) và **dừng**, chờ chủ dự án duyệt.

## 3. Điều kiện bắt buộc dừng và hỏi

Gặp **bất kỳ** điều kiện nào dưới đây thì dừng ngay, không làm tiếp task đó, không đoán:

| Mã | Khi nào |
|---|---|
| S1 | Kế hoạch có nhiều cách hiểu hoặc đưa ra nhiều phương án mà chưa chọn (ví dụ "A hoặc B") |
| S2 | Các tài liệu mâu thuẫn nhau, hoặc mâu thuẫn với code hiện tại (file/dòng/hàm không còn như mô tả) |
| S3 | Cần một con số, hằng số nghiệp vụ, câu chữ hiển thị, tên giọng/model, giá… mà tài liệu không ghi |
| S4 | Không tìm được chỗ đặt hợp lý cho phần giả hiện có khi tái cấu trúc, hoặc phải đổi chữ/hành vi của nó |
| S5 | Cần sửa vùng cấm (mục 6), thêm thư viện mới, đổi schema dữ liệu (Prisma hoặc version Dexie), hoặc thêm biến môi trường chưa có trong kế hoạch |
| S6 | Task cần làm thứ ngoài phạm vi kế hoạch để đạt tiêu chí nghiệm thu |
| S7 | Cổng kiểm tra vẫn lỗi sau 2 vòng tự sửa; lỗi có từ trước; muốn sửa/xoá/bỏ qua một test có sẵn; muốn bỏ qua vấn đề CRITICAL/HIGH |
| S8 | Diff lệch xa kỳ vọng mà không giải thích được |
| S9 | Môi trường không đủ: thiếu công cụ, sai branch, có thay đổi lạ, không chạy được app/chụp ảnh, push lỗi, thiếu key/tài khoản |
| S10 | Hành động khó đảo ngược hoặc ra bên ngoài mà kế hoạch chưa cho phép (xoá dữ liệu, force push, đổi cấu hình Zalo/Google Cloud/Render, gửi tin nhắn) |
| S11 | Cần quyết định UX mà U1–U13 không trả lời được (vị trí nút, mặc định bật/tắt, câu chữ mới) |
| S12 | API bên ngoài hoạt động khác tài liệu nghiên cứu, hoặc cần số liệu chưa xác minh (đánh dấu ⚠️ hoặc "chưa xác minh") để ra quyết định |
| S13 | Sắp chuyển sang giai đoạn mới mà chưa có duyệt của chủ dự án |
| S14 | Bất kỳ chỗ nào agent không chắc chắn đúng ý chủ dự án. **Khi phân vân giữa hỏi và tự làm: hỏi** |
| S15 | Bước nào có dấu hiệu làm phát sinh phí Google Maps API hoặc Google AI API (vượt hoặc có thể vượt mức miễn phí, SKU không có mức miễn phí, giá chưa xác minh). Câu hỏi phải kèm phương án thay thế không mất phí mà vẫn giữ ổn định (quyết định 03/10/2026) |

Không được:

- Chọn "tạm" một phương án rồi để sửa sau.
- Tạo dữ liệu, con số, câu chữ để lấp chỗ trống.
- Tắt, xoá, `skip` test hoặc lint rule để qua cổng kiểm tra.
- Trong lúc chờ trả lời, tự làm các task khác của giai đoạn khi đã gửi câu hỏi. Gửi câu hỏi là
  kết thúc lượt làm việc.

## 4. Cách hỏi

1. Ghi câu hỏi vào mục "Câu hỏi đang mở" của file tiến độ (mã câu hỏi, task bị chặn, ngày).
2. Gửi **một** tin nhắn gom mọi câu hỏi đang có, theo mẫu:

```
⛔ Cần anh/chị trả lời để làm tiếp (giai đoạn <X>, task <mã>)

Q<n>. <câu hỏi một dòng>
  - Lý do dừng: <mã S> — <đã kiểm tra gì, thấy gì; dẫn file:dòng>
  - Lựa chọn:
    a) <phương án đề xuất> (đề xuất) — <hệ quả>
    b) <phương án khác> — <hệ quả>
  - Ảnh hưởng nếu chưa trả lời: <task nào bị chặn>

Trả lời theo dạng "Q1: a, Q2: b …" rồi gọi lại /ui-v4.
```

3. Kết thúc lượt làm việc.

Khi nhận được câu trả lời: chuyển câu hỏi sang mục "Quyết định" (ghi ngày, nội dung chọn), cập
nhật kế hoạch nếu câu trả lời thay đổi kế hoạch, rồi chạy tiếp từ B1 mà **không** nhắn xác nhận.

## 5. Giao tiếp với chủ dự án

Chủ dự án chỉ muốn nghe ở các mốc lớn. Mỗi lượt làm việc kết thúc bằng **đúng một** trong ba loại
tin nhắn sau, không có loại nào khác:

1. **Câu hỏi chặn** (mục 4).
2. **Báo cáo giai đoạn** (khi xong M, C, I1, I2, I3), theo mẫu:

```
✅ Xong giai đoạn <X> — chờ duyệt

- Đã làm: <danh sách mã task + mô tả 1 dòng + commit>
- Nghiệm thu: <mỗi tiêu chí: đạt/không đạt, bằng chứng (ảnh, test)>
- Ảnh trước/sau: design/snapshots/ui-v4/...
- Phát hiện ngoài phạm vi: <nếu có>
- Câu hỏi cho giai đoạn sau: <nếu có, theo mẫu mục 4>

Trả lời "duyệt <X>" để sang giai đoạn tiếp theo, hoặc ghi yêu cầu sửa.
```

3. **Hoàn thành toàn bộ kế hoạch.**

Không gửi: thông báo bắt đầu task, tiến độ từng task, tóm tắt từng commit, xác nhận đã nhận câu
trả lời. Mọi chi tiết đó nằm trong file tiến độ và git log.

## 6. Vùng cấm (chỉ sửa khi chủ dự án đồng ý, điều kiện S5)

- `prisma/` và migration; `docker-compose.yml`; file deploy, `.env` thật, cấu hình Render/Vercel/Zalo.
- Dataset demo: `apps/miniapp/src/lib/demo-*.ts`, `apps/admin/src/lib/demo-*.ts`, `scripts/seed-demo.ts`.
- Branch `ui_version_3` và `main`: không commit, không push.
- `package.json` / `pnpm-lock.yaml`: chỉ được sửa script `test` của miniapp để thêm file test mới;
  thêm thư viện là S5.

## 7. Phiên mới, ngắt giữa chừng, hết ngữ cảnh

- File tiến độ phải luôn đủ để một agent khác tiếp tục: cập nhật nó sau mỗi task, không dồn cuối.
- Task `đang làm` mà phiên trước bị ngắt: đọc `git status` và `git diff`, nếu xác định được phần
  đã làm thì làm tiếp; không xác định được → dừng hỏi (S9), không tự xoá thay đổi.
