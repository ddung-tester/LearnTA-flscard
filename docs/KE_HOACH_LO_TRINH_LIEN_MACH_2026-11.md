# Kế hoạch: lộ trình học liền mạch — 24/11/2026

Vấn đề người dùng nêu: bài học và dữ liệu học đã có nhưng cảm giác học rời rạc, chưa hiệu quả.
Văn bản này thay phần ưu tiên của `KE_HOACH_NANG_CAP_TRAI_NGHIEM_2026-11.md`; các mục kỹ thuật ở file đó (stream chat, sửa nền tiến độ) giữ nguyên, làm xen khi cần.

## 1. Rà soát hiện trạng (đi thử trên khung Fold 690×829, tài khoản test)

### 1.1. Luồng hiện tại

| Bước | Màn | Người học thấy | Người học phải tự quyết |
|---|---|---|---|
| 1 | Hôm nay | Thẻ "Buổi 1" + nút "Học tiếp", bản đồ 48 ô, 3 ô ôn (22 từ / 2 câu / 1 từ), từ vựng các buổi gần đây, bộ của tôi, tổng quan (streak, XP, đã thuộc…) | Học buổi mới hay ôn trước? Ôn loại nào trước? |
| 2 | Buổi học › Từ vựng | Danh sách 8 thẻ từ, nút "Học bằng thẻ", 8 chip "Luyện thêm" (Trắc nghiệm, Tự luận, Nghe viết, Ngữ cảnh, Nối từ, Hỗn hợp, Luyện câu…) | Học kiểu nào, bao nhiêu là đủ? |
| 3 | Buổi học › Lý thuyết | Sổ tay 3 trang công thức + ví dụ | Đọc xong có hiểu chưa? (không có gì kiểm tra) |
| 4 | Buổi học › Bài tập | Câu hỏi theo phần (Quiz 1, Practice, Bài thi, Luyện thêm…) | — |
| 5 | Ôn tập | 3 tab tách rời: Từ đến hạn / Câu bài tập sai / Từ hay nhầm; từ đến hạn trộn từ khoá học, lộ trình mẫu, bộ của tôi (ví dụ đang học Buổi 1 "to be" nhưng ôn "lunch" của A1–A2 Ăn uống) | Ôn tab nào; vì sao từ này lại hiện |
| 6 | Thống kê | 14 chỉ số (Thành thạo, Đang học, XP, phiên, Lv0–5, theo chế độ…) | Mình tiến bộ đến đâu? |

### 1.2. Bất cập

| # | Bất cập | Nguyên nhân (đã đối chiếu code) | Ảnh hưởng |
|---|---|---|---|
| R1 | Mỗi ngày có 5–6 lối vào ngang nhau, không có "việc hôm nay" duy nhất | Dashboard ghép nhiều khối độc lập; ôn tập và buổi mới là hai luồng riêng | Mất thời gian chọn, dễ chỉ học buổi mới mà bỏ ôn (hoặc ngược lại) |
| R2 | Ba bước của buổi không nối với nhau | Từ vựng, Lý thuyết, Bài tập là 3 trang độc lập; Lý thuyết không có câu kiểm tra; Bài tập không gắn lại mục lý thuyết | Đọc lý thuyết thụ động, làm bài sai không biết quay lại phần nào |
| R3 | Bước Từ vựng có quá nhiều lựa chọn | 1 nút chính + 8 chế độ luyện cùng cấp | Không rõ khi nào "học xong từ"; nhiều người bấm thử rồi bỏ |
| R4 | "Xong buổi" khó đạt và không phản ánh việc hiểu | `tienDoBuoiHoc.xong` = mọi từ đã học **và** mọi câu đang đúng; Lý thuyết không tính. Ví dụ: Buổi 1 có 7/8 câu đúng nhưng 0/8 từ (chưa lật thẻ) → chưa xong; Buổi 3 xong dù có thể chưa đọc lý thuyết | Thanh tiến độ không khớp cảm nhận |
| R5 | Không có mạch giữa các ngày | Buổi N+1 không nhắc lại buổi N; câu sai và từ của buổi cũ chỉ quay lại qua trang Ôn tập (tách 3 tab) | Kiến thức không được nối, cảm giác học từng mảnh |
| R6 | Ôn tập trộn nguồn, không có lý do | Hàng đợi SRS chung cho mọi bộ từ, sắp theo hạn | Người học khoá thấy từ lạ không liên quan bài đang học |
| R7 | Tiến bộ được đo bằng điểm số, không bằng năng lực | Thống kê đếm từ/XP/cấp; không có câu "bạn đã dùng được …" | Thiếu cảm giác "mình giỏi lên" |
| R8 | LearnBot đứng ngoài luồng | Chỉ trả lời khi được hỏi (đã có ngữ cảnh) | Chưa đóng vai người kèm |

## 2. Hướng thay đổi: một trục học duy nhất

Nguyên tắc: mỗi lần mở app chỉ có **một việc chính**, mỗi buổi là **một phiên liền mạch**, mỗi bước **trả lời được câu hỏi "tiếp theo làm gì"**.

### 2.1. "Học hôm nay" — một nút, một phiên ghép sẵn

Hôm nay chỉ còn một khối chính: **"Học hôm nay · khoảng 15 phút"**. Bấm vào là chạy liền 3 chặng, không quay về Hôm nay giữa chừng:

| Chặng | Nội dung | Nguồn dữ liệu (đã có) | Giới hạn |
|---|---|---|---|
| 1. Khởi động | Ôn trộn: câu bài tập sai đến hạn + từ đến hạn **của khoá** (ưu tiên buổi gần nhất) | `course_question_progress`, `card_progress` của deck buổi học | Tối đa 10 câu, khoảng 3 phút |
| 2. Buổi mới / buổi đang dở | Vào đúng bước còn dở của buổi tiếp theo (luồng 2.2) | `timBuoiTiepTheo` | Theo buổi |
| 3. Kết thúc | Tổng kết ngày (mục 2.4) | — | — |

- Từ đến hạn của lộ trình mẫu và bộ của tôi **không** vào phiên này; chúng nằm ở Ôn tập như hiện nay, kèm nhãn nguồn rõ ràng (giải quyết R6).
- Đã học xong hôm nay: khối chính đổi thành "Xong hôm nay · ôn tiếp lúc …" và lối phụ "Học thêm buổi kế".
- Các khối khác trên Hôm nay (bản đồ 48 ô, bộ của tôi, tổng quan) thu gọn bên dưới, không cạnh tranh với nút chính (R1).

### 2.2. Một buổi = một mạch: Từ mới → Hiểu → Làm → Chốt

| Bước | Thay đổi so với hiện tại | Hoàn thành khi |
|---|---|---|
| Từ mới | Một luồng mặc định: lật thẻ → kiểm tra nhanh 1 lượt (trắc nghiệm nghĩa). 8 chế độ luyện chuyển vào mục "Luyện thêm" thu gọn, chỉ hiện sau khi xong luồng mặc định (R3) | Mỗi từ trả lời đúng ít nhất 1 lần trong lượt kiểm tra |
| Hiểu (lý thuyết) | Mỗi mục lý thuyết kết thúc bằng 1–2 câu kiểm tra ngay (lấy từ câu bài tập cùng chủ đề). Sai → hiện lại công thức của mục đó + nút "Hỏi LearnBot" | Đã qua hết các mục (đúng hoặc đã xem lại) |
| Làm (bài tập) | Giữ như hiện tại. Câu sai hiện liên kết "Xem lại mục: Thể phủ định" về đúng mục lý thuyết | Như hiện tại |
| Chốt | Màn tổng kết buổi: điều đã học (công thức chính), câu còn sai và **ngày ôn lại**, buổi sau học gì | — |

Từ của buổi và câu sai của buổi tự vào phần Khởi động của các ngày sau theo SRS (R5).

**Quy tắc "xong buổi" mới (R4):** Từ mới hoàn thành + Hiểu hoàn thành + Bài tập đạt **≥ 80% câu đúng** (thay vì 100%). Câu còn sai không chặn sang buổi sau; chúng vào lịch ôn. Tỷ lệ 80% là **giả định**, cần người dùng chốt.

### 2.3. Nối lý thuyết với bài tập

Cần biết câu nào thuộc mục lý thuyết nào. Hiện `course_questions` chỉ có `section` (Quiz 1, Practice…) nên **chưa có** liên kết này.

| Cách | Mô tả | Ưu / nhược |
|---|---|---|
| A (đề xuất) | Script chạy một lần: AI gắn mỗi câu (`question_key`) với `id` mục ngữ pháp của buổi (`content.grammar[].id`), ghi vào `course_lessons.content` (JSONB) và vào file `lesson.json` nội dung riêng; người dùng soát lại bằng một trang xem nhanh | Không đổi schema. Phải ghi cả vào file nội dung để lần chạy `nhap-khoa-hoc.js` sau không ghi đè (cùng cách `xuat-ly-thuyet.js` đang làm) |
| B | Thêm cột `grammar_index` vào `course_questions` | Rõ ràng, truy vấn dễ; phải chạy SQL trên Supabase trước |

Chưa gắn được câu nào thì bước Hiểu của mục đó chỉ có nút "Đã đọc", không chặn.

### 2.4. Tiến bộ đo bằng năng lực

| Hiện tại | Đề xuất |
|---|---|
| "1/48 buổi", "Đã thuộc 3 từ", "XP 345" | Sau mỗi buổi: "Bạn đã dùng được: to be thể khẳng định ✓, phủ định ✓, nghi vấn (còn 1 câu sai)". Lấy từ tên mục ngữ pháp + tỷ lệ đúng của câu gắn với mục đó (cần 2.3) |
| Trang Thống kê 14 chỉ số | Đầu trang: "Tuần này: 4 buổi, 32 từ mới, 3 điểm ngữ pháp vững". Chỉ số chi tiết thu gọn bên dưới |
| Bản đồ 48 ô chỉ có màu | Ô buổi đã xong hiện tên điểm ngữ pháp chính khi chạm |

### 2.5. LearnBot làm người kèm trong mạch học

| Lúc | LearnBot làm gì | Ghi chú |
|---|---|---|
| Sai câu kiểm tra ở bước Hiểu | Hiện sẵn nút "Vì sao sai?" (không tự mở chat) | Dùng ngữ cảnh câu đã có |
| Màn Chốt buổi | Nút "LearnBot tóm tắt buổi này": 3 ý chính + 2 câu tự đặt để thử | Chỉ gọi AI khi bấm (kiểm soát chi phí) |
| Khởi động ngày mới | Một dòng nhắc nối: "Hôm qua bạn học *to be*; hôm nay dùng nó với *a/an*" | Tạo từ tên buổi, **không cần AI** |

## 3. Kế hoạch triển khai

| Đợt | Hạng mục | Thay đổi hệ thống | Cần SQL |
|---|---|---|---|
| 1 | 2.1 "Học hôm nay" (Khởi động từ dữ liệu khoá + vào bước dở + tổng kết ngày); thu gọn Hôm nay; nhãn nguồn ở Ôn tập | FE chính; BE thêm 1 API gom câu sai + từ đến hạn của khoá | Không |
| 2 | 2.2 bước Từ mới một luồng mặc định; màn Chốt buổi; quy tắc xong buổi mới | FE + sửa `tienDoBuoiHoc` (và chỗ tính ở BE nếu có) | Không |
| 3 | 2.3 gắn câu ↔ mục lý thuyết (script + soát); bước Hiểu có câu kiểm tra; liên kết "Xem lại mục" | Script + FE | Tuỳ cách A/B |
| 4 | 2.4 năng lực theo điểm ngữ pháp; 2.5 LearnBot trong mạch | FE + BE nhỏ | Không |

Mỗi đợt: test, lint, build, thử trên khung Fold và laptop, rồi đẩy `main`.

## 4. Nghiệm thu

1. Mở app → một nút "Học hôm nay"; bấm một lần đi hết Khởi động → buổi → tổng kết mà không phải chọn gì thêm.
2. Phần Khởi động chỉ chứa từ và câu của khoá; từ lộ trình mẫu không lẫn vào.
3. Ở bước Từ mới chỉ thấy một nút chính; "Luyện thêm" mở được sau khi xong.
4. Đọc mục lý thuyết → làm ngay 1–2 câu của đúng mục đó; sai thì thấy lại công thức.
5. Làm sai một câu bài tập → có liên kết về đúng mục lý thuyết.
6. Hôm sau, phần Khởi động có câu sai và từ của buổi hôm trước, kèm dòng nhắc nối bài.
7. Đạt ≥ 80% câu đúng thì buổi được tính xong; câu còn sai có ngày ôn hiển thị.
8. Màn Chốt buổi liệt kê điểm ngữ pháp đã vững / còn yếu.

## 5. Cần người dùng chốt

| # | Câu hỏi | Mặc định nếu không trả lời |
|---|---|---|
| 1 | Ngưỡng "xong buổi": 80% câu đúng hay giữ 100%? | 80% |
| 2 | Từ lộ trình mẫu và bộ của tôi: để riêng ở Ôn tập (đề xuất) hay trộn vào "Học hôm nay"? | Để riêng |
| 3 | Gắn câu ↔ mục lý thuyết: cách A (AI gắn, ghi vào nội dung buổi) hay B (thêm cột, chạy SQL)? | A |
| 4 | Thời lượng mục tiêu mỗi ngày: 15 phút? | 15 phút |
