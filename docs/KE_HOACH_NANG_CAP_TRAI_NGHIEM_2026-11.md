# Kế hoạch nâng cấp trải nghiệm học — 24/11/2026

Phạm vi: toàn bộ luồng học (Hôm nay → Khoá học → Bộ từ → Ôn tập) và LearnBot. Văn bản này chỉ là kế hoạch, chưa sửa code.

## 1. Hiện trạng và bất cập còn lại

Đợt sửa audit 18/11 (HANDOFF dòng 69) và đợt LearnBot hiểu ngữ cảnh (dòng 70) đã xong. Các điểm dưới đây vẫn còn, đã đối chiếu với code.

| # | Khu vực | Hiện trạng | Bất cập | Ảnh hưởng |
|---|---|---|---|---|
| A1 | LearnBot | Trả lời một lần, không stream (`chatRoutes.js` gọi `generateContent`) | Render free ngủ 30–60 s, Gemini chậm: người học nhìn "đang trả lời" lâu, không biết còn chạy không | Bỏ hỏi giữa chừng |
| A2 | LearnBot | Lịch sử chat chỉ nằm trong state | Tải lại trang, đổi thiết bị là mất cuộc trò chuyện | Phải hỏi lại |
| A3 | LearnBot | Chỉ trả lời khi được hỏi; nút hành động chỉ có "mở trang" và "lưu từ" | Không luyện được ngay trong chat (hỏi xong muốn làm thử 3 câu phải tự đi tìm) | "Vừa học vừa hỏi" mới được một nửa |
| A4 | LearnBot | Không đọc được câu sai lặp lại theo thời gian | Không chỉ ra được lỗi hay mắc (ví dụ hay nhầm thì hiện tại hoàn thành với quá khứ đơn) | Ôn dàn trải, không trúng chỗ yếu |
| B1 | Hôm nay | Danh sách việc (từ đến hạn, câu sai, buổi tiếp) tách rời, người học tự chọn | Chưa có một nút "Học 15 phút" tự ghép đủ việc theo thứ tự hợp lý | Mất thời gian quyết định, dễ bỏ |
| B2 | Bài tập khoá học | Lưu câu trả lời không giữ thứ tự (PT-01) | Mạng chậm có thể ghi đè kết quả mới bằng kết quả cũ | Sai tiến độ buổi |
| B3 | Flashcard bỏ dở | SRS trên máy và server lệch nhau (PT-02) | Cấp độ của từ có thể bị đẩy lên sai khi đồng bộ | Lịch ôn sai |
| B4 | Phiên học | Mỗi lần mở trang học tạo 1 phiên, phiên bỏ dở không đóng (PT-03) | Thống kê thời gian học, số phiên bị thổi phồng | Số liệu không tin được |
| B5 | Khách → tài khoản | Khách học rồi đăng ký thì tiến độ trên máy không chuyển (audit đề xuất 13) | Mất công đã học khi đăng ký | Giảm động lực đăng ký |
| C1 | Nói | Đã có Luyện câu (nhận giọng nói, so từng từ — `utils/luyenCau.js`) | Chưa gắn vào bài học buổi và ôn tập; không có nhận xét phát âm cụ thể | Kỹ năng nói ít được luyện |
| C2 | Đo lường | Không có số liệu hành vi (bỏ phiên ở đâu, chế độ nào hay bỏ) | Không biết cải tiến nào có hiệu quả | Cải tiến theo cảm tính |
| C3 | Máy thật | Bố cục Fold, chế độ toàn màn hình mới đo trên trình duyệt giả lập | Có thể lệch trên máy thật | Cần kiểm tra |

## 2. Giải pháp theo đợt

### Đợt 1 — Ổn định nền (làm trước, không cần AI)

| # | Giải quyết | Thay đổi | Lợi ích | Điều kiện / rủi ro |
|---|---|---|---|---|
| 1.1 | B2 | Trên máy, các lần lưu của cùng một câu đi tuần tự (lần sau chờ lần trước xong, chỉ gửi bản mới nhất) | Không mất kết quả mới | `course_question_progress` không có cột thời điểm trả lời (`updated_at` là giờ ghi của server), nên xử lý phía FE để khỏi đổi schema |
| 1.2 | B3 | Flashcard gửi kết quả từng thẻ theo lô (dùng lại `guiDapAnDoDang`), bỏ đẩy cấp trên máy qua `/reviews/bulk` cho từ đã có tiến độ | Một nguồn tiến độ duy nhất là server | FE + BE nhỏ, không đổi schema |
| 1.3 | B4 | Chỉ tạo `study_sessions` khi có câu trả lời đầu tiên; khi đọc thống kê bỏ qua phiên mở quá 2 giờ không có câu trả lời | Thống kê đúng | Không cần cron (dọn lúc đọc) |
| 1.4 | B5 | Khi khách đăng ký/đăng nhập lần đầu: hỏi "Mang N từ đã học trên máy này vào tài khoản?" → gửi `/reviews/bulk` | Không mất công học | **Cần xác nhận chính sách**: có cho chuyển không; chỉ áp dụng bộ mẫu lộ trình |

### Đợt 2 — LearnBot đi cùng lúc học

| # | Giải quyết | Thay đổi | Lợi ích | Điều kiện / rủi ro |
|---|---|---|---|---|
| 2.1 | A1 | Stream câu trả lời chat (SSE, như luồng giải thích bài tập đang có); hiện chữ dần, nút "Dừng"; quá 20 s chưa có chữ thì báo "Máy chủ đang khởi động" | Thấy phản hồi ngay | Giữ nguyên rate limit 20 lượt/phút. Nút hành động chỉ hiện sau khi stream xong (server lọc ở cuối) |
| 2.2 | A2 | Lưu 30 tin gần nhất trong localStorage theo user id; nút "Cuộc trò chuyện mới" | Tải lại không mất | Không lưu lên server (không đổi schema, ít rủi ro dữ liệu cá nhân). Đăng xuất thì xoá |
| 2.3 | A3 | Nút hành động mới `[[luyen:...]]`: LearnBot đưa 3 câu trắc nghiệm/điền từ ngay trong khung chat, người học làm tại chỗ, chấm trên máy, câu sai được gửi lại cho LearnBot giải thích | Hỏi xong làm thử liền | Câu luyện trong chat **không** tính vào SRS và tiến độ buổi (giống câu "luyện thêm"). Server kiểm tra định dạng câu, bỏ câu không hợp lệ |
| 2.4 | A4 | Khi người học hỏi "mình hay sai gì" hoặc mở trang Thống kê: server gom các câu bài tập **đang sai** theo buổi và phần (`course_questions.section`) cùng từ hay sai (`mistake_words`), đưa vào ngữ cảnh; LearnBot tóm 3 nhóm lỗi + nút mở bài ôn tương ứng | Ôn trúng chỗ yếu | Chỉ chạy khi người học yêu cầu (không cron). CSDL chỉ giữ kết quả lần gần nhất của mỗi câu, chưa có lịch sử sai theo thời gian và chưa gắn nhãn điểm ngữ pháp — muốn phân tích theo thời gian phải thêm bảng (gộp vào 4.1) |
| 2.5 | — | Sau khi trả lời sai 2 lần cùng một câu bài tập: hiện gợi ý nhỏ "Hỏi LearnBot vì sao" ngay dưới phản hồi (một lần mỗi câu) | Người học biết có thể hỏi đúng lúc cần | Không tự mở chat, không chen vào khi đang làm |

### Đợt 3 — Học theo kế hoạch cá nhân

| # | Giải quyết | Thay đổi | Lợi ích | Điều kiện / rủi ro |
|---|---|---|---|---|
| 3.1 | B1 | Nút "Học 15 phút" trên Hôm nay: ghép theo thứ tự (1) từ đến hạn tối đa 20, (2) câu bài tập sai đến hạn tối đa 10, (3) tiếp buổi đang học. Thanh tiến độ chung, dừng giữa chừng vẫn lưu | Mở app là học, không phải chọn | Dùng lại các màn có sẵn, chuyển tiếp tự động. Thời lượng ước theo số câu (giả định ~20 s/câu, cần đo lại) |
| 3.2 | C1 | Thêm bước "Nói theo" tuỳ chọn cuối bước Từ vựng của buổi và chế độ Nói trong Ôn tập (dùng lại `luyenCau.js`); trình duyệt không hỗ trợ nhận giọng nói thì ẩn và báo | Luyện nói đều | Chrome Android hỗ trợ; Safari/Zalo hạn chế — kiểm tra như cảnh báo giọng đọc hiện có |
| 3.3 | — | Màn kết thúc phiên nói rõ: số từ lên cấp, lần ôn tiếp theo, việc kế tiếp (một nút) | Thấy tiến bộ, có lối đi tiếp | FE |

### Đợt 4 — Đo lường và kiểm tra máy thật

| # | Giải quyết | Thay đổi | Lợi ích | Điều kiện / rủi ro |
|---|---|---|---|---|
| 4.1 | C2 | Ghi sự kiện tối thiểu: bắt đầu/kết thúc/bỏ phiên (màn, chế độ, số câu), hỏi LearnBot (trang, có bấm nút hành động không). Trang thống kê nội bộ cho chủ dự án | Biết chỗ người học bỏ | **Cần bảng mới** (bật RLS, chạy SQL trên Supabase trước). Không ghi nội dung câu hỏi chat |
| 4.2 | C3 | Kiểm thử trên Fold5 thật: toàn màn hình, bàn phím ảo che ô nhập, bôi đen chữ trong sổ tay, nút hành động trong chat | Lỗi thật được phát hiện | Cần người dùng thực hiện hoặc gửi ảnh/video |

## 3. Thứ tự đề xuất

| Thứ tự | Hạng mục | Lý do |
|---|---|---|
| 1 | 2.1, 2.2 | Người học thấy ngay; không đổi schema |
| 2 | 1.2, 1.3 | Sửa nền tiến độ trước khi thêm tính năng dựa trên số liệu |
| 3 | 2.3, 2.5 | Hoàn thiện "vừa học vừa hỏi" |
| 4 | 3.1, 3.3 | Giảm ma sát mỗi lần mở app |
| 5 | 1.1, 2.4, 1.4 | 1.4 cần xác nhận chính sách |
| 6 | 3.2, 4.1, 4.2 | Phạm vi lớn hơn hoặc cần schema / máy thật |

## 4. Nghiệm thu

1. Hỏi LearnBot khi máy chủ đang ngủ: trong 2 s có thông báo trạng thái; chữ hiện dần; bấm "Dừng" thì ngừng.
2. Tải lại trang giữa cuộc trò chuyện: còn đủ tin; đăng xuất rồi đăng nhập tài khoản khác: không thấy tin của tài khoản trước.
3. Hỏi "cho mình 3 câu luyện" ở bước Lý thuyết: 3 câu làm được trong chat, câu sai có giải thích, lịch SRS không đổi.
4. Mạng chậm, trả lời sai rồi làm lại đúng ngay: tiến độ buổi giữ kết quả đúng.
5. Bấm "Học 15 phút": đi hết từ đến hạn → câu sai → buổi tiếp mà không quay về Hôm nay; thoát giữa chừng không mất câu đã làm.
6. Thống kê số phiên và thời gian học không tính các lần chỉ mở trang.
7. Toàn bộ test, lint, build đạt; không đưa khoá bí mật vào `VITE_*`.

## 5. Cần xác nhận trước khi làm

| Mục | Câu hỏi |
|---|---|
| Phạm vi "chưa ổn" | Điểm chưa ổn cụ thể người dùng gặp (LearnBot trả lời chưa đúng ý, chậm, giao diện, hay luồng học) để đẩy lên đầu danh sách |
| 1.4 | Có cho chuyển tiến độ của khách vào tài khoản mới không |
| 4.1 | Có đồng ý thêm bảng ghi sự kiện và lịch sử trả lời (cần chạy SQL trên Supabase) không |
