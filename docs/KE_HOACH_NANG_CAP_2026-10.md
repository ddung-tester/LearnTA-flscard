# Kế hoạch tối đa hiệu năng + trải nghiệm — 10/2026

> **Trạng thái 2026-10-09: đã chạy xong** trên nhánh `claude/confident-curie-s3b6ch` (kết quả đo ở mục 6). Q1–Q7 theo khuyến nghị; Q3 (Cloud Run min-instances) và việc ở mục 4 do người dùng làm.

> Lập 2026-10-09. Mục tiêu người dùng: **nhanh và mượt nhất có thể, KHÔNG giảm chất lượng** — giữ nguyên mọi hiệu ứng, 3D, video thưởng, Lottie, font, âm thanh (đúng tinh thần HANDOFF mục 45: không tắt hiệu ứng để đổi lấy tốc độ). Chỉ đổi *cách* tải/vẽ/lấy dữ liệu, không đổi *thứ* người học nhìn thấy.

## 0. Số liệu đo được (build 2026-10-09)

| Điểm | Đo được | Hệ quả |
|---|---|---|
| Chunk `index` (mọi trang) | 437 KB min; nguồn: react-dom 533 KB, react-router 355 KB, **motion-dom + framer-motion 440 KB**, axios 117 KB | Mọi trang phải tải + parse cả bộ animation trước khi vẽ |
| `index.umd` | 316 KB = `lottie-web` bản đầy đủ (có `eval`) | Tải khi màn chờ/streak/emoji động cần |
| `CanhThe3D` | 531 KB (three.js), đã lazy, chỉ trang chủ | Giữ |
| Cache tĩnh Vercel | `vercel.json` chỉ đặt cache cho `/media/*`; `/assets/*` (file có hash) **không** có `immutable` | Mỗi lần mở app trình duyệt hỏi lại server cho từng chunk |
| Font | 3 họ Google Fonts (Be Vietnam Pro 7 kiểu, Bricolage, JetBrains Mono) qua 2 domain ngoài | Thêm 2 kết nối + CSS chặn vẽ |
| Backend | **Không nén** response (không `compression`) | JSON bộ từ/khoá học gửi nguyên |
| Dashboard | `Promise.all` 5 request; `taiSRSDongBo` + `taiTuSaiDongBo` tải **tuần tự từng trang 200 dòng** (`taiTatCaTrangReviews`) — tài khoản ~1.300+ thẻ = 7+ vòng mạng nối tiếp; màn chờ giữ tới khi xong hết | Dashboard chậm tỉ lệ với số thẻ đã học |
| Cache dữ liệu | Không có; mỗi lần quay lại trang tải lại từ đầu | Quay lại = chờ lại |
| Ghi SRS local | `localStorage.setItem` cả kho JSON mỗi lần ghi | Có thể khựng khi trả lời ở kho lớn (cần đo) |
| `card_progress` | Có `updated_at` nhưng **không index theo (user_id, updated_at)** | Đồng bộ tăng dần cần thêm index |
| CI backend | `test/nhapCauMau.test.js` cần file trong `private-content` → **đỏ** trên CI | Mất cổng chặn chất lượng |

## 1. Nguyên tắc "không giảm chất lượng" (cổng kiểm tra mọi bước)

1. **So ảnh**: chụp các màn chính ở thời điểm animation cố định (desktop 1440 + 390px DPR 3, sáng + đèn bàn) trước và sau; lệch ≤ khử răng cưa (cách đã làm ở HANDOFF 45).
2. **Giữ nguyên** hành vi `prefers-reduced-motion`, `.may-yeu`, âm thanh, thứ tự hiệu ứng đúng/sai.
3. Đo trước → sửa → đo lại; thay đổi không cải thiện số đo thì **hoàn tác**.
4. Trước mỗi commit: backend `node --test test/*.test.js`; frontend `npx vitest run && npm run lint && npx vite build`.
5. Không ghi DB production, không chạy migration lên Cloud SQL (người dùng chạy).

## 2. Quyết định cần người dùng — kèm khuyến nghị (mặc định nếu không trả lời)

| # | Câu hỏi | Khuyến nghị | Lý do |
|---|---|---|---|
| Q1 | Hiện ngay dữ liệu đã lưu lần trước rồi cập nhật ngầm (stale-while-revalidate)? | **Có** | Quay lại trang tức thì; số liệu cũ chỉ tồn tại ~1 giây và tự cập nhật |
| Q2 | Tự host font (cùng file, cùng họ/độ đậm, giấy phép OFL) thay Google Fonts? | **Có** | Hình chữ y hệt, bỏ 2 kết nối ngoài, preload được |
| Q3 | Cloud Run `min-instances=1` để hết khởi động lạnh? | **Đo trước**; nếu cold start > 2 s thì **bật** (tốn khoảng vài USD/tháng; bạn đổi trên GCP) | Khởi động lạnh là độ trễ lớn nhất của lần mở đầu trong ngày |
| Q4 | Migration 017: index `card_progress (user_id, updated_at)` + đồng bộ SRS tăng dần | **Có**; code vẫn chạy khi chưa có index (tải đủ như cũ, song song) | Đồng bộ chỉ còn vài dòng thay vì toàn bộ |
| Q5 | Sửa luôn lỗi tab **Lộ trình trống khi đăng nhập** (`canReadDeck` chặn bộ mẫu `user_id NULL`) | **Có**: người đăng nhập *đọc* được bộ thuộc `roadmap_decks`, không ghi | Trải nghiệm đang hỏng; thay đổi nhỏ |
| Q6 | Nén lại video thưởng 68 MB | **Không** | Nguy cơ giảm chất lượng hình |
| Q7 | Giao kết quả | **Nhánh `claude/confident-curie-s3b6ch`, mỗi giai đoạn 1 commit, cuối cùng 1 PR** để bạn merge (merge = deploy) | Có điểm xem lại trước khi lên production |

## 3. Các giai đoạn (thứ tự chạy)

### GĐ 0 — Đo mốc + cổng chất lượng
| # | Việc | Xong khi |
|---|---|---|
| 0.1 | Sửa CI: test `nhapCauMau` bỏ qua khi thiếu file nội dung riêng | `npm test` backend 0 lỗi trên checkout sạch |
| 0.2 | API giả (Node `http`, scratchpad) với dữ liệu tự soạn cỡ thật (~1.300 thẻ có tiến độ, 48 buổi), trễ 150 ms/request | Các trang đăng nhập chạy được với `localStorage` token giả |
| 0.3 | Script Playwright đo: FCP, LCP, CLS, long task, tổng JS tải, số request, thời gian tới khi màn chờ tắt — cho `/`, `/dashboard`, `/decks`, chi tiết bộ, Flashcard, Quiz, Tự luận, `/review`, bài học khoá học; 390px DPR 3 CPU 4× + desktop | Bảng số "trước" |
| 0.4 | Bộ ảnh chụp mốc cho so ảnh (mục 1.1) | Lưu trong scratchpad |

### GĐ 1 — Tải nhanh (không đổi giao diện)
| # | Việc | Xong khi |
|---|---|---|
| 1.1 | `vercel.json`: `/assets/*` → `public, max-age=31536000, immutable`; `/animation/*`, `/sound/*`, `/icons/*` → 7 ngày + SWR | Header đúng khi `vite preview` qua cấu hình tương đương; kiểm tra lại sau deploy |
| 1.2 | Q2 tự host font woff2 (latin + vietnamese, đúng các độ đậm đang dùng), `preload` 2 kiểu dùng ở màn đầu, giữ `font-display: swap` | So ảnh chữ không lệch; không còn request tới fonts.googleapis.com |
| 1.3 | `motion`: `LazyMotion` + `m` (tính năng `domMax` để giữ `layout`/`AnimatePresence`) — phần tính năng tải lười, chunk đầu nhẹ hơn | Chunk `index` giảm; so ảnh + test animation không đổi |
| 1.4 | Tải trước chunk trang: lúc rảnh (`requestIdleCallback`) tải chunk các mục menu chính; hover/chạm link (và thẻ `data-mo-rong`) tải chunk trang đích | Chuyển trang không còn chờ tải JS (đo bằng trace) |
| 1.5 | Lottie: chỉ chuyển `lottie_light` nếu **cả 3 file** `public/animation/*.json` và emoji Noto mẫu **không** dùng expression; so ảnh từng khung | Hết cảnh báo `eval`; nếu có expression → giữ nguyên, ghi lý do |
| 1.6 | Backend `compression` (gzip/br), **loại trừ** `?stream=1` của giải thích AI và stream audio | Test: JSON có `content-encoding`; stream vẫn ra chữ dần |

### GĐ 2 — Dữ liệu nhanh (cảm nhận tốc độ)
| # | Việc | Xong khi |
|---|---|---|
| 2.1 | Dashboard: màn chờ chỉ chờ `decks` + `stats`; SRS/từ sai đồng bộ ngầm, số "Cần ôn" hiện từ kho local ngay rồi cập nhật | Thời gian tắt màn chờ không còn phụ thuộc số thẻ |
| 2.2 | `taiTatCaTrangReviews`: Q4 có index → `?updated_since=` chỉ tải dòng đổi; chưa có → tải song song các trang (backend trả tổng số) | Test hợp nhất SRS + chống ghi đè chéo tài khoản (giữ test audit Đợt 1) |
| 2.3 | Q1 cache GET nhẹ (bộ nhớ + `sessionStorage`, khoá theo user): decks, courses, stats, chi tiết bộ; ghi/xoá/đổi tài khoản → xoá đúng khoá | Test: đổi user không thấy dữ liệu người trước; ghi xong thấy dữ liệu mới |
| 2.4 | Tải trước dữ liệu khi hover/chạm thẻ bộ/buổi (song song với tờ giấy `TheMoRong` 420 ms) | Mở chi tiết bộ/bài học không còn màn chờ khi mạng bình thường |
| 2.5 | Header `Server-Timing` (thời gian DB) cho các GET chính; rà truy vấn `/decks`, `/courses`, `/study-sessions/summary`, `/user/stats` theo `schema.sql` (N+1, thiếu index) | Danh sách index đề xuất gộp vào migration 017 |
| 2.6 | Timeout request (15 s; không áp cho AI/stream) + nút "Thử lại" ở trang đang chờ | Request treo không giữ màn chờ mãi |

### GĐ 3 — Mượt khi học (giữ nguyên hiệu ứng)
| # | Việc | Xong khi |
|---|---|---|
| 3.1 | Trace mọi màn học ở 390px CPU 4×: tìm animation lặp không phải `transform`/`opacity`, layout thrash, long task khi trả lời | Danh sách điểm nóng có số đo |
| 3.2 | Sửa điểm nóng theo cách HANDOFF 45–47: đưa lên compositor (lớp riêng + `opacity`/`transform`), không đổi hình | So ảnh lệch ≤ khử răng cưa; Paint/StyleRecalc giảm |
| 3.3 | Khởi động phiên học: tải + giải mã trước âm thanh, `canvas-confetti`, `rough-notation`, emoji động của câu đầu → câu trả lời đầu tiên không khựng | Long task lần trả lời đầu < 50 ms |
| 3.4 | Ghi local SRS/từ sai/lịch sử: gộp nhiều lần ghi trong một nhịp, ghi sau khi vẽ phản hồi (`requestIdleCallback`/sau rAF), không chặn hiệu ứng đúng/sai | INP khi trả lời giảm; test dữ liệu không mất khi đóng tab (`pagehide` ghi ngay) |
| 3.5 | Danh sách dài (chi tiết bộ, Từ vựng theo buổi, Sổ từ sai): `content-visibility: auto` + `contain-intrinsic-size` cho hàng ngoài màn | Không đổi hình; cuộn/khởi tạo nhanh hơn |
| 3.6 | Phiên dài 200 câu: heap ổn định, không rò listener/rAF/timer | Heap sau 200 câu ≈ sau 20 câu |

### GĐ 4 — Trải nghiệm
| # | Việc | Xong khi |
|---|---|---|
| 4.1 | Q5 lộ trình khi đăng nhập | Test quyền: đọc được bộ lộ trình, không đọc bộ riêng người khác, không ghi bộ lộ trình |
| 4.2 | CLS ≈ 0 ở các trang đo: giữ chỗ cho emoji động, số đếm, ảnh, khối tải sau | CLS < 0,05 mọi trang |
| 4.3 | Sửa các lỗi trải nghiệm phát hiện trong GĐ 0–3 (ghi lại từng lỗi + cách tái hiện) | Mỗi lỗi có test hoặc ảnh trước/sau |

### GĐ 5 — Đo lại + bàn giao
| # | Việc |
|---|---|
| 5.1 | Chạy lại toàn bộ đo GĐ 0, bảng **trước/sau** + so ảnh |
| 5.2 | Cập nhật `HANDOFF.md` (bảng mục 3, migration 017 chưa chạy), `PROJECT_CONTEXT.md` (cache, đồng bộ tăng dần) |
| 5.3 | Mở PR: số đo trước/sau, việc người dùng cần làm (mục 4) |

## 4. Việc người dùng làm sau khi chạy

1. Chạy migration 017 (index `card_progress`) trên Cloud SQL **trước khi merge**.
2. Q3: xem cold start trong log Cloud Run; nếu > 2 s đặt `min-instances=1`.
3. Sau deploy: mở app trên điện thoại Samsung thật, kiểm tra header cache `/assets/*`, Dashboard, một phiên học, video thưởng.

## 5. Không làm (vì giảm chất lượng hoặc không đáng)

- Không tắt/giảm hiệu ứng, 3D, video, Lottie trên bất kỳ máy nào (ngoài cơ chế `.may-yeu`/giảm chuyển động đã có).
- Không thay `axios` bằng `fetch` (~13 KB gzip, đụng interceptor auth/idempotency — rủi ro cao hơn lợi ích).
- Không thêm service worker (HANDOFF 42).

## 6. Kết quả (đo 2026-10-09)

Môi trường đo: backend thật + MariaDB cục bộ với dữ liệu tự sinh cỡ thật (1.464 thẻ có tiến độ, 48 buổi × 40 câu, 60 phiên học), frontend build production phục vụ như Vercel (nén br, header `vercel.json`), Playwright Chromium 390×844 DPR 3, **CPU chậm 4×, mạng 4G chậm (150 ms, 1,6 Mbps)**. Không đo được GPU/điện thoại thật và giải mã H.264.

Đã làm (theo commit): sửa CI backend; nén JSON + nhớ preflight CORS; cache `/assets` immutable; tự host font; `LazyMotion`; tải trước JS/dữ liệu trang; bộ nhớ đệm GET 20 s; Dashboard không chờ đồng bộ SRS; đồng bộ SRS song song; **sửa lỗi cũ** gửi cả kho SRS mỗi lần mở app (bị từ chối khi > 200 từ); `content-visibility` cho danh sách từ; chatbot không ép layout; video thưởng tải sau khi trang xong + nhớ hàng đợi; kho SRS đọc từ bộ nhớ, ghi lúc rảnh; Flashcard tự xử lý kéo (bỏ projection của motion), bỏ focus trước khi đổi thẻ, khởi tạo âm thanh trước; lộ trình đọc được khi đăng nhập; timeout request.

Không đổi giao diện: so ảnh 12 trang × (390px + 1440px) và 4 trang giảm chuyển động — lệch 0,000% (trừ ảnh chụp toàn trang chi tiết bộ: hàng ngoài màn chưa vẽ do `content-visibility`; khi cuộn thật hiện đủ, lệch chỉ khử răng cưa).

Xem bảng số trong `HANDOFF.md` mục 3 (dòng 49).

---

# Đợt 2 — mượt hơn, ít lag, ít lỗi toàn hệ thống (khảo sát 2026-10-10)

## Khảo sát (backend thật + MariaDB cục bộ, dữ liệu cỡ thật, 390px, CPU 4×)

| Hạng mục | Kết quả |
|---|---|
| Quét lỗi 26 trang khi đăng nhập + 11 trang khách (console, lỗi JS, request ≥ 400) | **Lỗi production: `POST /course-questions/:id/prepare` luôn trả 400 từ 2026-09-29** (middleware chặn POST không có body, app gọi prepare không kèm body) → AI chưa từng được soạn trước, mọi câu phải chờ AI. **Đã sửa + push `101d252`.** Mascot Rive ở trang đăng nhập tải WASM 1,9 MB từ unpkg/jsdelivr (CDN ngoài: lỗi/chặn là mascot hỏng, thêm 2 kết nối). `PATCH /user/settings` 500 chỉ do MariaDB cục bộ (production MySQL 8 không bị). Không có lỗi JS nào. |
| Cuộn (trang chủ, chi tiết bộ, sổ từ sai, thống kê, khoá học, từ vựng theo buổi, lý thuyết) | 59–60 fps, 0 khung rớt — không cần làm. |
| Phản hồi khi học (TB / tệ nhất) | Flashcard 111/144 ms · Tự luận 29/**216** ms (lúc nộp) · Nối từ 64/**256** ms · Bài tập khoá học 47/88 ms · Ôn tập chưa đo được (cần bấm "bắt đầu" trước). |
| Bộ nhớ phiên dài (45 lượt) | Quiz ổn định. **Flashcard: event listener 224 → 363** (~3,5/thẻ), heap +0,9 MB → rò nhỏ. |
| Kho trên máy | Lịch sử phiên giữ tới 300 phiên **kèm toàn bộ đáp án**, mỗi lần lưu ghi lại cả kho → có thể chạm giới hạn ~5 MB (app báo "kho trình duyệt đã đầy", không lưu được kết quả) và khựng cuối phiên. Sổ từ sai cũng ghi cả kho mỗi lần sai. |
| Tải trang lần đầu | Dashboard còn tổng chặn luồng chính ~480 ms (tác vụ dài nhất ~240 ms). |
| Bảo mật phụ thuộc | Backend `npm audit`: 1 critical (`proxy-addr`), 1 high (`nodemailer`), 3 moderate. |
| Quan sát lỗi production | Không có: lỗi JS ở máy người dùng không ai thấy. |

## Plan (làm lần lượt, mỗi mục: đo trước → sửa → đo lại → so ảnh → test/lint/build → push `main`)

### A. Lỗi
1. ~~prepare 400~~ — đã sửa.
2. **Ghi nhận lỗi ở máy người dùng**: `window.onerror` + `unhandledrejection` + lỗi API ≥ 500 → `POST /api/client-errors` (gộp, tối đa vài lỗi/phút/máy) → ghi log Cloud Run (không thêm bảng). Xem bằng `gcloud logging read`.
3. `npm audit fix` backend (không `--force`), chạy lại test + thử gửi 1 email nhắc học.
4. Tự host `rive.wasm` (`public/rive/`, `RuntimeLoader.setWasmUrl`), cache immutable.
5. Script quét lỗi (Playwright, mọi trang × khách/tài khoản) đưa vào `frontend/scripts/` để chạy lại mỗi đợt.

### B. Lag khi học
1. Flashcard rò listener: tìm nguồn (nghi màn thưởng / `TheKeoDuoc` / `useNghieng3D` / emoji động), sửa đến khi 45 lượt không tăng.
2. Nối từ (256 ms) và Tự luận lúc nộp (216 ms): profile từng thao tác, sửa phần nặng (giống cách đã làm với Flashcard).
3. Ôn tập `/review`: đo đủ luồng Xem nghĩa → Thuộc/Quên, sửa nếu > 150 ms.
4. Sổ từ sai + lịch sử phiên: đọc từ bộ nhớ, ghi lúc rảnh (cùng cách kho SRS); lịch sử chỉ giữ đáp án của phiên chưa đồng bộ + ~30 phiên gần nhất (kiểm tra trước chỗ nào đọc đáp án cũ).
5. Màn thưởng: giảm rác bộ nhớ (GC ~150–200 ms mỗi lần thưởng) trong động cơ hạt, không đổi hình.

### C. Tải trang
1. Dashboard lần đầu: profile ~480 ms chặn, tách việc không cần cho khung đầu.
2. `lottie-web` (316 KB) chỉ tải khi màn chờ / streak thật sự hiện.

### D. Backend
1. Header `Server-Timing` + log request > 500 ms (tìm API chậm trên production).
2. Rà truy vấn của các API chính bằng `EXPLAIN`, thêm index nếu cần (migration sẽ báo trước).
3. Cloud Run cold start: đọc log; nếu > 2 s cân nhắc `min-instances=1` (người dùng quyết, có phí).

### E. Đo lại + bàn giao
Bảng trước/sau, so ảnh, cập nhật `HANDOFF.md` / `PROJECT_CONTEXT.md`.

## Cần người dùng chọn (mặc định = khuyến nghị)
| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q1 | Gửi lỗi ở máy người dùng về server (A2)? | **Có** — chỉ ghi log, không lưu nội dung học |
| Q2 | Lịch sử phiên trên máy chỉ giữ đáp án ~30 phiên gần nhất (B4)? | **Có** — số liệu tổng (điểm, thời gian) vẫn giữ 300 phiên |
| Q3 | Tự host `rive.wasm` 1,9 MB trong repo (A4)? | **Có** |
| Q4 | `npm audit fix` backend (A3)? | **Có** |
| Q5 | Cloud Run `min-instances=1` (D3)? | Đo log trước, bạn quyết |

## Kết quả đợt 2 (2026-10-10)

| Mục | Kết quả |
|---|---|
| A1 prepare 400 | Đã sửa (`101d252`) |
| A2 báo lỗi + ErrorBoundary + tự tải lại khi file JS cũ | Đã làm (`b39949f`); thử thật: deploy giữa chừng → tự tải lại 1 lần, mở đúng trang; lỗi lần 2 → màn báo lỗi; lỗi JS/API 5xx lên log |
| A3 npm audit | 0 lỗ hổng (`519a4e3`) |
| A4 rive.wasm tự host | Đã làm (`e9ebe14`), mascot không còn gọi CDN ngoài |
| A5 script quét lỗi | `npm run quet-loi` (`ab7ffa4`) |
| B1 rò listener Flashcard | Không phải rò (chỉ tăng 1 lần khi màn thưởng chạy lần đầu, 25 hay 45 thẻ đều 361) — không sửa |
| B2 Nối từ / Tự luận | Đo lại: tệ nhất 96 / 72 ms (số cũ là đột biến khi bật profiler) — không sửa |
| B3 Ôn tập | TB 57 ms, tệ nhất 128 ms — không sửa |
| B4 sổ từ sai + lịch sử phiên | Đã làm (`d138201`) |
| B5 màn thưởng | Không làm: luồng chính chỉ vài khung ~60 ms, phần rớt khung do vẽ canvas (GPU); sửa động cơ hạt dễ đổi hình |
| C1/C2 Dashboard, Lottie | Chặn luồng chính lần đầu ~284 ms (trước 480); phần còn lại là lần tính bố cục đầu + Lottie của màn chờ — giữ |
| D1 log request chậm | Đã làm (`1376ab6`) |
| D2 truy vấn DB | Mọi API ≤ 20 ms, đúng index — không cần migration |
| D3 cold start | Máy cloud không có quyền GCP — người dùng xem log |

---

# Đợt 3 — học hiệu quả hơn + tối đa AI (2026-10-10)

Người dùng chọn 1, 3, 4, 5, 6, 7, 8 + "tập trung cải thiện tối đa AI và tiện ích AI". Mỗi mục: test → build → lint → push `main`.
Máy thử không có khoá Gemini: phần AI kiểm bằng test giả lập + trình duyệt với API giả; chất lượng lời AI thật cần người dùng xem trên production.

| # | Việc | Cách làm (tối thiểu, không migration) |
|---|---|---|
| AI-1 (mục 5) | Soạn trước lời giải thích cả buổi | `utils/soanTruocGiaiThich.js`: hàng đợi phía máy, ưu tiên câu đang hiện + 2 câu kế, sau đó lần lượt các câu còn lại của buổi (cách nhau 4 s, ≤ 15 lượt/phút theo hạn mức Gemini miễn phí), dừng khi lỗi liên tiếp. Chạy từ lúc mở buổi học (cả khi đang ở tab Từ vựng / Lý thuyết). Kho lời dùng chung cho bài tập. (Cloud Run không chạy việc nền sau khi trả lời request nên hàng đợi đặt ở máy.) |
| AI-2 (mục 4) | 👍 / 👎 lời giải thích | 👎 = "Viết lại": server gọi AI viết lại (prompt nhắc tránh lỗi bản cũ), ghi đè cache, trả bản mới; 👍 ghi log `ai_feedback`. Giới hạn lượt. |
| AI-3 | Tự kiểm lời AI trước khi lưu | Lọc thêm: lời giải thích phải nhắc tới đáp án (chữ của lựa chọn / đáp án đúng hoặc câu người học gõ); không đạt thì bỏ, lần sau soạn lại. |
| AI-4 | "Hỏi AI thêm" | Dưới lời giải thích: mở LearnBot với câu hỏi + câu trả lời + lời giải thích làm ngữ cảnh. |
| AI-5 (mục 6) | Dịch câu ở Ngữ cảnh | Nút "Dịch câu": dùng `example_translation` có sẵn; chưa có thì AI dịch (`POST /cards/:id/translate-example`, lưu vào cột có sẵn từ migration 016). |
| 8 | Gợi ý từng bước khi gõ | Tự luận + Ôn tập: chữ đầu → 40% → 70%; dùng gợi ý thì không lên cấp (Ôn tập giữ nguyên cấp). |
| 3 | Luyện câu tính vào tiến độ | Nghe chép / Đặt câu đạt → từ lên 1 cấp qua API ôn tập có sẵn (giống Flashcard); không đạt không ghi; Nói theo không ghi. Không cần migration. |
| 1 | Gộp hàng ôn | `/review` thêm nhóm "Câu bài tập đến hạn" sau thẻ đến hạn (dùng `BaiTapKhoaHoc onTap`); badge menu = thẻ + câu. Giữ trang `/khoa-hoc/on-tap`. |
| 7 | IPA 240 từ lộ trình | Bổ sung phiên âm (giọng Mỹ) vào `lo-trinh.json`; người dùng chạy `npm run seed:roadmaps` sau deploy. |

## Kết quả đợt 3

Đã làm đủ 9 việc, mỗi việc một commit trên `main` (test backend 135 pass, frontend 180 pass, lint không lỗi mới, build OK). Kiểm trên trình duyệt 390px với API thật cục bộ (phần AI dùng API giả vì máy thử không có khoá Gemini):

| Việc | Kiểm |
|---|---|
| AI-1 soạn trước cả buổi | Trả lời xong hiện lời giải thích sau ~77 ms, 0 lần gọi `/explain`; rời buổi thì hàng đợi dừng |
| AI-2 👍/👎 | 👎 → "AI đang viết lại…" → bản mới thay chỗ, kho trên máy cập nhật; 👍 → "Cảm ơn"; body gửi `{answer, tot}` đúng |
| AI-3 tự kiểm | Test: lời không nhắc đáp án bị bỏ khi soạn trước, không lưu khi giải thích từng câu |
| AI-4 Hỏi LearnBot thêm | Bấm → khung chat mở, tin nhắn gồm đề, 4 lựa chọn, câu trả lời (sai), đáp án đúng, lời giải thích |
| AI-5 Dịch câu | Có sẵn → hiện ngay (0 request); chưa có → "Đang dịch…" → bản dịch; quyền đọc: bộ mẫu ngoài lộ trình 404 với tài khoản |
| 8 Gợi ý 3 nấc | `n____ 0` → `ngh__ _` → `nghĩa _`, nút "Gợi ý thêm" khoá ở nấc 3; Ôn tập đúng nhờ gợi ý gửi `{level: 1}` (giữ Lv1) |
| 3 Luyện câu → SRS | Nghe chép đúng 100% → `PATCH /reviews/by-card/:id/result {result: "correct"}`; chưa đến hạn thì không ghi (test) |
| 1 Hàng ôn chung | Tab Ôn tập hiện 423 (từ + câu); hết từ → "Tiếp theo: 136 câu bài tập đến hạn" ngay dưới |
| 7 IPA | `npm run seed:roadmaps` cục bộ: 240/240 từ có phiên âm |

