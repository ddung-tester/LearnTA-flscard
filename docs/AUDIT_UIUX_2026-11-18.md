# Báo cáo audit UI/UX ảnh hưởng đến trải nghiệm học tập — 18/11/2026

> **Cập nhật 24/11/2026 — đã sửa:** BUG-01 → BUG-25 (trừ phần "học tiếp đúng câu" của BUG-01: tải lại vẫn bắt đầu lại phiên nhưng các câu đã làm đã được lưu SRS), BUG-26, PT-04, PT-06. Quyết định nghiệp vụ đã chốt: đúng khi chưa đến hạn thì giữ cấp; xem đáp án = sai; dùng gợi ý = giữ cấp; ẩn câu mẫu 6 thì sinh theo khuôn; token gia hạn trượt khi còn dưới 3 ngày. Thêm: manifest `display: fullscreen` để ẩn thanh trạng thái khi mở từ biểu tượng ngoài màn hình chính (bỏ khoá xoay dọc).


Phạm vi: toàn bộ ứng dụng LearnTA (Streak Drop) trên nhánh `main` tại commit `1cf7fc9`. Đợt audit chỉ kiểm thử và đọc mã nguồn, **không sửa code, không đụng CSDL production**.

Từ viết tắt dùng trong báo cáo:

| Viết tắt | Nghĩa |
|---|---|
| SRS | Spaced Repetition System — lịch ôn lặp lại ngắt quãng (Lv0–Lv5) |
| JWT | JSON Web Token — mã đăng nhập gửi kèm mỗi request |
| TTS | Text-to-Speech — trình duyệt đọc chữ thành giọng nói |
| WCAG AA | Chuẩn tiếp cận nội dung web, mức AA (tương phản chữ thường ≥ 4,5:1) |
| BE / FE | Backend (Express) / Frontend (React) |

---

## 0. Môi trường và phương pháp kiểm thử

| Hạng mục | Nội dung |
|---|---|
| CSDL | PostgreSQL 16 chạy local, DB riêng `flashcard_audit`, tạo từ `backend/database/schema.sql` + `npm run seed:roadmaps` (3 lộ trình, 12 bộ, 240 từ). Không dùng Supabase. |
| Backend / Frontend | `node src/server.js` cổng 8080, `vite` cổng 5173, `backend/.env` trỏ DB local. |
| Tài khoản | Đăng ký mới một tài khoản test. Không dùng tài khoản thật. |
| Khoá học | Khoá giả lập 3 buổi do người audit tự soạn (8/5/3 từ, 8+2 luyện thêm/4/2 câu), nạp bằng chính hàm `napBaiHoc` của repo. Không dùng tài liệu có bản quyền. |
| Công cụ | Playwright + Chromium headless: desktop 1366×860, iPhone 13, iPad Mini. Theo dõi console, request/response, đối chiếu từng kết quả với bảng `study_sessions`, `study_answers`, `card_progress`, `course_question_progress`. Đo tương phản bằng công thức WCAG. |
| Không có trong môi trường | `GEMINI_API_KEY` (AI giải thích, dịch, sinh câu, chatbot chỉ kiểm được trạng thái lỗi), Supabase Storage (câu nghe có file MP3), Google OAuth thật, giọng đọc TTS (Chromium headless có `speechSynthesis` nhưng 0 giọng). |
| Test có sẵn | Backend `npm test`: 144 đạt, 3 bỏ qua. Frontend `npx vitest run`: 210/210 đạt. Các lỗi trong báo cáo này không bị test hiện có phát hiện. |

Quy ước phân loại phát hiện:

| Nhãn | Ý nghĩa |
|---|---|
| Đã tái hiện | Đã thao tác thật trên app và thấy lỗi, có số liệu DB hoặc ảnh. |
| Qua code | Thấy trong mã nguồn, chưa tái hiện trên app. |
| Cần xác nhận nghiệp vụ | Hành vi đã tái hiện nhưng có thể là thiết kế có chủ đích; cần chủ sản phẩm chốt. |

---

## 1. Tổng quan chất lượng UI/UX hiện tại

Điểm tốt đã kiểm chứng:

- Giao diện nhất quán, chữ dễ đọc ở chế độ sáng. Không có tràn ngang trang ở 1366px, 768px (iPad Mini), 390px (iPhone 13).
- Thao tác bàn phím đầy đủ: phím 1–4/A–D chọn đáp án, Enter sang câu, Space lật thẻ, Esc đóng menu và cài đặt. Focus hiện rõ (viền 2px) ở mọi phần tử đã Tab qua.
- Bài tập khoá học làm tốt phần độ bền dữ liệu: lưu từng câu lên server; mất mạng thì báo "Chưa lưu được N câu" và tự gửi lại khi có mạng; tải lại trang mở đúng câu đang làm; câu sai phải trả lời lại và được hỏi lại sau 5 câu.
- Lưu kết quả phiên luyện từ khi mất mạng có thông báo và nút "Thử lưu lại", bấm lại lưu thành công.
- Chặn trùng tên bộ (không phân biệt hoa thường), bấm "Thêm từ" 2 lần không tạo bản ghi trùng, nội dung HTML hiển thị dạng chữ (không chạy mã).
- Bấm liên tiếp 2 đáp án khác nhau hoặc Enter 2 lần không làm nhảy câu.

Điểm yếu tập trung ở ba nhóm:

1. **Độ bền tiến độ của các chế độ luyện từ**: tải lại hoặc rời trang giữa phiên mất toàn bộ câu đã làm; ôn từ lúc mất mạng thì báo "xong" nhưng không lưu; JWT hết hạn sau 7 ngày làm người học bị đăng xuất giữa bài, mất câu vừa trả lời.
2. **Độ chính xác của tín hiệu SRS và chấm điểm**: "Xem đáp án" rồi gõ lại vẫn tính đúng và báo "Hoàn hảo 100%"; làm lại cùng bộ 5 lần trong 1 phút đẩy từ lên Lv5 "Thành thạo" (hẹn ôn sau 30 ngày); nghĩa có phần trong ngoặc làm câu trả lời đúng bị chấm sai; câu mẫu 6 thì sinh tự động sai ngữ pháp ("I use a hour every day").
3. **Dẫn dắt người học ở cuối mỗi bước và trên điện thoại**: học thẻ xong không có màn hoàn thành; làm xong bài tập không có lối sang buổi sau; nút LearnBot và mèo trang trí che nút "Kiểm tra", "Sau →" và chữ trên thẻ từ.

Thống kê phát hiện:

| Mức | Số lượng | Mã |
|---|---|---|
| P0 – Critical | 0 | — (BUG-05 là ứng viên P0 nếu chủ sản phẩm xác nhận quy tắc SRS, xem mục 2) |
| P1 – High | 6 | BUG-01 → BUG-06 |
| P2 – Medium | 8 | BUG-07 → BUG-14 |
| P3 – Low | 12 | BUG-15 → BUG-26 |
| Bug tiềm ẩn (qua code) | 7 | PT-01 → PT-07 |

---

## 2. Danh sách bug theo mức độ

### 2.1 Bảng tóm tắt

| Mã | Mức | Màn hình | Tóm tắt | Phân loại |
|---|---|---|---|---|
| BUG-01 | P1 | Mọi chế độ luyện từ | Tải lại / rời trang giữa phiên mất toàn bộ câu đã làm, không lưu SRS, không hỏi xác nhận | Đã tái hiện |
| BUG-02 | P1 | Tự luận, Nghe viết, Hỗn hợp | "Xem đáp án" hoặc "Gợi ý" rồi gõ lại vẫn ghi là trả lời đúng, lên cấp SRS, báo "Hoàn hảo" | Đã tái hiện |
| BUG-03 | P1 | Ôn tập (từ đến hạn) | Mất mạng: báo "Xong rồi" nhưng kết quả không lưu, có mạng lại từ vẫn đến hạn | Đã tái hiện |
| BUG-04 | P1 | Toàn app | JWT hết hạn cố định 7 ngày: bị đăng xuất giữa bài, màn kết quả biến mất, câu bài tập vừa trả lời bị mất | Đã tái hiện |
| BUG-05 | P1 | SRS từ vựng | Học lại nhiều lần trong ngày / ôn ở 2 tab làm từ lên cấp liên tục (Lv0→Lv5 trong 1 phút) | Đã tái hiện, cần xác nhận nghiệp vụ |
| BUG-06 | P1 | Phản hồi đúng, Thêm từ | Câu mẫu 6 thì sinh tự động sai ngữ pháp và vô nghĩa | Đã tái hiện |
| BUG-07 | P2 | Tự luận, Ôn tập gõ từ | Trả lời đúng bị chấm sai khi nghĩa có ngoặc, gạch nối, dấu câu cuối | Đã tái hiện (ngoặc), qua code (gạch nối, dấu câu) |
| BUG-08 | P2 | Điện thoại: Tự luận, Flashcard, Từ vựng của buổi | Nút LearnBot và mèo trang trí đè nút thao tác chính và chữ trên thẻ | Đã tái hiện |
| BUG-09 | P2 | Flashcard | Học hết thẻ không có màn hoàn thành, không có bước tiếp theo | Đã tái hiện |
| BUG-10 | P2 | Bài tập khoá học – tổng kết | Không có lối sang buổi sau; bố cục tổng kết lệch, ô Phần hiện "(0)" | Đã tái hiện |
| BUG-11 | P2 | Chuyển trang khi mất mạng | App tự tải lại và rơi vào trang lỗi mạng của trình duyệt | Đã tái hiện |
| BUG-12 | P2 | Bài tập khoá học – chế độ tối | Chữ tương phản 1,09:1 – 2,43:1, gần như không đọc được | Đã tái hiện |
| BUG-13 | P2 | Nghe viết, câu nghe | Thiết bị không có giọng đọc: bấm loa im lặng, không báo, không có phương án thay thế | Đã tái hiện (môi trường không giọng) |
| BUG-14 | P2 | Tự luận sau "Xem đáp án" | 2 nút "Tiếp tục", nút phía trên không chuyển câu | Đã tái hiện |
| BUG-15 | P3 | Từ vựng của buổi | Từ dài tràn khỏi thẻ | Đã tái hiện |
| BUG-16 | P3 | Thẻ câu hỏi Trắc nghiệm | Đề dài đè lên nút loa | Đã tái hiện |
| BUG-17 | P3 | Thông báo lỗi | Thông báo kỹ thuật, không dấu, sai ngữ cảnh | Đã tái hiện |
| BUG-18 | P3 | Tạo bộ, Thêm từ | Nhập toàn dấu cách bị bỏ qua im lặng | Đã tái hiện |
| BUG-19 | P3 | Giải thích AI khi AI lỗi | Hiện trùng gợi ý tài liệu 2 lần, vẫn gắn nhãn "Giải thích của AI" | Đã tái hiện |
| BUG-20 | P3 | Ôn tập khi không có từ đến hạn | Thông điệp sai tình huống | Đã tái hiện |
| BUG-21 | P3 | Thống kê | "Tổng từ" mâu thuẫn với số từ trong SRS | Đã tái hiện |
| BUG-22 | P3 | LearnBot, form Thêm từ | Esc không đóng LearnBot; nhãn form không gắn với ô nhập | Đã tái hiện |
| BUG-23 | P3 | Thêm từ – xem trước câu mẫu | Hiện khoá kỹ thuật `present_simple`, chữ dài tràn | Đã tái hiện |
| BUG-24 | P3 | Ăn mừng streak | Ngày đầu tiên vẫn ghi "Streak tiếp tục!" | Đã tái hiện |
| BUG-25 | P3 | Thêm nhanh (dán danh sách) | Không nhận dấu gạch dài "–" và dấu ":" làm phân cách | Đã tái hiện (hàm phân tích) |
| BUG-26 | P3 | `/decks/:id/add-word` bộ chỉ đọc | Hiện form thêm từ cho bộ lộ trình, lưu mới báo lỗi | Đã tái hiện |

### 2.2 Chi tiết từng bug

#### BUG-01 — Rời trang hoặc tải lại giữa phiên luyện từ làm mất toàn bộ câu đã làm

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-01 |
| Màn hình | Trắc nghiệm, Ngữ cảnh, Tự luận, Nghe viết, Hỗn hợp, Nối từ, Flashcard (cả ở `/decks/:id/...` và "Học bằng thẻ" / "Luyện thêm" trong buổi học) |
| Mức độ | P1 |
| Phân loại | Đã tái hiện trên Trắc nghiệm; các chế độ còn lại dùng chung cơ chế lưu (qua code) |
| Mô tả | Đáp án chỉ được gửi lên server khi làm xong cả phiên. Tải lại trang, bấm "Trở về", vuốt quay lại hoặc trình duyệt điện thoại tự huỷ tab nền làm mất toàn bộ câu đã làm. Không có hộp thoại xác nhận khi rời phiên dở. |
| Các bước tái hiện | 1) Đăng nhập. 2) Mở `/decks/2/quiz?filter=tat-ca&n=5&random=0`. 3) Trả lời đúng 3 câu (thanh tiến độ "Câu 4/5", combo x3). 4) Nhấn F5. 5) Kiểm tra bảng `study_answers`, `card_progress`. |
| Kết quả thực tế | Phiên bắt đầu lại "Câu 1/5", 0 đúng. DB: 0 bản ghi `study_answers`, `card_progress` không đổi. Mỗi lần mở trang học tạo thêm 1 dòng `study_sessions` không bao giờ kết thúc (sau đợt test: 29/40 phiên của tài khoản test ở trạng thái chưa kết thúc). |
| Kết quả mong đợi | Câu đã trả lời được giữ: mở lại thì hỏi "Học tiếp từ câu 4 / Làm lại". Các câu đã làm được ghi SRS dù chưa xong phiên. Bấm "Trở về" giữa phiên thì hỏi xác nhận. |
| Ảnh hưởng | Mất công học, từ đã trả lời không vào lịch ôn. Rủi ro cao trên điện thoại (tab nền bị huỷ, vuốt nhầm). Với bộ 20–30 từ, mất ở câu 25 rất dễ làm người học bỏ cuộc. |
| Nguyên nhân | `frontend/src/hooks/useLuuKetQuaPhien.js:107` chỉ lưu khi `daHoanThanh`; trạng thái phiên (danh sách câu, chỉ số, đáp án) chỉ nằm trong state React. Flashcard (`TrangFlashcard.jsx`) gửi đáp án khi `soTheDaHoanTat >= tongSoTheMucTieu`. |
| Hướng xử lý | (1) Lưu nháp phiên dở vào localStorage theo khoá phiên, mở lại thì hỏi học tiếp. (2) Gửi đáp án theo lô (vd. mỗi 5 câu và khi `pagehide`) qua `POST /study-sessions/:id/answers` sẵn có — endpoint đã chống ghi trùng theo (phiên, thẻ). (3) Xác nhận khi bấm "Trở về" / `beforeunload` lúc phiên đang dở. |
| Minh chứng | `audit-2026-11-18/bug01-quiz-truoc-reload.jpg`, `bug01-quiz-sau-reload.jpg` |

#### BUG-02 — "Xem đáp án" hoặc "Gợi ý" rồi gõ lại vẫn được ghi là trả lời đúng

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-02 |
| Màn hình | Tự luận, Nghe viết, Hỗn hợp (dùng chung `TrangTuLuan.jsx`) |
| Mức độ | P1 |
| Phân loại | Đã tái hiện |
| Mô tả | (a) Bấm "Xem đáp án" rồi gõ lại đáp án: màn hình đóng dấu "Chính xác!", tổng kết tính câu đó là đúng, server tăng cấp SRS. (b) Dùng "Gợi ý" (hiện "m_____") rồi gõ đúng: server cũng tăng cấp, tổng kết "Hoàn hảo! 100%". Trong khi trang Ôn tập có quy tắc ngược lại: dùng gợi ý thì giữ nguyên cấp. |
| Các bước tái hiện | (a) 1) Mở `/decks/3/tu-luan?filter=tat-ca&n=3&random=0`. 2) Câu "bữa sáng": bấm "Xem đáp án". 3) Gõ "breakfast", bấm "Tiếp tục", Enter. 4) Trả lời đúng các câu còn lại tới tổng kết. (b) 1) Mở `/decks/2/tu-luan?filter=tat-ca&q=mirror&n=1&random=0`, chiều Nghĩa → Từ. 2) Bấm "Gợi ý". 3) Gõ "mirror". |
| Kết quả thực tế | (a) Tổng kết "Hoàn hảo! 100% — Đúng 3/3", "breakfast" nằm ở "Trả lời đúng", "Lv1 · Ôn lại: 1 ngày". DB: `is_correct = true`, `answer_meta.mode = "reveal-retry-correct"`, `card_progress.mastery_level = 1`, hạn ôn ngày mai. (b) DB: `is_correct = true`, `mode = "hint-correct"`, Lv1; tổng kết "Hoàn hảo! 100%". |
| Kết quả mong đợi | Câu đã xem đáp án tính là chưa nhớ: không tăng cấp (hoặc hạ cấp), nằm trong "Trả lời sai · cần ôn lại", không có dấu "Chính xác!". Câu dùng gợi ý xử lý thống nhất với trang Ôn tập (giữ nguyên cấp) và không tính "Hoàn hảo". |
| Ảnh hưởng | Người học tưởng đã thuộc; từ chưa nhớ bị hẹn ôn muộn; số liệu "Đã thuộc", "% đúng" bị thổi phồng. |
| Nguyên nhân | `TrangTuLuan.jsx:259` gửi `is_correct: ketQua.dung`; hàm `tongKetDapAnPhien` lấy lần trả lời đầu của mỗi thẻ, và lần đầu đó là bản ghi `dung: true` của lượt gõ lại (`TrangTuLuan.jsx:886`, `:760`). `xemDapAn()` (`:846`) không đưa thẻ vào `tapCardSai`. `answer_meta.mode` có ghi nhưng server không dùng. |
| Hướng xử lý | Khi xem đáp án: thêm thẻ vào `tapCardSai`, ghi lần đầu `is_correct: false`. Khi dùng gợi ý: gửi cờ để server giữ nguyên cấp (cùng quy tắc với `ReviewGoTu.tiepTuc` ở trang Ôn tập). Đổi dấu "Chính xác!" thành "Đã nhập lại đúng". Viết 1 quy tắc chấm chung cho Tự luận/Nghe viết/Hỗn hợp/Ôn tập. |
| Minh chứng | `bug02-xem-dap-an-van-chinh-xac.jpg`, `bug02-ket-qua-hoan-hao-100.jpg` |

#### BUG-03 — Ôn tập lúc mất mạng: báo "Xong rồi" nhưng kết quả không được lưu

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-03 |
| Màn hình | Ôn tập → Từ đến hạn (`/review`) |
| Mức độ | P1 |
| Phân loại | Đã tái hiện |
| Mô tả | Kết quả ôn mỗi từ gửi bằng `PATCH /reviews/by-card/:id/result`. Request lỗi thì bị bỏ qua, không có hàng chờ gửi lại, không báo người học. |
| Các bước tái hiện | 1) Có 1 từ đến hạn ("dinner", Lv2). 2) Mở `/review`. 3) Tắt mạng. 4) Chọn đáp án đúng, bấm "Tiếp tục". 5) Bật mạng, tải lại trang. |
| Kết quả thực tế | Khi mất mạng: request lỗi `ERR_INTERNET_DISCONNECTED`, màn hình vẫn hiện "Xong rồi! Bạn đã ôn xong 1 từ hôm nay. Quay lại ngày mai". Sau khi có mạng và tải lại: "0 đã ôn · 1 còn lại", "dinner" vẫn Lv2 đến hạn. DB không đổi. |
| Kết quả mong đợi | Kết quả vào hàng chờ, tự gửi lại khi có mạng (như bài tập khoá học); hiện "Chưa lưu được N từ"; không báo "ôn xong" khi còn kết quả chưa lưu. |
| Ảnh hưởng | Mất kết quả của vòng ôn hằng ngày trên mạng 4G chập chờn; người học tin đã xong và đóng app, hôm sau phải ôn lại. |
| Nguyên nhân | `frontend/src/utils/srsReview.js:308-329` (`capNhatKetQuaOnDongBo`) bắt lỗi và bỏ qua ("Backend best-effort"); lần đồng bộ sau lấy dữ liệu server ghi đè bản local. |
| Hướng xử lý | Dùng cơ chế hàng chờ giống `services/hangChoTraLoi.js` cho kết quả ôn (khoá theo thẻ, giữ kết quả mới nhất, gửi lại khi `online`), kèm dòng trạng thái "chưa lưu". |
| Minh chứng | `bug03-on-tap-mat-mang.jpg` |

#### BUG-04 — Hết phiên đăng nhập (JWT 7 ngày) giữa giờ học

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-04 |
| Màn hình | Toàn app; đã thử ở Trắc nghiệm và Bài tập khoá học |
| Mức độ | P1 |
| Phân loại | Đã tái hiện (dùng token sống 25–45 giây ký bằng khoá local để mô phỏng) |
| Mô tả | Token cố định 7 ngày, không gia hạn. Khi hết hạn giữa bài, app tự đăng xuất và dựng lại toàn bộ giao diện, không có thông báo "phiên hết hạn". |
| Các bước tái hiện | (A) Làm Trắc nghiệm 5 câu, token hết hạn trước câu cuối, trả lời câu cuối. Sau đó đăng nhập lại trên cùng trình duyệt. (B) Mở Bài tập Buổi 2, đợi token hết hạn, trả lời câu "Wait _____ hour." |
| Kết quả thực tế | (A) `PATCH /study-sessions/:id/finish` trả 401 → màn kết quả biến mất, trang tự về "Câu 1/5" ở chế độ khách, không thông báo. Kết quả được giữ trong kho máy của tài khoản và chỉ được gửi khi đăng nhập lại **trên đúng trình duyệt đó** (đã kiểm: gửi thành công). Đăng nhập xong về `/dashboard`, không quay lại bài. (B) `POST /course-questions/13/answer` trả 401 → câu trả lời **không vào hàng chờ** (localStorage `hocTA.hangChoTraLoi` = null), chuyển sang `/login` không có lời giải thích; DB không có câu đó. |
| Kết quả mong đợi | Người học còn hoạt động thì phiên tự gia hạn. Nếu hết hạn: giữ nguyên màn hình, báo "Phiên đăng nhập đã hết hạn, đăng nhập lại để lưu kết quả", giữ câu trả lời và gửi sau khi đăng nhập, quay về đúng chỗ đang học. |
| Ảnh hưởng | Tài khoản học đều mỗi ngày gặp lỗi này mỗi 7 ngày; mất câu bài tập vừa làm; dễ hiểu nhầm là mất dữ liệu. |
| Nguyên nhân | `backend/src/controllers/authController.js:35` ký JWT với `JWT_EXPIRES_IN` (7d); `GET /auth/me` (`:156`) không cấp token mới. `frontend/src/services/api.js:178` xoá token khi gặp 401 → `AuthContext.jsx:155` Provider có `key={token}` nên toàn bộ cây con bị dựng lại. `hangChoTraLoi.js:39` không giữ lỗi 4xx. `TrangDangNhap.jsx:27` chỉ quay về `pathname`. |
| Hướng xử lý | Gia hạn trượt: server trả token mới khi token còn dưới ~2 ngày (qua `/auth/me` hoặc header phản hồi). Khi gặp 401 giữa bài: hộp thoại đăng nhập lại tại chỗ, không dựng lại cây; hàng chờ giữ câu trả lời ở trạng thái "chờ đăng nhập". Sau đăng nhập quay về đủ đường dẫn (gồm query). |
| Minh chứng | `bug04-het-phien-ve-cau-1.jpg` |

#### BUG-05 — Học lại nhiều lần trong ngày đẩy từ lên Lv5 "Thành thạo" trong 1 phút

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-05 |
| Màn hình | Mọi chế độ luyện từ, Ôn tập (SRS từ vựng) |
| Mức độ | P1 — **ứng viên P0** nếu chủ sản phẩm xác nhận từ chưa đến hạn thì không được lên cấp |
| Phân loại | Đã tái hiện, cần xác nhận nghiệp vụ |
| Mô tả | Mỗi phiên tính lần trả lời đầu của mỗi thẻ và tăng 1 cấp, không xét từ đã đến hạn hay chưa. Mỗi chế độ là một phiên riêng nên cộng dồn. Trong khoá học, "Học bằng thẻ" + 6 chip "Luyện thêm" trên cùng bộ từ của buổi đủ đưa cả buổi lên Lv5 ngay ngày đầu. Ôn cùng từ ở 2 tab cũng cộng 2 cấp. |
| Các bước tái hiện | (A) Làm `/decks/7/quiz?filter=tat-ca&n=3&random=0` đúng hết, lặp 5 lần liên tiếp. (B) Mở `/review` ở 2 tab, cùng từ "breakfast" (Lv2, đến hạn), trả lời đúng ở cả 2 tab. |
| Kết quả thực tế | (A) Lần 1 Lv1 → lần 5 Lv5 "Ôn lại: 30 ngày"; DB: 3 từ `mastery_level = 5`, hạn ôn 18/12/2026; tổng thời gian khoảng 1 phút. (B) 2 lệnh `PATCH .../41/result {"result":"correct"}` → Lv2 thành Lv4, hạn ôn 02/12/2026. |
| Kết quả mong đợi | (Đề xuất, cần xác nhận) Trả lời đúng khi từ chưa đến hạn không tăng cấp, chỉ ghi nhận lượt ôn — giống quy tắc đang áp dụng cho câu bài tập khoá học (`backend/src/utils/khoaHoc.js:52`, `lichOnCauHoi`) và Luyện câu (`frontend/src/utils/srsReview.js:343`). Trả lời sai vẫn hạ cấp. |
| Ảnh hưởng | "Đã thuộc"/"Thành thạo" trên Dashboard, Thống kê, tiến độ buổi bị thổi phồng; từ mới học bị hẹn ôn sau 14–30 ngày nên dễ quên; mâu thuẫn với 2 quy tắc khác trong cùng app. |
| Nguyên nhân | `backend/src/utils/cardProgress.js:60` (`updateProgressFromAnswer`) và `PATCH /reviews/by-card/:id/result` gọi `scheduleAnswer` mà không kiểm tra `next_review_at`. |
| Hướng xử lý | Server: nếu `next_review_at > now` và trả lời đúng thì giữ cấp và hạn ôn, chỉ cập nhật `last_reviewed_at`, `correct_count`. Trang Ôn tập: bỏ qua kết quả của từ đã được ôn ở tab khác (kiểm tra hạn ôn trước khi áp dụng). |
| Minh chứng | `bug05-lan-5-len-lv5.jpg` |

#### BUG-06 — Câu mẫu 6 thì sinh tự động sai ngữ pháp và vô nghĩa

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-06 |
| Màn hình | Khối câu mẫu 6 thì sau khi trả lời đúng (Trắc nghiệm, Tự luận, Nghe viết, Hỗn hợp), bảng thì hai bên khi trả lời đúng trên desktop, xem trước ở trang Thêm từ |
| Mức độ | P1 |
| Phân loại | Đã tái hiện |
| Mô tả | Thẻ chưa có `tense_examples` (bộ lộ trình chưa sinh AI, bộ tự tạo, từ của buổi học) dùng câu khuôn theo loại từ. Câu sinh ra sai mạo từ và sai nghĩa. |
| Các bước tái hiện | 1) Trả lời đúng một câu Tự luận với từ "breakfast" (bộ lộ trình) và xem khối câu mẫu; hoặc 2) vào Thêm từ, gõ "uncle". Kiểm tra thêm bằng hàm `getTenseExamples` với "hour", "grandmother", "good morning", "happy". |
| Kết quả thực tế | "I use a breakfast every day.", "I use **a hour** every day." (ngược với bài a/an của Buổi 2), "He bought a grandmother yesterday." / "Anh ấy đã mua bà hôm qua.", "She was using the uncle when I called.", "I use a good morning every day.", "The weather is becoming happy now.", bản dịch có lỗi chính tả "cuộc họn". |
| Kết quả mong đợi | Chỉ hiện câu mẫu đúng ngữ pháp, đúng nghĩa. Chưa có câu đạt chất lượng thì hiện câu ví dụ của thẻ hoặc ẩn khối. |
| Ảnh hưởng | Dạy sai kiến thức cho người học A1–A2 ngay ở khoảnh khắc được khen đúng; làm giảm độ tin cậy của toàn bộ nội dung. |
| Nguyên nhân | `frontend/src/data/tenseExamples.js:288` (`generateFallbackExamples`) ghép khuôn cố định (mạo từ, động từ "use/buy/look at" cho mọi danh từ); `getTenseExamples` (`:592`) dùng khuôn khi thẻ không có `tense_examples`. |
| Hướng xử lý | Giữ tính năng câu mẫu 6 thì (theo HANDOFF) nhưng không hiện câu khuôn; dùng `example_sentence` của thẻ khi chưa có câu AI; chạy `seed:ai-examples` cho bộ lộ trình/khoá học và soát. Tối thiểu: sửa a/an, không dùng khuôn cho danh từ chỉ người và cụm từ. Cần xác nhận: tỷ lệ thẻ trên production chưa có `tense_examples`. |
| Minh chứng | `bug02-xem-dap-an-van-chinh-xac.jpg` (khung hai bên), `bug06-bug17-bug23-bo-chi-doc.jpg`, `bug06-bug17-bug23-them-tu.jpg` |

#### BUG-07 — Trả lời đúng bị chấm sai ở chế độ gõ

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-07 |
| Màn hình | Tự luận, Nghe viết, Hỗn hợp (gõ nghĩa / gõ từ), Ôn tập (Gõ từ) |
| Mức độ | P2 |
| Phân loại | Đã tái hiện (nghĩa có ngoặc); qua code (gạch nối, dấu câu cuối) |
| Mô tả | So khớp gần như nguyên văn. Nghĩa có ghi chú trong ngoặc buộc phải gõ cả ngoặc; "check in" khác "check-in"; có dấu chấm cuối bị chấm sai. Bài tập khoá học thì đã chuẩn hoá các trường hợp này. |
| Các bước tái hiện | 1) Mở `/decks/2/tu-luan?filter=tat-ca&q=lamp&n=1&random=0`. 2) Cài đặt chiều "Từ → Nghĩa". 3) Gõ "cái đèn", Enter. |
| Kết quả thực tế | Chấm sai, "Đáp án đúng: cái đèn (bàn, ngủ)". |
| Kết quả mong đợi | Chấp nhận "cái đèn". Chấp nhận "check in" cho "check-in", "apple." cho "apple". |
| Ảnh hưởng | Người học trả lời đúng vẫn bị hạ cấp SRS và ghi vào sổ từ sai; mất niềm tin vào chấm điểm. Dữ liệu lộ trình: 6/240 nghĩa có ngoặc (vd. "đặt (vé, phòng, bàn)"), 3 từ có gạch nối; bộ tự tạo và từ buổi học thường có ghi chú trong ngoặc. |
| Nguyên nhân | `frontend/src/utils/phienHoc.js:131` (`khopDapAn`) chỉ tách theo `, ; /` rồi so khớp nguyên văn; `TrangOnTapHomNay.jsx:413` so khớp nguyên văn. |
| Hướng xử lý | Một hàm chuẩn hoá chung cho mọi chế độ gõ: bỏ phần trong ngoặc khi so khớp (vẫn hiển thị đủ), coi gạch nối như khoảng trắng, bỏ dấu câu cuối (giống `chuanHoaTraLoi` của bài tập khoá học). Cân nhắc mức "gần đúng" khi chỉ sai dấu tiếng Việt. |
| Minh chứng | `bug07-cham-sai-lamp.jpg` |

#### BUG-08 — Trên điện thoại, nút LearnBot và mèo trang trí che nút thao tác chính

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-08 |
| Màn hình | Điện thoại (iPhone 13, 390px): Tự luận/Nghe viết, Flashcard, bước Từ vựng của buổi |
| Mức độ | P2 |
| Phân loại | Đã tái hiện |
| Mô tả | Nút LearnBot (chân mèo, góc dưới phải) và mèo trang trí (góc dưới trái) nằm đè lên nội dung học. |
| Các bước tái hiện | Mở trên iPhone 13: `/decks/1/tu-luan?filter=tat-ca&n=5&random=0`, `/decks/1/flashcard?filter=tat-ca&random=0`, `/khoa-hoc/1/bai/1/tu-vung`. |
| Kết quả thực tế | Nút LearnBot đè nửa phải nút "Kiểm tra" và nút "Sau →"; mèo che chữ nghĩa trên thẻ "teacher" (còn thấy "...áo viên"). Chạm vào phần bị đè sẽ mở LearnBot thay vì kiểm tra/sang thẻ. |
| Kết quả mong đợi | Không có lớp trang trí đè lên nút và nội dung học. |
| Ảnh hưởng | Bấm nhầm, phải vuốt/thu nhỏ để đọc; khó chịu trong phiên học 10–20 phút. |
| Nguyên nhân | Chỉ trang Bài tập ẩn hai thành phần này (`BaiTapKhoaHoc.jsx:416` thêm class `dang-lam-bai`, CSS ở `KhoaHoc.css:2004-2005`). Các trang học khác không có. |
| Hướng xử lý | Áp dụng cùng cơ chế cho mọi trang học trên màn ≤ 640px (hoặc chỉ hiện nút LearnBot sau khi đã trả lời), thêm khoảng đệm đáy bằng chiều cao nút nổi. |
| Minh chứng | `bug08-mobile-tu-luan.jpg`, `bug08-mobile-flashcard.jpg`, `bug08-mobile-tu-vung.jpg` |

#### BUG-09 — Học hết thẻ không có màn hoàn thành

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-09 |
| Màn hình | Flashcard (`/khoa-hoc/:c/bai/:n/hoc/flashcard`, `/decks/:id/flashcard`) |
| Mức độ | P2 |
| Phân loại | Đã tái hiện |
| Mô tả | Đánh giá thẻ cuối xong, kết quả được lưu nhưng màn hình không đổi: vẫn hiện mặt trước thẻ cuối. |
| Các bước tái hiện | 1) Mở Buổi 3 → "Học bằng thẻ". 2) Lật và chọn "Đã nhớ" cho cả 3 thẻ. |
| Kết quả thực tế | `PATCH .../finish` và `POST .../answers` thành công; màn hình "Thẻ 3/3 · 100%", nút "Sau →" mờ, dòng hướng dẫn "Kéo sang trái để qua thẻ sau". Không có tổng kết, không có nút về buổi học hay sang Lý thuyết. |
| Kết quả mong đợi | Màn hoàn thành: số thẻ đã nhớ/chưa nhớ, "Học lại thẻ chưa nhớ", "Học tiếp phần lý thuyết" (trong buổi) hoặc "Về bộ từ". |
| Ảnh hưởng | Người học không biết đã xong, bấm qua lại vô ích; đứt mạch Từ vựng → Lý thuyết → Bài tập. |
| Nguyên nhân | `TrangFlashcard.jsx` chỉ lưu kết quả trong effect khi đủ thẻ, không có nhánh giao diện cho trạng thái hoàn thành. |
| Hướng xử lý | Thêm trạng thái hoàn thành dùng lại `StudyResult`; trong buổi học, nút chính dẫn sang bước kế tiếp. |
| Minh chứng | `bug09-flashcard-xong.jpg` |

#### BUG-10 — Làm xong bài tập của buổi không có lối sang buổi sau

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-10 |
| Màn hình | Bài tập khoá học — tổng kết (desktop ≥ 800px) |
| Mức độ | P2 |
| Phân loại | Đã tái hiện |
| Mô tả | Tổng kết chỉ có "Làm lại câu sai" / "Làm lại từ đầu". Liên kết "Buổi trước/sau" bị ẩn ở bước Bài tập. Khối tổng kết nằm ở cột phải, cột trái trống; ô "Phần" hiện "Còn lại – chưa đúng (0)". |
| Các bước tái hiện | Làm hết câu bài tập của Buổi 1 hoặc Buổi 3 tới tổng kết. |
| Kết quả thực tế | "2/2 câu đúng — Bạn đã nắm chắc phần này — Làm lại từ đầu". Không có nút sang buổi kế tiếp hay về khoá học (ngoài mũi tên ← ở góc). |
| Kết quả mong đợi | Bước tiếp theo rõ ràng: "Sang Buổi N+1" khi buổi đã xong, "Ôn N câu sai", "Về khoá học"; tổng kết đặt giữa trang. |
| Ảnh hưởng | Đứt mạch học theo khoá 48 buổi; người học phải tự quay ra trang khoá học tìm buổi. |
| Nguyên nhân | `KhoaHoc.css:2675` ẩn `.kh-chuyen-buoi` khi `kh-trang--lam-bai`; `TongKet` trong `BaiTapKhoaHoc.jsx` không nhận thông tin buổi kế tiếp; bố cục 2 cột giữ nguyên khi lượt đã xong. |
| Hướng xử lý | Truyền `next_lesson` vào tổng kết, thêm nút; khi lượt xong thì tổng kết chiếm cả hàng; ẩn lựa chọn "(0)". |
| Minh chứng | `bug10-tong-ket-bai-tap.jpg` |

#### BUG-11 — Mất mạng rồi chuyển trang: app tự tải lại và rơi vào trang lỗi của trình duyệt

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-11 |
| Màn hình | Mọi trang có mã JS tải theo nhu cầu (vd. Thống kê, Cài đặt, Nối từ, Luyện câu) |
| Mức độ | P2 |
| Phân loại | Đã tái hiện |
| Mô tả | Khi tải mã trang thất bại, app luôn tải lại trang một lần (để xử lý file cũ sau deploy). Lúc mất mạng thì tải lại cũng thất bại. |
| Các bước tái hiện | 1) Đăng nhập, mở `/dashboard`, đợi tải xong. 2) Tắt mạng. 3) Menu tài khoản → "Thống kê". |
| Kết quả thực tế | Tải `TrangThongKe` lỗi → `window.location.reload()` → trình duyệt chuyển sang `chrome-error://chromewebdata/` (trang "Không có kết nối"); app và mọi trạng thái trên trang mất. |
| Kết quả mong đợi | Ở lại trang hiện tại, báo "Mất kết nối, kiểm tra mạng rồi thử lại", có nút thử lại; tự thử lại khi có mạng. |
| Ảnh hưởng | Trên 4G chập chờn, một lần chạm menu có thể làm mất app đang mở. |
| Nguyên nhân | `frontend/src/utils/baoLoi.js:66` (`taiLaiTrangMotLan`) và `taiTrangAnToan` không phân biệt mất mạng với file JS cũ. |
| Hướng xử lý | Nếu `navigator.onLine === false` hoặc lỗi mạng thì không tải lại, để `LoiGiaoDien` hiện nút "Thử lại" và nghe sự kiện `online`. |
| Minh chứng | Không có ảnh (Chromium headless hiện trang trắng `chrome-error://chromewebdata/`); log request: `GET /src/pages/TrangThongKe.jsx net::ERR_INTERNET_DISCONNECTED` rồi `GET /stats net::ERR_INTERNET_DISCONNECTED`. |

#### BUG-12 — Chế độ tối (đèn bàn): chữ ở trang Bài tập gần như không đọc được

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-12 |
| Màn hình | Bài tập khoá học, chế độ tối |
| Mức độ | P2 |
| Phân loại | Đã tái hiện, có số đo |
| Mô tả | Khối chờ kết quả giữ nền sáng nhưng chữ đổi sang màu sáng; bộ đếm đúng/sai dùng màu đậm trên nền gỗ tối. |
| Các bước tái hiện | 1) Bật "đèn bàn" ở thanh trên. 2) Mở `/khoa-hoc/1/bai/2/bai-tap` (desktop). 3) Đo tương phản chữ/nền. |
| Kết quả thực tế | "Gõ đáp án rồi nhấn Enter" 1,09:1; "Kết quả và lời giải thích sẽ hiện ở đây" 1,52:1; "Xem lại công thức của buổi" 1,82:1; "0 đúng" 2,36:1; "0 sai" 2,43:1. Ở chế độ sáng các phần tử này đều trên 5:1. |
| Kết quả mong đợi | Tối thiểu 4,5:1 (WCAG AA). |
| Ảnh hưởng | Người học dùng chế độ tối không đọc được hướng dẫn và số câu đúng/sai. |
| Nguyên nhân | `.kh-bt__cho` (`KhoaHoc.css:2488`) dùng nền `--mau-mat-2` (vẫn sáng ở chế độ tối) nhưng chữ dùng `--mau-chu`/`--mau-chu-phu` (đã chuyển sáng); `.kh-bt__dem-dung/sai` không có màu riêng cho chế độ tối. |
| Hướng xử lý | Dùng token chữ dành cho "thẻ sáng" trong khối này; màu đếm sáng hơn ở chế độ tối; rà các khối nền sáng khác trong `KhoaHoc.css`. |
| Minh chứng | `bug12-che-do-toi-bai-tap.jpg` |

#### BUG-13 — Thiết bị không có giọng đọc: Nghe viết im lặng, không báo

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-13 |
| Màn hình | Nghe viết, câu nghe dạng Hỗn hợp, câu nghe có lời thoại trong bài tập khoá học |
| Mức độ | P2 |
| Phân loại | Đã tái hiện trong môi trường không có giọng (Chromium headless: có `speechSynthesis`, `getVoices()` = 0). Cần thử trên thiết bị thật (trình duyệt trong Zalo/Facebook, Android WebView). |
| Mô tả | Lỗi đọc bị bỏ qua im lặng; người học chỉ thấy nút loa và "Nghe và gõ từ tiếng Anh". |
| Các bước tái hiện | Mở `/decks/8/nghe-viet?filter=tat-ca&n=3&random=0` trên trình duyệt không có giọng tiếng Anh, bấm nút loa. |
| Kết quả thực tế | Không có âm thanh, không có thông báo, không có cách làm tiếp ngoài "Xem đáp án". |
| Kết quả mong đợi | Báo "Thiết bị chưa có giọng đọc tiếng Anh", hướng dẫn mở bằng Chrome/Safari, cho chuyển sang chế độ gõ từ. |
| Ảnh hưởng | Người học kẹt ở chế độ Nghe viết, nghĩ app hỏng. |
| Nguyên nhân | `services/ttsService.js` trả `false`/`onerror` im lặng; `hooks/useTTS.js` không báo lỗi; trang Nghe viết không kiểm tra hỗ trợ trước khi bắt đầu. |
| Hướng xử lý | Kiểm tra `isSupported()` và số giọng tiếng Anh khi mở chế độ nghe; hiện thông báo và phương án thay thế. |
| Minh chứng | `bug13-nghe-viet-khong-giong.jpg` |

#### BUG-14 — Sau "Xem đáp án" có 2 nút "Tiếp tục", nút phía trên không chuyển câu

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-14 |
| Màn hình | Tự luận / Nghe viết / Hỗn hợp |
| Mức độ | P2 |
| Phân loại | Đã tái hiện |
| Mô tả | Sau khi gõ lại đáp án đã xem và bấm "Tiếp tục", nút "Tiếp tục" cũ (dưới khung đáp án) vẫn hiện cùng thanh "Tiếp tục →" mới. |
| Các bước tái hiện | 1) Tự luận, bấm "Xem đáp án". 2) Gõ đáp án, bấm "Tiếp tục". 3) Bấm lại nút "Tiếp tục" màu xám phía trên. |
| Kết quả thực tế | Câu không đổi; mỗi lần bấm ghi thêm một bản ghi đáp án vào danh sách của phiên. Chỉ nút ở thanh dưới hoặc phím Enter chuyển câu. |
| Kết quả mong đợi | Một nút tiếp tục duy nhất. |
| Ảnh hưởng | Người học bấm nút gần nhất, thấy không có gì xảy ra, tưởng app treo. |
| Nguyên nhân | `TrangTuLuan.jsx`: `daBoQua` vẫn `true` sau `tiepTucSauXemDapAn` (`:857`) nên khối nút "Tiếp tục" (khoảng dòng 1448) vẫn hiện cùng `PhanHoiDung`. |
| Hướng xử lý | Ẩn khối nút của chế độ "xem đáp án" khi đã nhập đúng; chỉ giữ thanh tiếp tục. |
| Minh chứng | `bug02-xem-dap-an-van-chinh-xac.jpg` |

#### BUG-15 — Từ dài tràn khỏi thẻ ở bước Từ vựng của buổi

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-15 |
| Màn hình | Buổi học → Từ vựng (desktop 1366px, iPad Mini 768px) |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Mô tả | Từ dài một chữ không được ngắt dòng nên chữ, nút loa và vạch kẻ tràn khỏi khung thẻ; khi thẻ không đứng cuối hàng sẽ đè sang thẻ bên cạnh. |
| Các bước tái hiện | Buổi có từ dài (dữ liệu test: "internationalization") → mở bước Từ vựng. |
| Kết quả thực tế | Phần chữ và nút loa vượt mép phải thẻ khoảng 60px. |
| Kết quả mong đợi | Nội dung nằm trong thẻ (ngắt hoặc thu nhỏ chữ). |
| Ảnh hưởng | Mất thẩm mỹ, khó đọc; rủi ro với từ dài trong tài liệu (vd. "responsibility", "uncomfortable"). |
| Nguyên nhân | `KhoaHoc.css:2725-2728` đặt `overflow-wrap: normal; word-break: normal` cho `.kh-trang--gon .kh-the-tu__tu`. |
| Hướng xử lý | Cho phép ngắt khi vượt khung (`overflow-wrap: anywhere` chỉ cho từ quá dài) hoặc giảm cỡ chữ theo độ dài; `min-width: 0` cho phần chữ. |
| Minh chứng | `bug15-tu-dai-tran-the.jpg` |

#### BUG-16 — Đề bài dài đè lên nút loa

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-16 |
| Màn hình | Thẻ câu hỏi Trắc nghiệm (desktop) |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Mô tả, bước tái hiện | Trắc nghiệm chiều VI → EN, câu "cha hoặc mẹ, phụ huynh": chữ "phụ" đè lên nút loa ở góc phải thẻ. |
| Kết quả mong đợi | Chữ chừa khoảng cho nút loa. |
| Ảnh hưởng | Khó đọc, khó bấm loa. |
| Nguyên nhân | Nút loa đặt tuyệt đối ở góc (`tts-speaker-btn--corner`, `TheCauHoiPhien.jsx`), vùng chữ không có khoảng đệm phải. |
| Hướng xử lý | Thêm `padding-inline` cho đoạn chữ bằng kích thước nút. |
| Minh chứng | `bug16-de-bai-de-nut-loa.jpg` |

#### BUG-17 — Thông báo lỗi kỹ thuật, không dấu, sai ngữ cảnh

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-17 |
| Màn hình | Thêm từ, bài tập khoá học, trang học khi bộ không tồn tại |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Mô tả | Thông báo lấy thẳng từ backend hoặc trình duyệt. |
| Kết quả thực tế | "term_en vuot qua 255 ky tu" (từ dài 300 ký tự, ô nhập không có `maxLength`); "Chi co the sua bo tu cua ban" (lưu từ vào bộ lộ trình); "Failed to fetch" (giải thích AI lúc mất mạng); `/decks/99999/quiz` hiện "Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại." kèm nút "Thử lại" dù bộ không tồn tại (404). Backend có khoảng 50/70 thông báo lỗi không dấu, nhiều câu lộ tên trường kỹ thuật (`backend/src/utils/http.js:35` và các controller). |
| Kết quả mong đợi | Tiếng Việt có dấu, nói rõ việc cần làm: "Từ tối đa 255 ký tự", "Bộ từ này chỉ để học, không thêm từ được", "Mất kết nối, thử lại khi có mạng", "Bộ từ không tồn tại" kèm nút về danh sách. |
| Ảnh hưởng | Người học không hiểu lỗi; chữ "backend" là thuật ngữ kỹ thuật. |
| Hướng xử lý | Bảng thông báo tiếng Việt phía FE theo mã lỗi; tách 404 khỏi lỗi mạng trong `useBoTuHoc`; thêm `maxLength` cho ô nhập. |
| Minh chứng | `bug06-bug17-bug23-them-tu.jpg`, `bug06-bug17-bug23-bo-chi-doc.jpg`, `bug17-bo-khong-ton-tai.jpg` |

#### BUG-18 — Nhập toàn dấu cách bị bỏ qua im lặng

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-18 |
| Màn hình | Hộp thoại "Thêm bộ từ mới", trang Thêm từ |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Mô tả, bước tái hiện | Nhập tên bộ "     " (hoặc từ/nghĩa toàn dấu cách) rồi bấm "Thêm bộ"/"Thêm từ". |
| Kết quả thực tế | Không có gì xảy ra, không có thông báo (thuộc tính `required` không chặn dấu cách, code `trim()` rồi `return`). |
| Kết quả mong đợi | Báo "Vui lòng nhập tên bộ từ" / "Nhập từ và nghĩa". |
| Ảnh hưởng | Người học tưởng nút hỏng. |
| Hướng xử lý | Hiện lỗi tại ô nhập khi giá trị sau `trim()` rỗng (`TrangThemTu.jsx:111`, `luuBo` trong `TrangDanhSachBo.jsx`). |
| Minh chứng | `bug18-ten-toan-dau-cach.jpg` |

#### BUG-19 — AI lỗi thì gợi ý tài liệu hiện trùng 2 lần, vẫn gắn nhãn "Giải thích của AI"

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-19 |
| Màn hình | Bài tập khoá học — phần kết quả |
| Mức độ | P3 |
| Phân loại | Đã tái hiện (môi trường không có Gemini; production gặp khi Gemini quá tải 503) |
| Mô tả | Server trả `question.explanation` thay cho lời AI. Màn hình hiện dòng gợi ý của tài liệu và khung "Giải thích của AI" cùng một nội dung, kèm 👍/👎. |
| Kết quả mong đợi | Ghi rõ "Gợi ý từ tài liệu", không lặp, có nút "Nhờ AI giải thích lại". |
| Nguyên nhân | `backend/src/controllers/courseController.js:551` trả gợi ý dạng chữ thuần ở chế độ stream nên client không biết là bản dự phòng; `BaiTapKhoaHoc.jsx:1088` luôn hiện `cau.explanation`. |
| Hướng xử lý | Đánh dấu bản dự phòng trong luồng stream (ký hiệu hoặc header), client ẩn khung AI khi trùng gợi ý. |
| Minh chứng | `bug19-giai-thich-trung.jpg` |

#### BUG-20 — Trang Ôn tập trống hiện thông điệp sai tình huống

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-20 |
| Màn hình | Ôn tập → Từ đến hạn khi không có từ đến hạn |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Kết quả thực tế | "Không có từ nào phù hợp với bộ lọc hiện tại" dù không lọc; "Hoàn thành một bài Quiz hoặc Tự luận để bắt đầu xây dựng hàng ôn tập" dù tài khoản đã có 14 từ trong lịch ôn. |
| Kết quả mong đợi | "Hôm nay đã ôn xong. Lần ôn tiếp theo: <ngày>, <n> từ", gợi ý học buổi tiếp theo. |
| Nguyên nhân | `TrangOnTapHomNay.jsx:989-993`, `:1068-1075` dùng chung điều kiện `nothingDue`. |
| Minh chứng | `bug20-on-tap-trong.jpg` |

#### BUG-21 — Thống kê: "Tổng từ" mâu thuẫn với số từ trong SRS

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-21 |
| Màn hình | Thống kê (`/stats`) |
| Mức độ | P3 |
| Phân loại | Đã tái hiện, đối chiếu DB |
| Kết quả thực tế | "Tổng từ 2" cạnh "3 Thành thạo / 14 trong SRS" và "13 Đang học". Các số khác khớp DB tại thời điểm chụp (10 phiên hoàn thành, 275 XP, khoá học 12/14 câu đúng, 50%). |
| Kết quả mong đợi | Nhãn nói rõ phạm vi ("Từ trong bộ của tôi") hoặc đếm mọi nguồn. |
| Nguyên nhân | `TrangThongKe.jsx:280` cộng `total_words` của `GET /decks` (chỉ bộ tự tạo). |
| Minh chứng | `bug21-thong-ke.jpg` |

#### BUG-22 — Tiếp cận: Esc không đóng LearnBot; nhãn form Thêm từ không gắn với ô nhập

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-22 |
| Màn hình | LearnBot (`role="dialog"`), trang Thêm từ |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Kết quả thực tế | Mở LearnBot, nhấn Esc: vẫn mở (desktop và điện thoại). Trang Thêm từ: nhãn "Từ tiếng Anh *", "Nghĩa tiếng Việt *" không có `htmlFor`/`id` nên trình đọc màn hình không đọc được tên ô. |
| Kết quả mong đợi | Esc đóng hộp thoại và trả focus về nút mở; nhãn gắn với ô nhập. |
| Nguyên nhân | `ChatbotWidget.jsx` không xử lý phím Esc; `TrangThemTu.jsx:150-176` thiếu `htmlFor`. |
| Minh chứng | Log kiểm thử (không có ảnh riêng). |

#### BUG-23 — Trang Thêm từ: xem trước câu mẫu hiện khoá kỹ thuật, chữ dài tràn

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-23 |
| Màn hình | Thêm từ — khối "Câu ví dụ tự động theo 6 thì" |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Kết quả thực tế | Nhãn hiện `present_simple:`, `present_continuous:`... thay vì "Hiện tại đơn"; từ dài tràn khỏi khung và đè lên nhãn. |
| Nguyên nhân | `TrangThemTu.jsx:268` đọc `TENSE_META[...].labelVi` nhưng dữ liệu trong `tenseExamples.js:7` dùng `nameVi`. |
| Hướng xử lý | Đọc `nameVi`; cho chữ ngắt dòng. |
| Minh chứng | `bug06-bug17-bug23-them-tu.jpg`, `bug06-bug17-bug23-bo-chi-doc.jpg` |

#### BUG-24 — Ngày đầu tiên vẫn ghi "Streak tiếp tục!"

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-24 |
| Màn hình | Hộp ăn mừng streak sau phiên đầu tiên trong ngày |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Kết quả thực tế | "Streak tiếp tục! Học liên tục 1 ngày rồi đó — đừng dừng lại!" ở ngày học đầu tiên. |
| Kết quả mong đợi | Ngày 1: "Bắt đầu chuỗi ngày học!". |
| Nguyên nhân | `StreakCelebration.jsx:88-90` dùng một câu cho mọi giá trị. |

#### BUG-25 — Thêm nhanh không nhận dấu gạch dài và dấu hai chấm

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-25 |
| Màn hình | Chi tiết bộ → Thêm nhanh → Dán danh sách |
| Mức độ | P3 |
| Phân loại | Đã tái hiện bằng hàm phân tích `phanTichDanNhanh` |
| Kết quả thực tế | "look up – tra cứu" (gạch dài, hay gặp khi chép từ Word/ChatGPT) và "give up: từ bỏ" báo "Thiếu nghĩa". "well-being - hạnh phúc", "check-in - làm thủ tục", "cat, con mèo", dòng tách bằng Tab đều đúng. |
| Kết quả mong đợi | Nhận "–", "—", ":" làm phân cách khi có khoảng trắng hai bên. |
| Nguyên nhân | `frontend/src/utils/nhapNhanhTu.js` chỉ nhận "-", ",", "|", Tab. |

#### BUG-26 — Trang Thêm từ mở được cho bộ chỉ đọc

| Trường | Nội dung |
|---|---|
| Bug ID | BUG-26 |
| Màn hình | `/decks/1/add-word` (bộ lộ trình) |
| Mức độ | P3 |
| Phân loại | Đã tái hiện |
| Kết quả thực tế | Form hiện đầy đủ; bấm "Thêm từ" mới nhận 403 "Chi co the sua bo tu cua ban". Trang chi tiết bộ không có nút Thêm từ nên chỉ gặp khi mở bằng đường dẫn. |
| Kết quả mong đợi | Bộ chỉ đọc thì báo ngay và đưa về chi tiết bộ. |

---

## 3. Bug tiềm ẩn cần theo dõi (qua code, chưa tái hiện)

| Mã | Khu vực | Mô tả | Điều kiện xảy ra | Đề xuất |
|---|---|---|---|---|
| PT-01 | Bài tập khoá học | Lưu câu trả lời không giữ thứ tự: request cũ chậm có thể tới server sau request mới và ghi đè kết quả "lần gần nhất". | Mạng chậm, trả lời sai rồi "Làm lại câu sai" ngay. | Gửi kèm thời điểm trả lời; server bỏ bản ghi cũ hơn. |
| PT-02 | Flashcard bỏ dở | SRS trên máy cập nhật từng thẻ nhưng server chỉ nhận khi xong phiên. Lần mở app sau, từ mới được đẩy lên qua `POST /reviews/bulk` với cấp trên máy; từ đã có tiến độ thì thay đổi bị bản server ghi đè. | Học thẻ dở rồi thoát. | Gộp vào giải pháp BUG-01 (gửi theo lô). |
| PT-03 | `study_sessions` | Mỗi lần mở trang học tạo 1 phiên; phiên bỏ dở không bao giờ kết thúc (29/40 trong đợt test). | Mọi lần mở trang học. | Chỉ tạo phiên khi trả lời câu đầu, hoặc dọn phiên mở quá 24h. Chú ý giới hạn 500 MB của Supabase Free. |
| PT-04 | Giải thích AI | Luồng stream dùng `fetch` không có thời gian chờ (`courseApi.js:84`); axios có 25 s nhưng `fetch` thì không. | Render đang ngủ (30–60 s) hoặc Gemini chậm. | Thêm `AbortController` với thời gian chờ và nút "Thử lại". |
| PT-05 | Hàng chờ bài tập | Hàng chờ bị xoá khi đổi/hết phiên đăng nhập (`xoaHangCho` trên `auth:changed`). | Trả lời offline rồi token hết hạn trước khi có mạng. | Gắn hàng chờ với user id; giữ lại sau khi đăng nhập lại đúng tài khoản. |
| PT-06 | Đăng nhập lại | Chỉ quay về `pathname`, mất query (`?filter`, `?n`, `?loai=cau`). | Bị chuyển sang `/login` từ trang có query. | Lưu cả `search`. |
| PT-07 | Tài liệu | `PROJECT_CONTEXT.md` ghi Flashcard ghi SRS qua `PATCH /reviews/by-card`, code thực tế gửi đáp án phiên khi xong. | Bảo trì sau này. | Cập nhật tài liệu khi sửa BUG-01. |

---

## 4. Các luồng học có nguy cơ bị gián đoạn

| Luồng | Điểm gãy | Bug liên quan |
|---|---|---|
| Luyện từ của buổi trên điện thoại (Học bằng thẻ + 7 chế độ Luyện thêm) | Tab nền bị huỷ / vuốt quay lại → mất câu đã làm; nút nổi che nút "Kiểm tra", "Sau" | BUG-01, BUG-08 |
| Ôn tập hằng ngày trên 4G | Kết quả mất khi mạng chập chờn, app vẫn báo "xong" | BUG-03 |
| Người học đều đặn trên 7 ngày | Bị đăng xuất giữa bài, mất câu vừa trả lời | BUG-04 |
| Học theo khoá: Từ vựng → Lý thuyết → Bài tập → buổi sau | Học thẻ xong không có bước tiếp; bài tập xong không có lối sang buổi sau | BUG-09, BUG-10 |
| Tự đánh giá mức thuộc | Xem đáp án/gợi ý tính là đúng; học dồn lên Lv5 trong 1 phút; số "Đã thuộc" bị thổi phồng | BUG-02, BUG-05, BUG-21 |
| Gõ nghĩa tiếng Việt | Nghĩa có ngoặc bị chấm sai | BUG-07 |
| Nghe viết trên trình duyệt trong ứng dụng (Zalo, Facebook) | Không có giọng đọc, không báo | BUG-13 |
| Chuyển trang lúc mất mạng | Rơi khỏi app sang trang lỗi trình duyệt | BUG-11 |

---

## 5. Đề xuất cải thiện UX (sắp theo ưu tiên)

| # | Đề xuất | Giải quyết | Lợi ích | Loại thay đổi |
|---|---|---|---|---|
| 1 | Lưu nháp phiên dở + gửi đáp án theo lô + xác nhận khi rời phiên | BUG-01, PT-02 | Không mất công học | FE, dùng API sẵn có |
| 2 | Viết 1 bảng quy tắc SRS chung (đúng/sai/xem đáp án/gợi ý/chưa đến hạn) và áp cho mọi chế độ | BUG-02, BUG-05 | Lịch ôn và "Đã thuộc" phản ánh đúng | BE + FE, cần chốt nghiệp vụ |
| 3 | Một hàng chờ đồng bộ chung cho mọi kết quả học (câu bài tập, ôn từ, phiên) có trạng thái "chưa lưu" | BUG-03, PT-05 | Học được trên mạng yếu | FE |
| 4 | Gia hạn phiên tự động + đăng nhập lại tại chỗ | BUG-04, PT-06 | Không bị đăng xuất giữa bài | BE + FE |
| 5 | "Bước tiếp theo" ở cuối mỗi bước của buổi: thẻ xong → Lý thuyết; bài tập xong → buổi sau / ôn câu sai | BUG-09, BUG-10 | Giữ mạch học khoá 48 buổi | FE |
| 6 | Chỉ hiện câu mẫu 6 thì đạt chất lượng; sinh trước bằng AI và soát | BUG-06, BUG-23 | Không dạy sai | Dữ liệu + FE |
| 7 | Chuẩn hoá chấm câu gõ dùng chung với bài tập khoá học | BUG-07 | Giảm chấm oan | FE |
| 8 | Ẩn thành phần trang trí trên mọi màn học di động | BUG-08 | Không bấm nhầm | CSS |
| 9 | Hiện tiến độ buổi ngay trong trang buổi học (desktop đang ẩn mô tả "x/y từ", "x/y câu" của 3 bước) | — | Biết mình đã xong bao nhiêu | CSS/FE |
| 10 | Bảng thông báo lỗi tiếng Việt có dấu, tách 404 khỏi lỗi mạng | BUG-17, BUG-18 | Người học biết phải làm gì | FE (+ BE nếu sửa thông báo gốc) |
| 11 | Trang Ôn tập trống: nói lần ôn tiếp theo và gợi ý học buổi kế | BUG-20 | Giữ động lực | FE |
| 12 | Kiểm tra giọng đọc trước khi vào chế độ nghe | BUG-13 | Không kẹt | FE |
| 13 | Khách học rồi đăng ký: hỏi có mang tiến độ trên máy vào tài khoản không | Rủi ro UX (chính sách hiện tại không chuyển, có thông báo) | Không mất động lực khi đăng ký | FE + BE, cần xác nhận chính sách |
| 14 | Chip "Học tiếp" ở chặng 1 khi khách chưa học gì → "Bắt đầu" | Rủi ro UX | Đúng ngữ cảnh | FE |

---

## 6. Checklist khu vực đã / chưa kiểm thử

| Khu vực | Trạng thái | Ghi chú |
|---|---|---|
| Trang chủ, Khoá học (khách), chi tiết lộ trình | Đã kiểm thử | |
| Đăng ký, đăng nhập email (sai mật khẩu, dữ liệu sai) | Đã kiểm thử | Google OAuth: chưa (không có client thật) |
| Dashboard, Thống kê, Cài đặt | Đã kiểm thử | Đối chiếu số liệu với DB |
| Trang khoá học, buổi học (Từ vựng, Lý thuyết dạng sổ tay, bảng, liên kết buổi khác) | Đã kiểm thử | "Xem dạng cuộn" chỉ xem qua |
| Bài tập khoá học: trắc nghiệm, điền 1 và 2 chỗ trống, hoa/thường, dấu chấm, trả lời lại, hỏi lại sau 5 câu, tải lại giữa chừng, mất mạng, hết phiên | Đã kiểm thử | Câu nghe file MP3: chưa (không có Storage) |
| AI giải thích, dịch câu, 👍/👎, Hỏi LearnBot, sinh luyện thêm | Chỉ kiểm trạng thái lỗi | Không có `GEMINI_API_KEY` |
| Học bằng thẻ trong buổi | Đã kiểm thử | |
| Trắc nghiệm, Tự luận | Đã kiểm thử | Gồm xem đáp án, gợi ý, 2 chiều |
| Nghe viết | Đã kiểm thử (môi trường không giọng) | Cần thử thiết bị thật |
| Ngữ cảnh, Hỗn hợp, Nối từ, Luyện câu | Mở màn hình, qua code | Chưa làm hết vòng; Luyện câu đặt câu cần AI |
| Ôn tập: Từ đến hạn (thẻ, trắc nghiệm), Câu bài tập sai, Từ hay nhầm | Đã kiểm thử | Gõ từ Lv3+: qua code |
| Bộ từ: tạo, trùng tên, ký tự đặc biệt, toàn dấu cách; thêm từ (rỗng, dài, HTML, bấm 2 lần); bộ chỉ đọc | Đã kiểm thử | |
| Sửa/xoá từ, kéo thả sắp xếp, yêu thích, xoá bộ, Thêm nhanh bằng AI | Chưa kiểm thử | Thêm nhanh dán danh sách: kiểm hàm phân tích |
| Luyện tập (`/practice`) | Xem màn hình | Đổi bộ/bộ lọc/số lượng chưa kiểm đủ |
| Responsive: 1366px, iPhone 13, iPad Mini | Đã kiểm thử | Galaxy Fold, iPhone SE, Safari/iOS thật: chưa |
| Chế độ tối | Đã kiểm thử | Trắc nghiệm, Lý thuyết, Bài tập |
| Bàn phím: Tab/focus, 1–4, A–D, Enter, Space, Esc | Đã kiểm thử | Trình đọc màn hình: chưa (chỉ kiểm nhãn) |
| Mất mạng: bài tập, lưu phiên, ôn tập, chuyển trang | Đã kiểm thử | |
| API chậm (giả lập độ trễ dài, máy chủ ngủ) | Chưa kiểm thử | |
| Hết phiên đăng nhập | Đã kiểm thử | |
| Nhiều tab | Đã kiểm thử | Ôn tập |
| Thao tác nhanh: 2 đáp án liên tiếp, Enter 2 lần, bấm "Thêm từ" 2 lần | Đã kiểm thử | Không phát hiện lỗi |
| Streak qua nhiều ngày, video thưởng | Chưa kiểm thử | Cần đổi giờ hệ thống / file video |
| Dữ liệu production | Không kiểm | Theo yêu cầu không đụng production |

---

## 7. Ảnh minh chứng

Thư mục `docs/audit-2026-11-18/` (JPEG đã nén, chụp trên app local):

| File | Bug |
|---|---|
| `bug01-quiz-truoc-reload.jpg`, `bug01-quiz-sau-reload.jpg` | BUG-01 |
| `bug02-xem-dap-an-van-chinh-xac.jpg`, `bug02-ket-qua-hoan-hao-100.jpg` | BUG-02, BUG-06, BUG-14 |
| `bug03-on-tap-mat-mang.jpg` | BUG-03 |
| `bug04-het-phien-ve-cau-1.jpg` | BUG-04 |
| `bug05-lan-5-len-lv5.jpg` | BUG-05 |
| `bug06-bug17-bug23-them-tu.jpg`, `bug06-bug17-bug23-bo-chi-doc.jpg` | BUG-06, BUG-17, BUG-23, BUG-26 |
| `bug07-cham-sai-lamp.jpg` | BUG-07 |
| `bug08-mobile-tu-luan.jpg`, `bug08-mobile-flashcard.jpg`, `bug08-mobile-tu-vung.jpg` | BUG-08 |
| `bug09-flashcard-xong.jpg` | BUG-09 |
| `bug10-tong-ket-bai-tap.jpg` | BUG-10 |
| `bug12-che-do-toi-bai-tap.jpg` | BUG-12 |
| `bug13-nghe-viet-khong-giong.jpg` | BUG-13 |
| `bug15-tu-dai-tran-the.jpg` | BUG-15 |
| `bug16-de-bai-de-nut-loa.jpg` | BUG-16 |
| `bug17-bo-khong-ton-tai.jpg` | BUG-17 |
| `bug18-ten-toan-dau-cach.jpg` | BUG-18 |
| `bug19-giai-thich-trung.jpg` | BUG-19 |
| `bug20-on-tap-trong.jpg` | BUG-20 |
| `bug21-thong-ke.jpg` | BUG-21 |

---

## 8. Điểm cần chủ sản phẩm xác nhận trước khi sửa

1. **BUG-05**: Trả lời đúng một từ chưa đến hạn có được lên cấp không? Đề xuất: không (giống câu bài tập khoá học và Luyện câu). Nếu đồng ý, BUG-05 nên xử lý như P0.
2. **BUG-02**: Câu đã xem đáp án tính là sai hay chỉ "không đổi cấp"? Câu dùng gợi ý có giữ nguyên cấp như trang Ôn tập không?
3. **BUG-06**: Ẩn câu khuôn khi thẻ chưa có câu AI, hay sinh trước câu AI cho toàn bộ bộ lộ trình/khoá học? Cần số liệu: bao nhiêu thẻ production chưa có `tense_examples`.
4. **Mục 5, đề xuất 13**: Có cho chuyển tiến độ học lúc chưa đăng nhập vào tài khoản mới không (báo cáo 05/10 ghi chính sách hiện tại là không)?
5. **BUG-04**: Thời gian phiên đăng nhập mong muốn (gia hạn trượt bao lâu).
