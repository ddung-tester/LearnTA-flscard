# HANDOFF.md — Bàn giao cho AI/dev làm tiếp

> Cập nhật: 2026-09-26. Đọc file này TRƯỚC, rồi đọc `CLAUDE.md` (quy tắc làm việc), `PROJECT_CONTEXT.md` (trạng thái kỹ thuật chi tiết), `PRODUCT.md` (định hướng sản phẩm), `README.md` (chạy local + deploy).

## 1. Mục tiêu

Người dùng (chủ dự án) muốn website **giống luyentu.com "từ trải nghiệm đến phương thức học"**, và đã chọn **"giống tất cả"** (cả phương pháp học lẫn game hóa). Được phép sửa DB + BE + FE. **Bắt buộc giữ** phần hiển thị câu mẫu và 6 thì (`TenseExamplesCard`, `data/tenseExamples.js`).

Cách phân tích luyentu: SPA nên đọc mã bundle JS công khai của họ. **Không được sao chép dữ liệu, tên, ảnh, câu chữ của luyentu** (bản quyền) — nội dung lộ trình do dự án tự soạn.

Ngôn ngữ giao tiếp với người dùng: **tiếng Việt**. Giữ phong cách đặt tên tiếng Việt (không dấu) trong code và văn bản tiếng Việt có dấu cho UI.

## 2. Đã làm (tất cả đã commit + push lên `origin/main`)

| Bước | Nội dung | Ghi chú chính |
|---|---|---|
| 1 | **Gộp SRS về một luật** | Lv0–Lv5, khoảng ôn 0/1/3/7/14/30 ngày (Lv≥1 đến hạn 00:00 giờ VN). Đúng +1 cấp, sai −1 cấp và ôn ngay. Luật ở `backend/src/utils/srs.js`, bản sao ở `frontend/src/utils/srsReview.js`. Nguồn duy nhất: bảng `card_progress`. Bảng `card_reviews` bỏ dùng (migration 007 gộp dữ liệu). Lv5 vẫn quay lại khi đến hạn. `/review` đổi 4 nút Lại/Khó/Ổn/Dễ thành Quên/Thuộc + chọn Lv0–5. |
| 2 | **Khung phiên học dùng chung** | `utils/phienHoc.js`, hooks `useBoTuHoc` / `usePhanThuongPhien` / `useLuuKetQuaPhien`, components `TheCauHoiPhien`, `ThanhTienDoPhien`, `CaiDatPhienHoc`, `TheTrangThaiPhien`, `PhanHoiDung` (câu mẫu + 6 thì), `DanhSachDapAn`. `TrangQuiz` 1371→~690 dòng. `StudyResult`: danh sách đúng/sai kèm level mới, "Làm lại câu sai". |
| 3 | **4 chế độ mới** | Nghe viết (`/nghe-viet`, TrangTuLuan loai="nghe-viet"), Ngữ cảnh (`/ngu-canh`, TrangQuiz loai="ngu-canh"), Nối từ (`/noi-tu`, TrangNoiTu), Hỗn hợp (`/hon-hop`, TrangTuLuan loai="hon-hop"). Migration 008 mở rộng ENUM `mode`/`question_type`. |
| 4 | **Trang Luyện tập + ôn theo level** | `/practice` (chọn bộ, lọc Tất cả/Chưa học/Đã học, Ngẫu nhiên/Theo thứ tự, 10–200 từ, chọn chế độ). URL học nhận `?filter=&sort=&q=&n=&random=`. `/review`: mỗi level chọn chế độ Thẻ/Trắc nghiệm/Gõ từ (mặc định Lv0 thẻ, Lv1–2 trắc nghiệm, Lv3–5 gõ; từ Lv3 tắt gợi ý). Sửa lỗi "ngẫu nhiên" ra cùng thứ tự mỗi lần (seed `taoHatGiong`). |
| 5 | **Lộ trình** | `/roadmap`, `/roadmap/:slug`, API `GET /api/roadmaps[/:slug]`, bảng `roadmaps` + `roadmap_decks` (migration 009). 3 lộ trình × 4 chặng × 20 từ = **240 từ tự soạn** trong `backend/database/content/lo-trinh.json`. Nạp bằng `npm run seed:roadmaps` (chạy lại an toàn, không xoá từ cũ). `GET /decks` **không** trả các bộ thuộc lộ trình. |
| 6 | **Thêm từ nhanh** | Nút "Thêm nhanh" ở trang chi tiết bộ: tab dán danh sách (`từ \| /phiên âm/ \| loại từ \| nghĩa \| ví dụ \| ghi chú`, vẫn nhận "từ - nghĩa", dán từ Excel, có prompt ChatGPT) và tab AI tạo từ theo chủ đề/đoạn văn (`POST /api/cards/generate-words`, Gemini, rate limit 15 req/10 phút). Loại từ trùng. |

Test lúc bàn giao: frontend 67/67 (vitest), backend 38/38 (`node --test`), `vite build` OK. Lint frontend không có lỗi mới (còn lỗi cũ, xem mục 6).

## 3. CHƯA làm / việc treo — ưu tiên từ trên xuống

### 3.1 Deploy — ĐÃ XONG (2026-09-26)
Người dùng tự chạy migration 007/008/009 và deploy backend (revision `flashcard-backend-00078`). Seed lộ trình đã chạy (`npm run seed:roadmaps` qua proxy: 3 lộ trình, 12 bộ, 240 từ). Smoke test OK: `/api/health`, `/api/db-test`, `/api/roadmaps` trả 3 lộ trình. Proxy chạy được bằng `cloud-sql-proxy.x86.exe` (ADC của gcloud đã có trên máy) hoặc cấu hình `cloud-sql-proxy` trong `.claude/launch.json`. Phần dưới giữ lại để tham khảo khi deploy lần sau.

**Thứ tự bắt buộc:**
1. Chạy migration **007 → 008 → 009** (`backend/database/migrations/`) lên Cloud SQL. Nếu deploy BE trước khi có 009, `GET /decks` sẽ lỗi (truy vấn đọc `roadmap_decks`).
2. Deploy backend: `cd backend && gcloud run deploy <tên-service> --source . --region asia-southeast1` (env var đã set sẵn trên Cloud Run, xem `README.md`).
3. Chạy `npm run seed:roadmaps` trong `backend/` (qua proxy) để nạp 240 từ.
4. Kiểm tra: `/api/health`, `/api/db-test`, `/api/roadmaps`, mở `/roadmap` và `/practice` trên Vercel.

Cách chạy migration khi có proxy (ví dụ): mở `cloud-sql-proxy.x86.exe flash-card-499907:asia-southeast1:flashcard-mysql --port=3307`, rồi chạy file SQL bằng client MySQL hoặc script Node (mẫu kết nối: `backend/scripts/run-migration.js`, đọc `DB_*` từ `.env`). Migration 007 có sẵn kịch bản kiểm thử logic (bảng tạm) — nên thử trên DB tạm trước.

### 3.2 Kiểm tra bằng trình duyệt thật — đã thử phần khách (2026-09-26)
Đã bấm thử trên production ở chế độ **khách**: `/roadmap`, `/roadmap/:slug`, `/practice?bo=`, Nối từ (ghép sai/đúng, 2 vòng, kết quả, "Làm lại câu sai"), Hỗn hợp (câu sai quay lại sau 5 câu, "Làm lại câu sai"), Ngữ cảnh (240 câu đều che đúng từ), Nghe viết (tự đọc khi sang câu), responsive điện thoại `/practice` + `/roadmap`. Đã sửa:
- Xáo trộn "ngẫu nhiên" ra từng cụm id liền nhau (FNV-1a không trộn ký tự cuối; 2 cột Nối từ gần như thẳng hàng) → thêm bước trộn fmix32 trong `taoSoTuSeed`.
- Gõ nghĩa bắt gõ nguyên chuỗi "anh trai, em trai" → `khopDapAn` nhận một nghĩa bất kỳ (tách `,` `;` `/`).
- Khách không tìm được nội dung mẫu (production không còn deck mẫu nào ngoài lộ trình, `GET /decks` bỏ bộ lộ trình) → khách thấy tab "Lộ trình" trên header, nút phụ trang chủ đổi thành "Xem lộ trình học" → `/roadmap`. Màn ≤420px ẩn chữ "Streak Drop" (vẫn `sr-only`) để header không tràn.
- "Ví dụ 6 thì" của 240 từ lộ trình là câu khuôn mẫu vô nghĩa → đã sinh `tense_examples` bằng `node scripts/seed-ai-examples.js --apply` (Gemini). Khi thêm từ lộ trình mới, chạy lại script này (chỉ điền thẻ còn `NULL`).

- Header khi **đã đăng nhập** (4 tab + avatar) tràn ngang trên điện thoại (434px/375px) → ở ≤560px tab xuống hàng dưới, chia đều (`.dash-nav__tabs--day-du`); đã kiểm tra 320px, 375px, desktop, khách, `/login`.

Phát hiện, **chưa sửa**:
- Khách làm bài gọi `/user/stats` và `/mistakes/bulk` → 401 trong console (không vỡ luồng).
- Mở chatbot khi đang ở câu gõ từ/nghe viết thì gợi ý "Giải thích từ "family"" lộ đáp án.
- Ô chọn bộ từ ở `/practice` trên điện thoại hẹp, tên bộ bị cắt.

Còn **chưa thử** (cần tài khoản): `/review`, `/practice` khi đăng nhập, Thêm nhanh (dán + AI Gemini). Danh sách gốc:
- Mỗi chế độ: làm hết phiên → "Làm lại câu sai". Nghe viết: máy có tự đọc khi sang câu (trình duyệt có thể chặn autoplay). Hỗn hợp: chọn sai câu trắc nghiệm rồi Enter → câu quay lại sau ~5 câu. Nối từ: bộ có 2 từ trùng nghĩa phải ghép chéo được.
- `/practice`: đổi bộ/bộ lọc → số từ cập nhật; "20 từ + ngẫu nhiên" mở 2 lần ra 2 bộ khác nhau.
- `/review`: đặt Lv0=Gõ từ, Lv1=Trắc nghiệm; trả lời sai → từ về cuối hàng.
- Thêm nhanh (dán + AI) cần `GEMINI_API_KEY` thật — **prompt AI chưa được thử với Gemini thật**.
- Responsive điện thoại của `/practice`, `/roadmap`.

### 3.3 Game hóa (chưa làm — phần còn lại để "giống tất cả")
Luyentu giữ chân bằng: **coin** (Flashcard +5, Trắc nghiệm/Nối/Gõ +10, Nghe viết +15, Tổng hợp +20; làm lại không cộng), **cửa hàng** (avatar, hình nền, "Đá hồi streak" lấp 1 ngày trống trong 14 ngày qua), **bảng xếp hạng streak**, **chuỗi chung** với bạn bè (mời bằng email, khôi phục 500 xu), chat cộng đồng, nhắc học. **Xung đột định hướng**: `PRODUCT.md` đang ghi anti-reference "Heavy gamification (streaks, badges, excessive popups)". Người dùng đã chọn "giống tất cả" nên **phải sửa PRODUCT.md** trước/cùng khi làm. Hiện đã có: streak, combo, video reward (`RewardTikTokEffect`), `streak_logs`, `users.total_xp`. Đề xuất: bảng `user_coins`/`coin_transactions`, `shop_items`/`user_items`, cộng coin khi lưu phiên (chỉ lượt đầu, không cộng lượt làm lại), rồi shop, rồi leaderboard.

### 3.4 Nội dung lộ trình
240 từ mới là bộ khởi đầu. Muốn mở rộng: danh sách giấy phép mở (NGSL ~2.800 từ, TSL ~1.200 từ TOEIC, NAWL — CC BY-SA 4.0, phải ghi nguồn) chỉ có từ tiếng Anh, cần thêm nghĩa Việt + câu ví dụ (AI hoặc soạn tay). Có thể dùng chính tính năng "Tạo bằng AI" hoặc mở rộng `seed-roadmaps.js`. **Chưa hỏi/chốt nguồn với người dùng.** Test `noiDungLoTrinh.test.js` bắt buộc mỗi câu ví dụ chứa chính từ (để Ngữ cảnh dùng được) và số từ tổng = 240 (sửa con số này khi thêm nội dung).

### 3.5 Khác luyentu (chưa làm, mức ưu tiên thấp)
- Giới hạn 30 giây/câu ở Trắc nghiệm/Nghe/Gõ.
- Nút "Dịch câu" ở Ngữ cảnh (thẻ chưa lưu bản dịch câu ví dụ; có thể dùng `tense_examples[].translation` hoặc thêm cột).
- Nhóm "Đặc biệt": Flappy Bird, Giải cứu khỉ, Đặt câu (Đặt câu có thể dùng Gemini sẵn có).
- Trắc nghiệm ở `/review`: đáp án nhiễu lấy từ chính hàng ôn (cần ≥4 từ, nếu không tự dùng Thẻ).
- Import Excel/CSV (.xlsx), AI tạo từ từ **ảnh**, extension Chrome, PWA/cài như app, gói Pro/thanh toán, shared deck/copy bộ từ, thư viện cộng đồng, lớp học.
- Dashboard/Home chưa có ô "Luyện tập"/"Lộ trình" nổi bật; `TrangChu` vẫn theo `PRODUCT.md` (entry point, không phải landing marketing).
- `PROJECT_CONTEXT.md` mục "Việc còn tồn đọng" còn nhắc `TrangChiTietBo.jsx` (~1800 dòng) và `TrangTuLuan.jsx` (~1300 dòng) quá lớn.

## 4. Kiến trúc cần nắm nhanh (chi tiết: `PROJECT_CONTEXT.md`)

- FE: React 19 + Vite + Tailwind 4 + token trong `index.css`; BE: Express 5 + MySQL2; DB: Cloud SQL MySQL 8.
- **Luật SRS**: 1 nơi ghi duy nhất. Quiz/Tự luận/Nghe viết/Ngữ cảnh/Hỗn hợp/Nối từ ghi qua `POST /study-sessions/:id/answers` (server áp luật); Flashcard và `/review` ghi qua `PATCH /reviews/by-card/:cardId/result` (`{result:"correct"|"wrong"}` hoặc `{level:0-5}`). `StudyResult` chỉ cập nhật bản **local** (server đã tự áp) — đừng gửi thêm để tránh cộng 2 lần. `POST /reviews/bulk` chỉ thêm từ chưa có tiến độ (không ghi đè level server).
- **Tái sử dụng khi thêm chế độ mới**: ghép từ khung phiên (mục 2, bước 2) thay vì copy trang. `TrangQuiz` và `TrangTuLuan` nhận prop `loai`; thêm route trong `App.jsx`, thêm regex `laPhienHoc` trong `BoCuc.jsx` (ẩn thanh điều hướng khi đang học), thêm khoá cài đặt trong `utils/caiDatHocTap.js`, thêm giá trị ENUM (migration mới + `schema.sql` + `VALID_MODES`/`VALID_QUESTION_TYPES` trong `studyController.js`), thêm nhãn trong `StudyResult` (`TEN_CHE_DO`) và `TrangThongKe` (`modeLabel`).
- Quyền deck: đọc được nếu deck mẫu (`user_id NULL`), `is_public`, hoặc của mình; ghi chỉ chủ deck. Bộ thuộc lộ trình là deck mẫu.
- Cài đặt học lưu localStorage (`learnta_user_study_settings`) + đồng bộ `user_settings` (chỉ direction/random/reward).
- Cấu hình bắt buộc theo `CLAUDE.md`: anonymous chỉ thấy deck `user_id IS NULL`; không thêm tài khoản demo seed; UI đăng nhập gọn dùng `ui-form-panel`/`ui-button`.

## 5. Cách chạy & kiểm tra

```powershell
# Backend (cần backend/.env + Cloud SQL proxy cho DB thật; test không cần DB)
cd backend; npm ci; npm test            # node --test, kỳ vọng 38 pass
# Frontend
cd frontend; npm ci; npx vitest run     # kỳ vọng 69 pass
npx vite build; npx eslint <file>
```
Mẹo môi trường (Windows): file repo dùng LF trong working copy nhưng Git cảnh báo CRLF; khi sửa hàng loạt bằng script hãy giữ nguyên kiểu xuống dòng. Script sửa nhiều chỗ nên ghi ra file rồi chạy (chuỗi dài trong `node -e` dễ vỡ quote trên bash).

## 6. Vấn đề đã biết (có sẵn, không phải do các bước trên)

- Frontend lint còn lỗi cũ: `react-hooks/set-state-in-effect` ở `TrangFlashcard.jsx`, `StudyResult.jsx` (`AnimatedNumber`), `BoCuc.jsx`, `TrangChiTietBo.jsx`, `RewardTikTokEffect.jsx`. CI đang để lint `continue-on-error`.
- `resend` trong `backend/package.json` không dùng (email qua Nodemailer).
- Video reward ~70 MB trong `frontend/public/media/milestones/` và lịch sử git.
- `schema.sql` chưa có `cards.tense_examples` và `user_settings.email_reminders` (thêm bằng script riêng — xem `PROJECT_CONTEXT.md`).
- Migration 007 chưa được chạy thử trên MySQL thật (chỉ kiểm bằng lý luận + test JS của controller); nên thử trên bản sao DB trước khi chạy production.
- Bảng `card_reviews` giữ lại để đối chiếu, code không còn đọc/ghi; có thể xoá sau khi xác nhận migration 007 đúng.

## 7. Plan đề xuất cho người làm tiếp

1. ~~**Deploy** (mục 3.1)~~ — xong 2026-09-26.
2. **Bấm thử** phần cần đăng nhập (mục 3.2) và xử lý các phát hiện chưa sửa ở 3.2.
3. **Chốt với người dùng**: nguồn từ vựng mở rộng (3.4) và đồng ý sửa `PRODUCT.md` để làm game hóa (3.3).
4. **Game hóa** theo thứ tự: coin (cộng khi lưu phiên) → shop → đá hồi streak → leaderboard → chuỗi chung.
5. Các mục thấp ưu tiên ở 3.5 khi cần.

Mỗi bước: theo `CLAUDE.md` — thay đổi tối thiểu, có test, chạy `npm test` (BE) + `npx vitest run` + `vite build` (FE) trước khi báo xong; cập nhật `PROJECT_CONTEXT.md` khi đổi route/bảng/luồng.
