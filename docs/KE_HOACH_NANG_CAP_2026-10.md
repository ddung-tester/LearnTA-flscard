# Kế hoạch nâng cấp LearnTA — 10/2026

> Lập 2026-10-09 từ `HANDOFF.md` (mục 1–48), `docs/BUG_AUDIT_2026-10-05.md`, `docs/STUDY_IDEMPOTENCY_2026-10-08.md` và một lần chạy kiểm tra trên checkout hiện tại. Làm theo `CLAUDE.md`: mỗi giai đoạn thay đổi tối thiểu, có test, chạy đủ kiểm tra rồi mới push.

## 0. Hiện trạng đo được (2026-10-09)

| Hạng mục | Kết quả |
|---|---|
| Backend `node --test test/*.test.js` | 118 đạt / **2 lỗi** / 1 bỏ qua — `test/nhapCauMau.test.js` đọc `database/private-content/cau-mau/tu-vung-day-du.csv` (thư mục `.gitignore`) → **CI backend (`npm test`) sẽ đỏ** trên máy không có nội dung riêng |
| Frontend `vitest` | 154/154 đạt |
| Frontend lint | 0 lỗi / 23 cảnh báo (`set-state-in-effect`, `exhaustive-deps`) |
| Build | Đạt; cảnh báo chunk > 500 KB và `eval` (Lottie) |
| Chunk lớn nhất | `CanhThe3D` 531 KB (three.js, chỉ trang chủ), **`index` 437 KB (tải ở mọi trang)**, `index.umd` 316 KB, `LoginMascot` 164 KB (Rive), `CauChuyenCuon` 121 KB |
| `npm audit --omit=dev` backend | 5 lỗ hổng: **critical** `proxy-addr`, **high** `nodemailer`, moderate `mysql2`, `qs`, `body-parser` — đều có `npm audit fix` |
| Thư mục `public/media` | 68 MB video thưởng (người dùng chọn giữ) |

## 1. Vấn đề cần người dùng chốt trước (chặn một số mục bên dưới)

1. **Lộ trình khi đã đăng nhập đang trống.** Chính sách A (Đợt 3 của audit) cho người đăng nhập chỉ đọc bộ của mình (`deckController.canReadDeck`, `roadmapController` dùng `d.user_id <=> ?`). Nhưng bộ lộ trình là bộ mẫu `user_id NULL` → tab **Từ vựng → Lộ trình** và `/roadmap/:slug` không còn từ cho người đăng nhập, trái với `HANDOFF.md` mục 2. Phương án:
   - (a) Ngoại lệ: người đăng nhập đọc được bộ `user_id NULL` **thuộc lộ trình** (chỉ đọc, tiến độ vẫn theo `card_progress.user_id`). *Đề xuất* — ít code, giữ đúng tinh thần "không đọc bộ của người khác".
   - (b) Giữ A, ẩn tab Lộ trình khi đăng nhập.
   - (c) Nút "Sao chép sang bộ của tôi" (HANDOFF 4.5) thay cho đọc trực tiếp.
2. **Game hoá** (HANDOFF 4.3) vẫn mâu thuẫn `PRODUCT.md` (anti-reference coin/shop/leaderboard). Kế hoạch này **không** làm game hoá; nếu muốn thì chốt và sửa `PRODUCT.md` trước.
3. **Nguồn mở rộng từ vựng** (NGSL/TSL, CC BY-SA) — chưa chốt (HANDOFF 4.4).

## 2. Giai đoạn đề xuất (làm lần lượt, push sau mỗi giai đoạn)

### GĐ 1 — Sửa lỗi & an toàn (ưu tiên cao nhất, nhỏ, ít rủi ro)

| # | Việc | Kiểm chứng |
|---|---|---|
| 1.1 | `nhapCauMau.test.js`: bỏ qua (`t.skip`) các test cần file CSV riêng khi file không tồn tại, giống test MySQL opt-in. Không xoá test. | `npm test` backend sạch trên checkout không có `private-content` |
| 1.2 | `npm audit fix` backend (không `--force`), rồi chạy lại test. `nodemailer` vẫn dùng cho email nhắc học → sau khi nâng cấp, thử gửi 1 email. | audit 0 critical/high; 121 test đạt |
| 1.3 | Lộ trình khi đăng nhập theo phương án chốt ở mục 1.1. | test quyền: khách/A/B đọc bộ lộ trình, A không đọc bộ riêng của B |
| 1.4 | Timeout cho request API (audit P2 còn lại): axios `timeout` + UI thoát loading, có "Thử lại". | test hook: request treo → báo lỗi; request cũ trả muộn không ghi đè |
| 1.5 | Nghiệm thu còn treo trên tài khoản thật (audit P1, HANDOFF 4.2): CRUD metadata thẻ, audio Cloud Storage, lưu phiên sau deploy migration 015/016, Google OAuth đúng origin. **Người dùng tự đăng nhập**; tôi chuẩn bị checklist. | checklist ký từng dòng |
| 1.6 | Xác nhận migration 014/015/016 đã chạy trên Cloud SQL production (HANDOFF mục 5 chỉ ghi tới 013). | `SHOW COLUMNS` / `SHOW INDEX` khớp `schema.sql` |

### GĐ 2 — Trải nghiệm học (giá trị chính cho người học)

Mục tiêu: mỗi lần mở app biết ngay "hôm nay học gì, mất bao lâu", và thời gian học chuyển thành trí nhớ thật.

| # | Việc | Ghi chú |
|---|---|---|
| 2.1 | **Hàng đợi ôn hợp nhất**: `/review` gộp thẻ đến hạn + câu bài tập khoá học đến hạn (HANDOFF 4.5), một nút "Ôn hôm nay (N)". | Không đổi luật SRS; chỉ gộp hàng đợi ở FE, hai nơi ghi giữ nguyên |
| 2.2 | **Mục tiêu ngày** (vd. 10/20/30 từ hoặc 10/20 phút) trên Dashboard, vòng tiến độ đầy dần; nhớ ở `user_settings`. | Không phải game hoá: không coin/xếp hạng |
| 2.3 | **Giới hạn từ mới/ngày** (mặc định 10–20) để hàng ôn không phình; Dashboard ưu tiên "ôn đến hạn → từ mới". | Một tham số cài đặt, đọc ở `useBoTuHoc` |
| 2.4 | **Luyện câu ghi vào tiến độ**: Nghe chép/Đặt câu đạt → tính là một lần trả lời đúng của thẻ (đi qua `POST /study-sessions/:id/answers`, ENUM mới qua migration). | Cần migration + `VALID_MODES`; theo checklist HANDOFF mục 6 |
| 2.5 | Nút "Dịch câu" ở Ngữ cảnh (migration 016 đã thêm bản dịch ví dụ) và gợi ý từng bước (chữ cái đầu → số ký tự) ở Gõ từ trước khi coi là sai. | |
| 2.6 | Màn kết quả: "Từ hay nhầm hôm nay" + một nút ôn ngay 5 từ yếu nhất. | Dùng dữ liệu `mistakeNotebook` sẵn có |
| 2.7 | Bộ lộ trình chưa có `pronunciation` (HANDOFF 34) → bổ sung IPA cho 240 từ tự soạn để sóng âm/IPA hiện đủ. | Nội dung, cập nhật `lo-trinh.json` + `seed:roadmaps` |
| 2.8 | Công tắc ẩn mèo học cùng (HANDOFF 36 ghi chưa có) trong Cài đặt giao diện. | |

### GĐ 3 — Chức năng

| # | Việc | Ghi chú |
|---|---|---|
| 3.1 | Import CSV/Excel vào bộ của tôi (mở rộng "Thêm nhanh" đang nhận dán). | Parse ở FE, gửi theo lô có sẵn |
| 3.2 | Xuất bộ ra CSV (sao lưu). | |
| 3.3 | "Sao chép sang bộ của tôi" cho bộ lộ trình (nếu chọn 1.1c thì làm ở GĐ1). Bộ khoá học **không** sao chép (nội dung trả phí). | |
| 3.4 | Nhắc học: email nhắc/khen đã có (`reminderService` + `cronRoutes`, 23:00 và 18:00 VN). Bổ sung: nội dung nêu số từ đến hạn + buổi học tiếp, công tắc tắt email và giờ nhắc trong Cài đặt. Web Push cần service worker (HANDOFF 42 cố ý không dùng) — **chốt với người dùng**. | Kiểm tra Cloud Scheduler còn gọi 2 endpoint |
| 3.5 | Sinh bài luyện thêm cho bài 1–12, 14–48 (`sinh:luyen-them`) khi hạn mức Gemini cho phép. | Nội dung riêng, không commit |

### GĐ 4 — Hiệu năng

| # | Việc | Kiểm chứng |
|---|---|---|
| 4.1 | Phân tích chunk `index` 437 KB (tải ở mọi trang) bằng `rollup-plugin-visualizer`/`vite --debug`; tách thư viện chỉ dùng ở vài trang (`motion`, `tenseExamples`, `axios` cũ…) và route khách không cần. | chunk đầu giảm, đo trước/sau |
| 4.2 | `index.umd` 316 KB: xác định thư viện (nhiều khả năng Lottie/Rive), đảm bảo chỉ tải lười. Thay `lottie-react` bằng bản `lottie_light` để hết cảnh báo `eval` nếu không dùng expression. | build không còn cảnh báo `eval` |
| 4.3 | Đo Web Vitals (LCP/INP/CLS) trên production bằng Lighthouse mobile cho `/`, `/dashboard`, một trang học; đặt ngân sách trong README. | số liệu ghi vào HANDOFF |
| 4.4 | Backend: rà các truy vấn `GET /courses`, `/decks?scope=learnable`, `/reviews` (EXPLAIN) và index còn thiếu; backend chưa dùng `compression` — thêm nếu Cloud Run/Vercel chưa nén JSON (kiểm tra header `content-encoding` trước). | EXPLAIN không full scan bảng lớn |
| 4.5 | Video thưởng 68 MB: chỉ đề xuất nén lại (AV1/HEVC + H.264 dự phòng) nếu người dùng đồng ý; đang chọn giữ. | |

### GĐ 5 — Nợ kỹ thuật (làm xen kẽ, chỉ khi đụng tới file đó)

- Tách `TrangChiTietBo.jsx` (1776 dòng), `TrangTuLuan.jsx` (1557), `TrangFlashcard.jsx` (1082), `TrangOnTapHomNay.jsx` (1013) theo khung phiên dùng chung (`HANDOFF` mục 2), chỉ khi có tính năng cần sửa ở đó.
- 23 cảnh báo lint: dọn dần trong file đang sửa.
- `RewardProgressBar.jsx` không còn dùng (HANDOFF 45) — xoá khi người dùng đồng ý.

## 3. Thứ tự đề xuất

1. Chốt 3 câu hỏi ở mục 1.
2. GĐ 1 (1.1 → 1.2 → 1.3 → 1.4; 1.5/1.6 cùng người dùng).
3. GĐ 2 theo thứ tự 2.1 → 2.2/2.3 → 2.4 → còn lại.
4. GĐ 4.1–4.3 (đo trước khi tối ưu).
5. GĐ 3 theo nhu cầu.

Mỗi giai đoạn xong: `npm test` (BE) + `npx vitest run` + `npx vite build` + `npm run lint` (FE), cập nhật bảng mục 3 của `HANDOFF.md` và `PROJECT_CONTEXT.md` khi đổi route/bảng/luồng.
