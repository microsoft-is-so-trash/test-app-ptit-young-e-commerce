# Kế hoạch chuẩn hoá UI v4 (branch `ui_version_4`)

Kế hoạch thực hiện các kết luận trong `docs/NGHIEN_CUU_UI_NON_FICTION_VA_GOOGLE_API.md`.
Quy tắc agent phải tuân theo: `.claude/rules/ui-non-fiction.md` và `.claude/rules/external-apis.md`.

**Cách chạy:** gọi `/ui-v4`. Agent tự thực thi theo `.claude/rules/ui-v4-workflow.md`, ghi trạng
thái vào `docs/TIEN_DO_UI_V4.md`, chỉ nhắn khi cần hỏi hoặc khi xong một giai đoạn. Câu hỏi đang
mở và quyết định đã có nằm trong file tiến độ, không nằm trong file này.

## 0. Quyết định của chủ dự án (02/10/2026)

| Chủ đề | Quyết định |
|---|---|
| Branch | `ui_version_4`, tạo từ `ui_version_3`. Không commit lên `ui_version_3` |
| Thứ tự | Merchant trước, Collector sau. Các tích hợp (Google Maps, TTS, Gemini) làm sau khi xong UI của cả hai vai trò |
| Phần giả và dataset demo | **Giữ nguyên**: không xoá, không đổi nội dung, không ẩn sau cờ. Khi tái cấu trúc thì đặt lại vào vị trí mới |
| Thanh điều hướng | Kiểu A: thanh dưới đáy, 2 nút có chữ |
| Tài khoản | Đã có Google Cloud (có thanh toán) và Zalo AI. Key chỉ đặt trong biến môi trường, không gửi qua chat, không commit |

## 1. Cách làm chung cho mọi task

1. **Dừng chờ duyệt giữa các giai đoạn.** Xong một giai đoạn (M, C, I1, I2, I3) thì báo kết quả
   và chờ chủ dự án duyệt trước khi sang giai đoạn tiếp theo.
2. **Phân loại** mỗi task: nhóm A (thuần trình bày) hoặc nhóm B (đổi tương tác/state/tính năng).
   Nhóm B: viết test trước (RED), rồi mới sửa (GREEN). Logic mới tách thành hàm thuần trong
   `src/lib/` để test bằng `node:test`.
3. **Cổng kiểm tra** trước mỗi commit (chạy ở gốc repo):

   ```bash
   pnpm --filter @eco-oil/miniapp typecheck
   pnpm --filter @eco-oil/miniapp lint
   pnpm --filter @eco-oil/miniapp test
   pnpm --filter @eco-oil/miniapp build
   git diff --stat HEAD   # đối chiếu số dòng với kỳ vọng, lệch bất thường thì dừng lại điều tra
   ```

   Task có sửa `apps/api` hoặc `apps/admin` thì chạy thêm lệnh tương ứng của package đó.
4. **Kiểm tra trực quan bắt buộc** cho mọi thay đổi giao diện: chạy miniapp với
   `VITE_DEMO_MODE=true VITE_DEMO_OFFLINE=true`, chụp màn hình khung 375×812 bằng Playwright
   (Chromium có sẵn), so trước/sau. Chưa nhìn thấy kết quả thì chưa coi là xong.
5. **Test mới** của miniapp phải được thêm vào script `test` trong `apps/miniapp/package.json`.
6. **Commit** theo dạng `<type>: <mô tả>` (feat, fix, refactor, docs, test, chore), mỗi task một
   commit, push lên `origin ui_version_4`.
7. **Không đụng:** `prisma/` và migration, `docker-compose.yml`, file deploy/`.env` thật, dataset
   demo. Nếu một task buộc phải sửa những chỗ này thì hỏi trước.

---

## 2. Dùng nhiều tác tử (Society Charter)

> **Trạng thái:** chủ dự án **duyệt ngày 03/10/2026** (S-1, S-3, S-4 theo đề xuất; S-2: trần 12 lần
> gọi tác tử phụ mỗi giai đoạn). Áp dụng từ giai đoạn I1. Các bước tương ứng đã được đưa vào
> `.claude/rules/ui-v4-workflow.md` (B2, B3, B6, B8).

Cơ sở: tài liệu "Society of Agents" chủ dự án gửi trong chat ngày 03/10/2026 (cổng 6 câu, bảng
Charter 11 trường), áp vào số liệu thật của dự án. Số liệu bên ngoài trong mục này (chi phí khoảng
15 lần token, lỗi lan truyền khi thiếu kiểm chứng tập trung) lấy từ tài liệu đó, agent chưa kiểm lại.

### 2.1. Kết luận

- **Không dựng "society" để viết code.** Chỉ **một tác tử chính** (phiên chạy `/ui-v4`) được ghi:
  code, test, file tiến độ, kế hoạch, commit, push. Lý do ở mục 2.2, dòng A.
- Tác tử phụ chỉ được dùng **như công cụ chỉ đọc, ngữ cảnh sạch**, ở 3 chỗ, mỗi chỗ đã qua cổng:
  1. Rà soát đầu giai đoạn (B2), chỉ khi khối lượng cần đọc vượt sức một tác tử (câu 4 của cổng
     là "có"). Hiện chỉ I2 đạt (dòng B).
  2. Review sau khi viết (B6): reviewer mã, và reviewer bảo mật khi task chạm key, endpoint gọi API
     trả phí, xác thực hoặc rate limit (dòng C).
  3. Kiểm nghiệm thu cuối giai đoạn (B8): một verifier độc lập chấm từng tiêu chí trước khi gửi
     báo cáo (dòng D).
- Không dùng tác tử phụ để viết test, chụp ảnh hay sửa lỗi build (dòng E, F).

### 2.2. Cổng 6 câu áp vào dự án

Câu hỏi: (1) chia được thành phần độc lập · (2) chạy song song được (chủ yếu đọc) · (3) cần người
chấm khác người làm · (4) vượt ngữ cảnh một tác tử · (5) cần chuyên môn/công cụ khác nhau · (6) lợi
ích lớn hơn chi phí. "Chưa rõ" tính là "không". Chỉ dùng khi có từ 4 "có" trở lên **và** câu 6 là "có".

| | Cách dùng | 1 | 2 | 3 | 4 | 5 | 6 | Kết luận |
|---|---|---|---|---|---|---|---|---|
| A | Cả giai đoạn I1/I2 chia cho nhiều tác tử cùng viết (admin, api, miniapp song song) | Không | Không | Có | Chưa rõ | Có | Chưa rõ | **KHÔNG** |
| B | Rà soát đầu giai đoạn (B2) bằng 2–3 tác tử đọc song song | Có | Có | Không | I1: không · I2: có | Không | Có | I1: **KHÔNG** · I2: **DÙNG** |
| C | Review sau khi viết (B6) | Có | Có | Có | Không | Có | Có | **DÙNG** |
| D | Verifier nghiệm thu cuối giai đoạn (B8) | Có | Có | Có | Không | Không | Có | **DÙNG** |
| E | Tác tử riêng viết test trước (`tdd-guide`) | Không | Không | Có | Không | Không | Không | **KHÔNG** |
| F | Tác tử riêng chụp ảnh/kiểm trực quan (B5) | Không | Không | Có | Không | Không | Không | **KHÔNG** |

Giải thích các ô quyết định:

- **A, câu 1–2:** I1.1, I1.2, I1.3 dùng chung hợp đồng `StationRecommendation`
  (`packages/shared-types`) và `stationRecommendSchema` (`packages/validation`); I2.3–I2.5 cần
  endpoint của I2.1. Ngoài ra mọi task cùng ghi `docs/TIEN_DO_UI_V4.md`, script `test` của
  `apps/miniapp/package.json` và cùng một branch theo quy tắc "mỗi task một commit". Nhiều luồng
  ghi sẽ xung đột.
- **A, câu 6 và phép thử phủ quyết:** giai đoạn M và C (69 file, 30 commit) đã xong bằng một tác tử,
  không có lỗi CRITICAL/HIGH, 228/228 test pass. Baseline một tác tử đã cao, nên muốn dùng society
  thì phải có pilot chứng minh nó thắng. Chưa có pilot. Hạn mức sử dụng cũng là ràng buộc thật: phiên
  ngày 03/10/2026 đã phải dừng giữa C5.2 vì hết hạn mức (xem nhật ký).
- **B, câu 4:** I1 đã được tác tử chính rà gần xong trong khoảng 10 lệnh đọc (03/10/2026), không cần
  chia. I2 chạm module backend mới, luồng "Bắt đầu ca" và Dexie của Collector, `NotificationBell` và
  Cài đặt chung của Merchant, cộng 2 tài liệu nghiên cứu, nên đáng chia.
- **C, câu 6:** đã có bằng chứng: 3 lần chạy `code-reviewer` tìm được 11 điểm MEDIUM, sửa 10.
- **D, câu 3:** hiện tác tử chính tự chấm nghiệm thu chính việc mình làm. Theo bảng Charter, "chỉ
  tác tử làm việc được tuyên bố xong" là tín hiệu đỏ.
- **E:** test của dự án là hàm thuần nhỏ trong `src/lib/`, viết cùng luồng với code; tác tử viết
  test riêng sẽ thành luồng ghi thứ hai. Thay bằng quy tắc bằng chứng RED (mục 2.3, trường 8), vì
  đã có lần bỏ bước RED (ghi chú C3).
- **F:** cần dev server và browser pane của phiên chính, là trạng thái dùng chung.

### 2.3. Charter của dự án (11 trường)

**1. Mục tiêu và tiêu chí hoàn thành.** Làm xong I1 → I2 → (I3 nếu được xác nhận) đúng kế hoạch.
Mỗi giai đoạn xong khi:

- Cổng kiểm tra B4 pass 100% cho mọi app bị sửa.
- Không còn lỗi CRITICAL/HIGH nào chưa xử lý.
- Mọi tiêu chí nghiệm thu được verifier chấm "đạt", hoặc "chưa đủ bằng chứng" kèm lý do (ví dụ
  cần máy thật).
- Số lần gọi tác tử phụ không vượt trần ở trường 9.

**2. Vai trò.**

| Vai | Loại agent · model | Đầu vào | Đầu ra | ĐƯỢC | KHÔNG được |
|---|---|---|---|---|---|
| Tác tử chính | Phiên `/ui-v4` | Kế hoạch, tiến độ, câu trả lời của chủ dự án | Code, test, commit, file tiến độ, câu hỏi, báo cáo | Mọi bước B0–B8; gọi tác tử phụ; phân xử | Sửa vùng cấm; tự kết luận nghiệm thu giai đoạn khi verifier chưa chạy; nhờ tác tử phụ ghi file |
| Người rà soát | `Explore` · sonnet | Mã task + danh sách file của một app | Bảng: file:dòng còn khớp/không khớp mô tả, thay đổi dự kiến, điểm thuộc S1–S14 | Đọc file, `grep`, `git log/show/diff` | Sửa file; chạy lệnh ghi (`pnpm install`, `git` ghi); đề xuất việc ngoài kế hoạch |
| Reviewer mã | `code-reviewer` · sonnet | Khoảng commit + mã task + quy tắc U1–U13/E1–E7 | Danh sách lỗi theo mức, file:dòng, kịch bản gây lỗi | Đọc, chạy test/lint chỉ đọc | Sửa code; chạy `git` ghi; mở rộng phạm vi |
| Reviewer bảo mật | `security-reviewer` · sonnet | Như trên + checklist E1, E3, E6 | Như trên | Như trên | Như trên |
| Verifier nghiệm thu | Agent mới `ui-v4-verifier` (Read, Grep, Glob, Bash) · sonnet | Tiêu chí nghiệm thu (trích từ kế hoạch), đường dẫn ảnh, danh sách lệnh kiểm tra | Mỗi tiêu chí: đạt / không đạt / chưa đủ bằng chứng, kèm bằng chứng | Chạy lại lệnh cổng kiểm tra, xem ảnh, đọc diff | Sửa file; đọc nhật ký lập luận của tác tử chính (chỉ chấm sản phẩm) |
| Chủ dự án | Người | Câu hỏi, báo cáo giai đoạn | Quyết định, duyệt | Duyệt giai đoạn, trả lời S1–S14, phân xử cuối | |

Tác tử phụ không được gọi tác tử khác. Cả 4 vai phụ đều có `Bash`, nên ranh giới "chỉ đọc" phải
được kiểm bằng máy (trường 5), không chỉ dựa vào lời dặn trong prompt.

**3. Mô hình phối hợp.** Hai mô hình, tách theo đọc/ghi:

- Ghi: **pipeline tuần tự** B3 → B4 → B5 → B6 → B7, như hiện tại.
- Đọc: **orchestrator–worker**, tác tử chính chia việc rồi tổng hợp.
- Không dùng debate (bỏ phiếu đã đủ, mà ở đây test là trọng tài), blackboard hay đấu thầu.

**4. Giao thức.** Công cụ `Agent` nhận một prompt chữ và trả về chữ, nên giao thức là mẫu prompt
và mẫu kết quả cố định:

```text
conv_id:    <giai đoạn>-<mã task>-<vai>-<lần>   ví dụ I1-I1.2-sec-1
act:        request
task_ref:   <mã task> · mục <x> của docs/KE_HOACH_CHUAN_HOA_UI_V4.md
payload_ref: <khoảng commit hoặc danh sách file> (không dán nội dung file)
rules:      <các quy tắc U/E liên quan>
forbidden:  không sửa file, không chạy lệnh ghi, không gọi tác tử khác
return:     act (done | reject) · findings[] {mức, file:dòng, mô tả, kịch bản lỗi}
            · evidence[] (file:dòng hoặc lệnh + kết quả) · confidence · việc chưa làm được
```

Kết quả không có `evidence` thì tác tử chính coi như không có.

**5. Trạng thái.** Tác tử phụ chỉ đọc mọi kho:

| Kho | Ai ghi | Ai đọc |
|---|---|---|
| Branch `ui_version_4` (code, test, ảnh) | Tác tử chính | Tất cả |
| `docs/TIEN_DO_UI_V4.md` | Tác tử chính | Tất cả |
| `docs/KE_HOACH_CHUAN_HOA_UI_V4.md` | Tác tử chính, sau khi chủ dự án trả lời | Tất cả |
| Báo cáo gốc của tác tử phụ | Không lưu vào repo; tác tử chính tóm tắt vào cột "Ghi chú" | |

Kiểm bằng máy: chụp `git status --porcelain` và `git diff --stat` trước và sau mỗi lần gọi tác tử
phụ. Khác nhau → dừng hỏi (S8), không tự xoá thay đổi. Không dùng worktree, vì không có luồng ghi
song song.

**6. Phân xử khi bất đồng.** Thứ tự: test hoặc lệnh tái lập được > bằng chứng file:dòng > kế hoạch
và quy tắc U/E > ý kiến reviewer.

- Lỗi CRITICAL/HIGH: tác tử chính sửa, hoặc chứng minh là báo nhầm bằng test hay file:dòng rồi
  ghi lại. Không chứng minh được mà muốn bỏ qua → S7.
- Lỗi ngoài phạm vi → ghi vào "Phát hiện ngoài phạm vi", không sửa.
- Verifier chấm "không đạt" mà tác tử chính không đồng ý → không tranh luận qua lại. Ghi cả hai lập
  luận vào báo cáo giai đoạn, chủ dự án quyết.

**7. Điều kiện dừng.**

- Task xong khi: B4 pass, có ảnh B5 (nếu đổi giao diện), và review (nếu bắt buộc theo mục 2.4)
  không còn CRITICAL/HIGH.
- Sửa sau review: tối đa 2 vòng, tính chung với giới hạn của B4.
- Verifier: chạy lại tối đa 1 lần sau khi sửa; vẫn "không đạt" thì đưa vào báo cáo cho chủ dự án.
- Tác tử phụ lỗi hoặc trả kết quả rỗng: gọi lại tối đa 1 lần. Lần hai vẫn lỗi thì tác tử chính tự
  làm phần rà soát; với review và verifier thì ghi "không chạy được" vào báo cáo.

**8. Kiểm chứng độc lập.** Bốn tầng, tầng trên không thay tầng dưới:

1. Tất định: typecheck, lint, test, build (thêm api/admin khi bị sửa).
2. Reviewer ngữ cảnh sạch: chỉ nhận diff và quy tắc, không nhận lập luận của tác tử chính.
3. Verifier: rubric là tiêu chí nghiệm thu của kế hoạch.
4. Chủ dự án.

Quy tắc bằng chứng RED: task nhóm B ghi vào cột "Ghi chú" tên test và dòng FAIL trước khi sửa.
Không có dòng này thì task chưa xong.

**9. Giới hạn.**

- Tối đa 3 tác tử phụ chạy cùng lúc.
- Mỗi giai đoạn tối đa **12 lần gọi tác tử phụ** (S-2). Mỗi vai không quá 3 lần: rà soát,
  `code-reviewer`, `security-reviewer`, verifier. Sắp hết hạn mức thì bỏ verifier trước, giữ
  `security-reviewer`.
- Tác tử phụ dùng sonnet (theo frontmatter có sẵn); không dùng opus cho tác tử phụ.
- Tác tử phụ chạy nền; tác tử chính không gửi tin nhắn hỏi thăm định kỳ trong lúc chờ.
- Trần token/tiền theo con số chủ dự án đặt (câu hỏi S-2).

**10. Điểm dừng cho con người.** Giữ nguyên: duyệt giai đoạn, câu hỏi S1–S14, vùng cấm. Thêm:

- Duyệt Charter này.
- Mọi thao tác trên Google Cloud (tạo key, hạn mức, cảnh báo ngân sách) do chủ dự án tự làm.
- I2.2 (nghe thử, chọn giọng) do chủ dự án quyết; agent chỉ chuẩn bị bản nghe thử.

**11. Xử lý lỗi và log.**

- Mỗi lần gọi tác tử phụ ghi 1 dòng vào nhật ký của file tiến độ: `conv_id — vai — đầu vào — kết quả
  (số lỗi theo mức) — đã xử lý thế nào`.
- Lỗi gắn nhãn theo 3 nhóm MAST:
  - **FM1 thiết kế:** brief sai hoặc thiếu, vai không rõ.
  - **FM2 lệch pha:** tác tử phụ làm ngoài brief, ghi file, bỏ qua `forbidden`.
  - **FM3 kiểm chứng:** bỏ sót lỗi mà sau đó mới phát hiện, hoặc kết luận không có bằng chứng.
- Checkpoint vẫn là file tiến độ và commit sau mỗi task, nên bị ngắt thì làm tiếp từ task dở.

### 2.4. Áp dụng cho từng giai đoạn còn lại

| Giai đoạn | B2 rà soát | B6 review | B8 nghiệm thu |
|---|---|---|---|
| I1 | Tác tử chính tự rà (xong 03/10/2026, câu hỏi Q17–Q24 trong file tiến độ) | `security-reviewer` cho I1.2 (key Routes, endpoint gọi API trả phí, rate limit, timeout/thử lại theo E3) và cho I1.1 nếu gọi Places qua backend; `code-reviewer` 1 lần cuối giai đoạn trên diff api + admin + miniapp | Verifier chấm: "tắt mạng hoặc dùng key sai thì vẫn gợi ý trạm", "có test e2e backend cho nhánh dự phòng", và tiêu chí của I1.1, I1.3 |
| I2 | 3 tác tử `Explore` song song: (1) `apps/api` (chỗ đặt module `tts`, JWT guard, Redis, config); (2) Collector (Bắt đầu ca, `outbox-db`/Dexie, các điểm C-T2…C-T6); (3) Merchant + Cài đặt chung (`NotificationBell`, các section) và tài liệu TTS mục 4. Tác tử chính gom thành một lần hỏi | `security-reviewer` bắt buộc cho I2.1 (key, mẫu câu thay vì văn bản tự do, rate limit, cache); `code-reviewer` cuối giai đoạn | Verifier chấm từng tiêu chí; mục cần máy thật (tự phát âm thanh trên iOS, `speechSynthesis` trong Zalo) ghi "chưa đủ bằng chứng" |
| I3 | Quyết sau I2 | | |

### 2.5. Pilot và đo hiệu quả

I1 là pilot. Ghi lại:

- Số lần gọi từng vai.
- Số lỗi có giá trị (được sửa thật) trên tổng số lỗi báo ra.
- Lỗi nào verifier bắt được mà tác tử chính đã bỏ sót.

Cuối I1, đưa các số này vào báo cáo giai đoạn để chủ dự án quyết có giữ, giảm hay bỏ vai nào cho
I2. Chưa có pilot thì không mở rộng sang nhiều luồng ghi.

### 2.6. Những quy tắc ECC bị thay thế trong kế hoạch này

Thứ tự ưu tiên đã có: kế hoạch đứng trên quy tắc ECC. Khi Charter được duyệt, các điểm sau của
`.claude/rules/ecc/common/agents.md` và `.claude/AGENTS.md` **không áp dụng** cho kế hoạch UI v4:

- "ALWAYS use parallel Task execution": chỉ chạy song song các nhánh đọc ở mục 2.4.
- Tự gọi `planner`, `architect`, `tdd-guide`: kế hoạch đã có, và test do tác tử chính viết.
- "Multi-Perspective Analysis" 5 vai: chỉ dùng các vai ở trường 2.

### 2.7. Việc làm khi được duyệt (đã làm 03/10/2026)

1. Ghi quyết định vào file tiến độ.
2. Sửa `.claude/rules/ui-v4-workflow.md`:
   - B2: thêm nhánh rà soát song song có điều kiện.
   - B3: thêm quy tắc bằng chứng RED.
   - B6: thay "chạy `code-reviewer` một lần nếu môi trường có" bằng bảng 2.4 cùng phép kiểm
     `git status` trước/sau.
   - B8: chạy verifier trước khi gửi báo cáo.
   - Thêm nhãn MAST vào mẫu nhật ký.
3. Tạo `.claude/agents/ui-v4-verifier.md` (tools: Read, Grep, Glob, Bash; model: sonnet), có
   prompt chấm theo tiêu chí nghiệm thu và mẫu kết quả ở trường 4.

### 2.8. Câu hỏi đã được trả lời (03/10/2026)

| Mã | Câu hỏi | Trả lời |
|---|---|---|
| S-1 | Một luồng ghi, tác tử phụ chỉ đọc, dùng ở B2 (I2), B6, B8? | Đồng ý |
| S-2 | Trần gọi tác tử phụ mỗi giai đoạn | 12 lần (đề xuất ban đầu là 9) |
| S-3 | Tạo agent `.claude/agents/ui-v4-verifier.md` | Đồng ý |
| S-4 | Sửa `.claude/rules/ui-v4-workflow.md` theo mục 2.7 | Đồng ý |

---

## Giai đoạn M: Merchant

### M1. Sửa lỗi phường bị viết cứng khi gửi lại hồ sơ (nhóm B, fix)

- **File:** `apps/miniapp/src/components/MerchantApprovalView.tsx`.
- **Việc:** bỏ `WARD_ID` cứng trong `save()`; không gửi `ward_id` (giữ phường hiện tại) hoặc cho
  chọn phường như lúc đăng ký, điền sẵn phường hiện tại.
- **Nghiệm thu:** gửi lại hồ sơ không làm đổi phường của quán. Có test cho hàm tạo payload.

### M2. Bỏ hiển thị trùng (nhóm A)

- Trang chủ: tiền tuần chỉ hiện 1 lần (giữ thẻ lớn, bỏ ô "Tiền ước tính tuần" trong lưới thống kê).
- Danh sách can: chỉ giữ ở "Hôm nay"; phần can ở Tài khoản (kể cả chữ giả "Can HDPE ISCC",
  "QR-ISCC") chuyển thành một mục trong "Của tôi", giữ nguyên chữ.
- **Nghiệm thu:** không còn số liệu nào hiện 2 lần trên cùng một màn.

### M3. Hằng số nghiệp vụ một nguồn (nhóm B, nhỏ)

- Hệ số CO2: `HistoryPage.tsx:48` dùng 2.65, nơi khác dùng 2.5. Đưa về một hằng số dùng chung.
- Giá trị đúng: **2.5** kg CO2/lít (chủ dự án chốt 03/10/2026). Số trên màn Lịch sử sẽ đổi theo.
- **Nghiệm thu:** `grep` không còn hệ số CO2 khai báo riêng trong từng màn.

### M4. Thanh điều hướng 2 nhóm cho Merchant (nhóm B)

- **File chính:** `apps/miniapp/src/App.tsx`, `src/styles.css`, các trang trong `src/pages/`.
- **Hôm nay:** nút "Sẵn sàng thu gom" (nút chính duy nhất), trạng thái can, đơn đang mở (chỉ khi có,
  kèm Huỷ), tiền tuần này, giá dầu hôm nay, và các phần giả hiện có của Trang chủ (giữ nguyên).
- **Của tôi:** danh sách mục mở rộng (accordion), mỗi mục mở ra nội dung của trang cũ:
  1. Lịch sử thu gom: gộp `OrdersPage` (đơn đã xong/huỷ) và `HistoryPage`.
  2. Tiền theo kỳ: `PaymentsPage`.
  3. Hành trình xanh: `GreenJourneyPage` (giữ xuất PDF).
  4. Hồ sơ quán: phần hồ sơ của `AccountPage` (giữ nguyên các chữ giả ISCC-EU, MB Bank…).
  5. Mời bạn.
  6. Cài đặt chung: các công tắc và mục giả hiện có (giữ nguyên), thông tin phiên bản, đăng xuất.
- Thanh dưới đáy 2 nút có chữ "Hôm nay" / "Của tôi" (kiểu A).
- **Nghiệm thu:** mọi nội dung của 6 tab cũ vẫn truy cập được trong tối đa 2 chạm; không còn tab
  chỉ có icon; phần giả vẫn hiển thị đúng chữ cũ.

### M5. Tự động hoá Merchant (nhóm B)

| Task | Việc | Nghiệm thu |
|---|---|---|
| M5.1 | `OrderSheet`: điền sẵn số lít bằng `estimated_liters` của can sẵn sàng, ghi "tự tính", sửa được | Báo sẵn sàng chỉ cần 1 chạm; test hàm tính giá trị điền sẵn |
| M5.2 | Thông báo nhắc báo thu gom khi can ước tính đầy từ 85%, tính ở client trong `lib/notifications.ts`. Công tắc giả ở Cài đặt chung giữ nguyên, không nối vào | Có test trong `notifications.test.ts` |
| M5.3 | Lưu trạng thái "đã đọc" của thông báo trên máy (`zaloClient` storage) | Tải lại vẫn giữ trạng thái đã đọc; có test |
| M5.4 | Nút bị khoá phải hiện lý do (ví dụ "Sẵn sàng thu gom" khi can đang vận chuyển) | Mỗi nút disabled đều có dòng lý do |

### M6. Rào cản cảm xúc Merchant (nhóm A, phần nhỏ nhóm B)

- Thay `window.confirm` bằng hộp xác nhận trong app (dùng lại `confirm-dialog`).
- Nút đăng xuất trong Cài đặt chung: chữ thường, không dùng nút đỏ lớn.

**Kết thúc giai đoạn M:** chụp màn hình trước/sau toàn bộ màn Merchant, báo cáo, chờ duyệt.

---

## Giai đoạn C: Collector

### C1. Dải trạng thái duy nhất (nhóm B)

- **File:** `src/pages/CollectorFlow.tsx`, `src/pages/collector/CollectorRouteScreen.tsx`,
  `src/components/CollectorNotice.tsx`.
- Gom các thông báo (mất mạng, kết quả tải lại, lỗi tải, GPS, cache, biên nhận, hàng chờ, ca sẵn
  sàng) thành 1 dải theo thứ tự ưu tiên của quy tắc U6; bấm vào để xem danh sách đầy đủ.
- Hàm chọn trạng thái ưu tiên viết thuần trong `src/lib/`, có test.
- **Nghiệm thu:** màn Tuyến hiện tối đa 1 dải trạng thái; trạng thái hàng chờ đồng bộ luôn thấy
  được; `outbox.test.ts`, `collector-flow.test.ts` vẫn pass.

### C2. Thanh điều hướng 2 nhóm cho Collector (nhóm B)

- **File chính:** `src/pages/collector/CollectorShell.tsx`.
- **Ca hôm nay:** dải trạng thái, Bắt đầu ca, danh sách điểm với nút chuyển "Danh sách / Bản đồ"
  (nội dung `CollectorMapPage`), Thu gom, Nộp trạm.
- **Của tôi:** mục mở rộng: Đã thu và thống kê (`CollectorSchedulePage` phần "Đã thu" +
  `CollectorStatsPage`), Hồ sơ và xe, Địa bàn, Cài đặt chung (đăng xuất).
- Bỏ: phần "Cần thu hôm nay" (trùng tab Tuyến), nút "Thoát" trên header, avatar không bấm được.
- Giữ ẩn thanh tab khi đang ở màn thao tác dở (`FOCUSED_SCREENS`).
- **Nghiệm thu:** 2 nút có chữ; đăng xuất chỉ còn 1 nơi; mọi nội dung cũ vẫn truy cập được.

### C3. Thẻ điểm thu gọn (nhóm B)

- `CollectorStopCard`: 1 nút chính "Thu gom"; bấm vào thẻ mở menu Gọi quán, Chỉ đường, Sao chép
  số, Chi tiết AI.
- **Nghiệm thu:** mỗi thẻ khi đóng chỉ có 1 nút; các hành động cũ vẫn dùng được.

### C4. Bỏ bước thừa (nhóm B)

| Task | Việc | Test liên quan |
|---|---|---|
| C4.1 | Quét QR khớp thì tự chuyển sang màn nhập, bỏ nút "Tiếp tục nhập giao dịch" | `container-code.test.ts` |
| C4.2 | Ô nhập tay mã can để trống, không điền sẵn `stop.container_code` (vá lỗ hổng bỏ qua quét QR) | `container-code.test.ts` |
| C4.3 | Thu xong điểm cuối thì hiện "Đi nộp trạm" ngay trên màn Tuyến, bỏ màn Tóm tắt ca | `collector-flow.test.ts` |
| C4.4 | Gộp "Kết ca" và "Kết thúc ca" thành 1 lần bấm. Dòng giả "Số phiếu nộp trạm: 1" giữ nguyên | `station-delivery.test.ts` |

### C5. Tự động hoá màn nhập thu gom (nhóm B)

| Task | Việc |
|---|---|
| C5.1 | kg và lít tự tính qua lại theo mật độ `DEFAULT_DENSITY_KG_PER_LITER`; ô vừa sửa là ô gốc. Không còn trường hợp ô lít điền sẵn làm 2 số mâu thuẫn |
| C5.2 | Chọn hạng C hoặc tick "Nghi ngờ pha lẫn" thì chất lượng tự chuyển "Cần kiểm tra" (vẫn sửa được) |
| C5.3 | Tự lấy GPS khi mở màn nhập; nút "Lấy lại GPS" chỉ hiện khi lỗi |
| C5.4 | AI (thuật toán trên máy) tin cậy cao và chưa chọn hạng thì chọn sẵn, ghi "AI chọn sẵn" |
| C5.5 | Bước nộp trạm: chọn sẵn trạm gần nhất còn đủ sức chứa |

- Mỗi task có test hàm thuần; `collection-entry-validation`, `oil-grade-selector.test.ts`,
  `grade-photo-picker.test.ts`, `oil-image-analyzer.test.ts` vẫn pass.

### C6. Ẩn thông tin kỹ thuật (nhóm A)

- UUID đầy đủ, "provider/model" của AI, "Mã giao dịch" chuyển vào phần "Chi tiết" thu gọn.

**Kết thúc giai đoạn C:** chụp màn hình trước/sau toàn bộ màn Collector, báo cáo, chờ duyệt.

---

## Giai đoạn I1: Google Maps cho trạm

| Task | Việc | File |
|---|---|---|
| I1.1 | Admin nhập vị trí trạm: gõ địa chỉ → gợi ý Places API (New) → chọn → kéo ghim xác nhận. Giữ ô nhập tay lat/lng làm dự phòng | `apps/admin/src/components/stations-view.tsx` |
| I1.2 | Backend: gợi ý trạm theo đường đi xe máy bằng Routes API (Compute Route Matrix, `TWO_WHEELER`); lỗi/timeout thì dùng `ST_Distance` hiện có | `apps/api/src/modules/stations/` |
| I1.3 | Collector: tính gợi ý trạm lúc "Bắt đầu ca" và lưu trên máy; mất mạng dùng bản đã lưu | `apps/miniapp/src/lib/offline-cache.ts`, `StationDeliveryFlow.tsx` |

- Key: `GOOGLE_MAPS_SERVER_KEY` (backend, giới hạn IP + Routes/Places),
  `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (admin, giới hạn referrer). Đặt hạn mức/ngày và cảnh báo
  ngân sách trên Google Cloud.
- **Nghiệm thu:** tắt mạng hoặc dùng key sai thì app vẫn gợi ý trạm (đường chim bay); có test e2e
  backend cho nhánh dự phòng.

## Giai đoạn I2: Đọc giọng nói (TTS)

Chi tiết kỹ thuật, chi phí và vị trí đặt tính năng: `docs/NGHIEN_CUU_TTS_GOOGLE.md` (cập nhật
03/10/2026). Bị chặn bởi câu hỏi T1–T7 trong `docs/TIEN_DO_UI_V4.md`.

| Task | Việc |
|---|---|
| I2.1 | Backend module `apps/api/src/modules/tts`: `POST /api/v1/tts` (JWT, rate limit), nhận `template_id` + tham số (mẫu câu đặt ở `packages/shared-types`), trả `{ text, audio_base64, mime, cache_hit }`; lớp `TtsProvider` với nhà cung cấp Google Cloud TTS (Chirp 3: HD, MP3) và Zalo AI; cache theo hash (câu + giọng + tốc độ + nhà cung cấp) |
| I2.2 | Lấy danh sách giọng `vi-VN` bằng `voices.list`; nghe thử 2 nhà cung cấp với câu mẫu và tên quán thật trong dataset demo (chất lượng, phát âm tên riêng, độ trễ, tỷ lệ lỗi); chủ dự án chọn nhà cung cấp chính và giọng |
| I2.3 | Collector: lúc "Bắt đầu ca" mở khoá âm thanh và tạo sẵn đoạn âm thanh (câu tĩnh + "Điểm tiếp theo: {quán}" cho từng điểm), lưu trong Dexie. Đọc tại các điểm C-T2…C-T6 của tài liệu TTS mục 4.1. Không đưa số liệu chỉ có lúc chạy tuyến (số lít vừa nhập, khoảng cách, số giao dịch chờ) vào âm thanh |
| I2.4 | "Của tôi → Cài đặt chung" của cả hai vai trò: công tắc "Giọng đọc" (thật, lưu trên máy); Merchant thêm công tắc "Đọc số tiền", mặc định tắt |
| I2.5 | Merchant: nút "Nghe" (biểu tượng loa + chữ) trên từng thông báo trong `NotificationBell`, tạo âm thanh khi bấm, lưu theo hash trên máy |

- Key/biến: `GOOGLE_TTS_API_KEY` (hoặc service account, theo câu T2), `GOOGLE_TTS_VOICE`,
  `TTS_PRIMARY_PROVIDER`, `ZALO_AI_API_KEY`. Gemini TTS chỉ thêm (`GEMINI_API_KEY`,
  `GEMINI_TTS_MODEL`) nếu chủ dự án chọn ở câu T1.
- Dự phòng: âm thanh đã lưu → nhà cung cấp chính → nhà cung cấp phụ → `speechSynthesis` → chỉ chữ.
- Miniapp phát âm thanh lấy từ API của dự án bằng `blob:` URL, không phát link của nhà cung cấp,
  nên không cần khai báo thêm tên miền âm thanh trong Zalo Mini App.
- Thêm bảng Dexie mới cho âm thanh là đổi schema trên máy (điều kiện S5): đã được duyệt cùng
  giai đoạn I2 khi chủ dự án trả lời T1–T7.
- **Cần thử trên máy thật trong Zalo:** chính sách tự phát âm thanh của iOS ("mở khoá" khi bấm
  Bắt đầu ca), `speechSynthesis` có giọng `vi-VN` trong WebView của Zalo hay không.

## Giai đoạn I3 (tuỳ chọn): Gợi ý hạng dầu bằng Gemini

- Chỉ chạy khi có mạng, sau thuật toán trên máy, không chặn nút lưu; kết quả chỉ là gợi ý.
- Chỉ làm nếu chủ dự án xác nhận sau giai đoạn I2.

---

## Câu hỏi còn chờ trả lời

Chuyển sang mục "Câu hỏi đang mở" của `docs/TIEN_DO_UI_V4.md` (Q1–Q4 cho giai đoạn M, T1–T7 cho
giai đoạn I2).
