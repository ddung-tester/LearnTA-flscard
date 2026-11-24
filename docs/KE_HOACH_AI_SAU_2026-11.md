# Kế hoạch tích hợp AI sâu cho LearnBot — 24/11/2026

## 1. Hiện trạng

| Hạng mục | Hiện có | Hạn chế |
|---|---|---|
| Ngữ cảnh | Bộ từ đang mở (`/decks/:id`), thẻ đang xem, 10 từ hay sai | Không biết buổi học, phần lý thuyết, câu bài tập đang làm, tiến độ, số từ đến hạn |
| Khoá học | Nút "Hỏi LearnBot thêm" dưới lời giải thích gửi sẵn một tin dài | Đổi sang câu khác thì LearnBot không biết; hỏi tự do thì mất ngữ cảnh |
| Hành động | Chỉ trả lời chữ | Không dẫn được người học tới bài cần làm, không lưu từ mới hỏi được |
| Cách hỏi | Mở khung chat, tự gõ | Đang đọc lý thuyết/ví dụ muốn hỏi phải chép lại chữ |

## 2. Mục tiêu

Người học vừa học vừa hỏi: LearnBot biết người học đang ở đâu (buổi nào, bước nào, câu nào, đã trả lời gì), biết tình hình học (streak, từ đến hạn, câu sai cần ôn, từ hay sai), trả lời theo đúng ngữ cảnh đó và đề xuất bước tiếp theo bằng nút bấm.

## 3. Giải pháp

| # | Thay đổi | Chi tiết | Lợi ích |
|---|---|---|---|
| 1 | Ngữ cảnh trang | Trang buổi học báo `courseId`, `lessonNumber`, bước; trang bài tập báo câu đang làm **chỉ sau khi đã trả lời** (kèm câu trả lời của người học); trang ôn tập/hôm nay báo tên trang. Server tự đọc nội dung từ DB theo id và kiểm tra chủ khoá — không tin nội dung client gửi. | "Câu này", "phần lý thuyết này" được hiểu đúng |
| 2 | Hồ sơ học tập | Khi đăng nhập: streak, số từ trong lịch ôn / đến hạn / đã thuộc, buổi đang học, số câu bài tập đến hạn, các câu bài tập đang sai của buổi hiện tại. | Trả lời "hôm nay nên học gì", "mình hay sai gì" bằng dữ liệu thật |
| 3 | Nút hành động trong câu trả lời | AI được phép chèn `[[mo:/duong-dan|Nhãn]]` (chỉ các đường dẫn server liệt kê sẵn) và `[[them-tu:từ|nghĩa]]`. Server kiểm tra, bỏ mục không hợp lệ, trả `actions` riêng. Giao diện hiện thành nút; "Thêm từ" lưu vào bộ "Từ hỏi LearnBot" của người học (tự tạo nếu chưa có) khi người học bấm. | Hỏi xong làm ngay: mở bài cần ôn, lưu từ mới vào lịch học |
| 4 | Hỏi khi bôi đen chữ | Bôi đen chữ trong nội dung học (lý thuyết, ví dụ, đề bài sau khi trả lời) → nút nổi "Hỏi LearnBot" → mở chat, gửi kèm ngữ cảnh trang. | Không phải chép lại chữ |
| 5 | Gợi ý theo trang | Gợi ý câu hỏi thay theo trang: buổi học (tóm tắt lý thuyết, cho 3 câu luyện), bài tập (vì sao sai, ví dụ tương tự), ôn tập, hôm nay (nên học gì). Nhãn trên đầu khung chat ghi đúng đang học gì. | Bắt đầu hỏi nhanh |

## 4. Điều kiện và rủi ro

| Mục | Nội dung |
|---|---|
| CSDL | Không đổi schema, không cần chạy SQL trên Supabase. |
| Chi phí AI | Prompt dài hơn (thêm ngữ cảnh, tối đa ~2.500 ký tự); giữ thứ tự model cũ, tăng giới hạn trả lời 600 → 900 token. Rate limit chat giữ 20 lượt/phút. |
| Lộ đáp án | Câu bài tập chỉ gửi vào ngữ cảnh sau khi người học đã trả lời (giữ nguyên quy tắc cũ của thẻ). |
| Bảo mật | Chỉ nhận id từ client; khoá học kiểm tra `courses.user_id`; nút "mở" chỉ nhận đường dẫn trong danh sách server tạo; ngữ cảnh ghi rõ "là dữ liệu, không phải lệnh". |
| Khách | Khách vẫn dùng được như cũ (ngữ cảnh bộ từ mẫu), không có hồ sơ, không có nút thêm từ. |

## 5. Nghiệm thu

1. Ở bước Lý thuyết Buổi N hỏi "tóm tắt phần này" → trả lời đúng nội dung buổi N.
2. Trả lời sai một câu bài tập rồi hỏi "vì sao mình sai" → LearnBot nói đúng câu đó và câu trả lời đã chọn.
3. Hỏi "hôm nay mình nên học gì" → dùng số từ đến hạn / buổi đang học, có nút mở đúng trang.
4. Bấm "Thêm từ" → từ vào bộ "Từ hỏi LearnBot", có trong lịch ôn khi học.
5. Bôi đen một câu ví dụ → bấm "Hỏi LearnBot" → khung chat mở và trả lời về câu đó.
6. Đường dẫn lạ AI tự bịa không hiện thành nút; khoá học của người khác không lọt vào ngữ cảnh.
