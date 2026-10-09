# Kế hoạch nâng cấp LearnTA — 10/2026

> Lập 2026-10-09 từ `HANDOFF.md` (mục 1–48), `docs/BUG_AUDIT_2026-10-05.md`, `docs/STUDY_IDEMPOTENCY_2026-10-08.md` và một lần chạy kiểm tra trên checkout hiện tại. Bản này viết để **chạy tự động một lượt**: mọi quyết định đã có phương án mặc định (mục 2), mọi việc có điều kiện xong (mục 3). Việc cần người dùng/production tách riêng ở mục 4.

## 0. Hiện trạng đo được (2026-10-09)

| Hạng mục | Kết quả |
|---|---|
| Backend `node --test test/*.test.js` | 118 đạt / **2 lỗi** / 1 bỏ qua — `test/nhapCauMau.test.js` đọc `database/private-content/cau-mau/tu-vung-day-du.csv` (`.gitignore`) → **CI backend đỏ** trên máy không có nội dung riêng |
| Frontend `vitest` | 154/154 đạt |
| Frontend lint | 0 lỗi / 23 cảnh báo |
| Build | Đạt; cảnh báo chunk > 500 KB và `eval` (Lottie) |
| Chunk lớn | `CanhThe3D` 531 KB (chỉ trang chủ), **`index` 437 KB (mọi trang)**, `index.umd` 316 KB, `LoginMascot` 164 KB, `CauChuyenCuon` 121 KB |
| `npm audit --omit=dev` backend | **critical** `proxy-addr`, **high** `nodemailer`, moderate `mysql2`, `qs`, `body-parser` — có `npm audit fix` |
| Lộ trình khi đăng nhập | **Trống**: `canReadDeck` + `roadmapController` (`d.user_id <=> ?`) chặn bộ mẫu `user_id NULL` với người đăng nhập (hệ quả chính sách A, Đợt 3 audit) |

## 1. Quy tắc chạy

- Làm trên nhánh `claude/confident-curie-s3b6ch`, **mỗi giai đoạn 1 commit**, push sau mỗi giai đoạn; cuối cùng mở 1 PR vào `main` để người dùng merge (merge = deploy, HANDOFF mục 5).
- Trước mỗi commit: `backend: node --test test/*.test.js` · `frontend: npx vitest run && npm run lint && npx vite build`. Đỏ thì sửa, không bỏ qua test.
- **Không** chạy migration lên Cloud SQL, **không** ghi DB production, **không** gọi Gemini hàng loạt. Code mới phải **tương thích ngược**: chạy được khi migration mới chưa áp dụng (bắt lỗi cột/ENUM thiếu → bỏ qua tính năng, không 500).
- Mỗi giai đoạn: thêm dòng vào bảng mục 3 của `HANDOFF.md`; sửa `PROJECT_CONTEXT.md` khi đổi route/bảng/luồng.
- Giữ ràng buộc `CLAUDE.md`: tên tiếng Việt không dấu trong code, UI có dấu; không thêm tài khoản demo; dùng `ui-*` + token sẵn có.
- Gặp việc không xác định được (thiếu quyền, kết quả đo bất thường) → ghi vào "Còn treo" của giai đoạn đó, làm tiếp việc khác.

## 2. Quyết định cần người dùng — kèm khuyến nghị (mặc định nếu không trả lời)

| # | Câu hỏi | Khuyến nghị (mặc định) | Lý do |
|---|---|---|---|
| D1 | Lộ trình khi đăng nhập đang trống — xử lý thế nào? | **(a)** Người đăng nhập **đọc** được bộ `user_id NULL` thuộc `roadmap_decks` (chỉ đọc, tiến độ theo `card_progress.user_id`); vẫn không đọc bộ riêng của người khác | Ít code nhất, khôi phục đúng HANDOFF mục 2; (b) ẩn tab làm mất nội dung; (c) sao chép tạo dữ liệu trùng |
| D2 | Làm game hoá (coin/shop/leaderboard)? | **Không** | Trái `PRODUCT.md`; ưu tiên trí nhớ thật hơn phần thưởng |
| D3 | Mở rộng từ vựng lộ trình (NGSL/TSL)? | **Hoãn**, không nằm trong lượt chạy | Cần chốt nguồn + soát nghĩa Việt thủ công |
| D4 | Thông báo đẩy (Web Push)? | **Không**; nâng cấp email nhắc có sẵn | Cần service worker, HANDOFF 42 cố ý tránh (kẹt bản cũ) |
| D5 | Mục tiêu ngày tính theo gì? | **Số lượt trả lời** (thẻ + câu), mặc định **20**, chọn 10/20/30/50 | Đếm chính xác từ dữ liệu có sẵn; phút dễ sai khi treo tab |
| D6 | Giới hạn từ mới/ngày? | **15**, chọn 5/10/15/20/30/Không giới hạn | Tránh hàng ôn phình sau 1–2 tuần |
| D7 | Luyện câu có ghi vào tiến độ SRS? | **Có, chỉ khi đạt** (Nghe chép ≥80%, Đặt câu `dung_tu && dung_ngu_phap`) → +1 cấp; không đạt **không** ghi; Nói theo **không** ghi | Câu sai thường do ngữ pháp/nghe, không phải quên từ; nhận dạng giọng không ổn định |
| D8 | Migration mới cho production? | Tôi viết file migration + cập nhật `schema.sql`; **bạn chạy trước khi merge PR** | Session không có quyền Cloud SQL |
| D9 | Thay `lottie-react` bằng bản `lottie_light` để hết `eval`? | **Thử**; nếu animation dùng expression hiển thị khác (so ảnh) thì giữ nguyên | An toàn, có đường lùi |
| D10 | Xoá `RewardProgressBar.jsx` (không còn dùng)? | **Xoá** | Code chết, HANDOFF 45 đã ghi |
| D11 | Nén lại 68 MB video thưởng? | **Không** trong lượt này | Bạn đã chọn giữ; cần soát chất lượng bằng mắt |
| D12 | IPA cho 240 từ lộ trình lấy từ đâu? | **Tôi tự soạn** (giọng Mỹ), đánh dấu cần soát; bạn soát 20 từ mẫu | Không tốn hạn mức Gemini, không vướng bản quyền |
| D13 | Import Excel: hỗ trợ `.xlsx`? | **Không**; nhận `.csv` / `.tsv` + dán từ Excel (đã có) | Thư viện xlsx nặng, bản npm có lỗ hổng chưa vá |
| D14 | Hàng ôn hợp nhất | `/review` thêm nhóm "Câu bài tập" **sau** thẻ đến hạn; giữ trang `/khoa-hoc/on-tap` | Một điểm vào, không đổi 2 nơi ghi SRS |
| D15 | Cảnh báo lint | Chỉ dọn trong file đang sửa | Tránh diff lan rộng (`CLAUDE.md` §3) |

## 3. Danh sách việc theo thứ tự chạy

### GĐ 1 — Sửa lỗi & an toàn

| # | Việc | Xong khi |
|---|---|---|
| 1.1 | `nhapCauMau.test.js`: test cần CSV riêng → `{ skip: !fs.existsSync(...) }` | `npm test` backend 0 lỗi trên checkout sạch |
| 1.2 | `npm audit fix` backend (không `--force`) | 0 critical/high; test backend đạt; `require('nodemailer')` + `createTransport` chạy |
| 1.3 | D1: `canReadDeck` cho phép bộ `user_id NULL` thuộc lộ trình; `roadmapController` đọc bộ lộ trình cho người đăng nhập; ghi vẫn chặn | Test: khách/A/B đọc bộ lộ trình; A không đọc bộ riêng của B, không đọc bộ mẫu ngoài lộ trình; A không sửa bộ lộ trình |
| 1.4 | Axios `timeout` (15s thường, 60s cho AI/stream không áp) + trang học có trạng thái lỗi "Thử lại" khi hết giờ | Test: request treo → báo lỗi; phản hồi muộn của request cũ không ghi đè |
| 1.5 | Cập nhật `CLAUDE.md` §5 câu chính sách đọc bộ cho khớp D1 | — |

### GĐ 2 — Trải nghiệm học

| # | Việc | Xong khi |
|---|---|---|
| 2.1 | D14 hàng ôn hợp nhất: `/review` lấy `GET /course-questions/due`, hiện sau thẻ đến hạn, dùng `BaiTapKhoaHoc onTap`; badge menu = thẻ + câu | Test đếm; người không có khoá → không gọi API khoá |
| 2.2 | D5 mục tiêu ngày: cài đặt `muc_tieu_ngay`, vòng tiến độ ở Dashboard + màn kết quả ("Còn N lượt") | Test đếm lượt hôm nay theo giờ VN; giảm chuyển động → không animate |
| 2.3 | D6 giới hạn từ mới/ngày: `useBoTuHoc`/`/practice` lọc "Chưa học" tôn trọng hạn còn lại; Dashboard ưu tiên "Ôn đến hạn → Từ mới" | Test: đã học 15 từ mới → phiên mới chỉ có từ đã học |
| 2.4 | D7 Luyện câu ghi SRS: migration 017 thêm `luyen-cau` vào ENUM `mode`, `nghe-chep`/`dat-cau` vào `question_type`; `VALID_MODES`; `TrangLuyenCau` tạo phiên + gửi đáp án đạt; nhãn `TEN_CHE_DO`/`modeLabel`. Thiếu ENUM → FE vẫn chạy, chỉ không ghi | Test controller + hook; theo checklist HANDOFF mục 6 |
| 2.5 | Nút "Dịch câu" ở Ngữ cảnh (cột bản dịch migration 016; chưa có thì ẩn nút) | Test hiện/ẩn |
| 2.6 | Gõ từ: gợi ý từng bước (chữ đầu → số ký tự → nửa từ); dùng gợi ý thì câu đúng không +1 cấp (giống tắt gợi ý ở Lv≥3) | Test `phienHoc` |
| 2.7 | Màn kết quả: "Từ yếu nhất" (5 từ sai nhiều nhất từ `mistakeNotebook`) + nút ôn ngay | Test chọn 5 từ |
| 2.8 | D12 IPA 240 từ trong `lo-trinh.json` + test định dạng `/.../` | `noiDungLoTrinh.test.js` đạt; cần `seed:roadmaps` (mục 4) |
| 2.9 | Công tắc "Hiện mèo học cùng" ở Cài đặt giao diện | Tắt → không tải chunk mèo |

### GĐ 3 — Chức năng

| # | Việc | Xong khi |
|---|---|---|
| 3.1 | D13 nhập `.csv`/`.tsv` trong "Thêm nhanh" (đọc file → cùng parser dán danh sách) | Test parser: dấu phẩy trong ngoặc kép, BOM UTF-8, trùng từ |
| 3.2 | Xuất bộ ra CSV (UTF-8 BOM để Excel đọc đúng tiếng Việt) ở chi tiết bộ | Test xuất → nhập lại ra cùng dữ liệu |
| 3.3 | Email nhắc: nêu số từ đến hạn + buổi học tiếp; cài đặt tắt email (cột `user_preferences`, migration 018 nếu cần; thiếu cột → coi như bật) | Test template + lọc người tắt |

### GĐ 4 — Hiệu năng (đo → sửa → đo lại)

| # | Việc | Xong khi |
|---|---|---|
| 4.1 | Đo trước: build + `rollup-plugin-visualizer` (devDependency), Lighthouse mobile chạy local bản `vite preview` + API giả cho `/`, `/decks`, một trang học | Bảng số trước/sau ghi vào HANDOFF |
| 4.2 | Tách chunk `index` 437 KB: thư viện chỉ vài trang dùng → `lazy`/`import()`; mục tiêu chunk đầu < 300 KB | Build đo được |
| 4.3 | D9 `lottie_light` | Hết cảnh báo `eval`, ảnh màn chờ/streak không đổi |
| 4.4 | Backend: thêm `compression`; rà truy vấn `/courses`, `/decks?scope=learnable`, `/reviews` theo `schema.sql`, index thiếu → migration 019 | Test; liệt kê index đề xuất |
| 4.5 | D10 xoá `RewardProgressBar.jsx` | Build/lint đạt |

### GĐ 5 — Kết thúc

| # | Việc |
|---|---|
| 5.1 | Cập nhật `HANDOFF.md` (bảng mục 3, mục 4 việc treo, mục 5 migration chưa chạy 017–019), `PROJECT_CONTEXT.md` |
| 5.2 | Mở PR vào `main`, ghi rõ: migration cần chạy trước merge, lệnh `seed:roadmaps`, checklist mục 4 |

## 4. Việc không tự động được — cần người dùng

1. Chạy migration 014–016 (nếu chưa) và **017–019** lên Cloud SQL **trước khi merge PR**.
2. `npm run seed:roadmaps` sau merge (nạp IPA lộ trình).
3. Nghiệm thu trên tài khoản thật: sửa thẻ giữ metadata, file nghe khoá học, Google OAuth đúng origin, lưu phiên sau deploy, Luyện câu ghi tiến độ, hàng ôn hợp nhất.
4. Kiểm tra Cloud Scheduler còn gọi `/api/cron/daily-reminders` và `/api/cron/praise`.
5. Sinh luyện thêm bài 1–12, 14–48 (`sinh:luyen-them`) khi hạn mức Gemini cho phép — nội dung riêng, không commit.
6. Soát 20 IPA mẫu (D12).
