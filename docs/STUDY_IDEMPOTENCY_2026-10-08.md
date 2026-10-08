# Chống ghi trùng kết quả học — 08/10/2026

## Hành vi đã sửa

Frontend dùng ID phiên local làm `client_request_id`, lưu payload tạo phiên trước khi gửi. Tải lại trang hoặc gửi lại vẫn dùng cùng mã. Quiz dùng cùng ID phiên, với khóa duy nhất riêng trong bảng quiz.

Backend tạo khóa duy nhất `(user_id, client_request_id)` trong `study_sessions` và `quiz_results`. Lần đầu trả 201; gửi lại cùng nội dung trả 200 với ID cũ. Cùng mã nhưng khác nội dung trả 409, giữ bản đã lưu. Khóa được tách theo tài khoản. XP/streak của phiên đã hoàn thành chỉ cộng khi insert mới thành công.

Các endpoint finish/answers giữ cơ chế khóa phiên và chống ghi trùng theo session/card hiện có. Request ID của phiên cũ kiểu số được chuyển thành chuỗi trước khi gửi quiz.

## Kiểm chứng

- Hai regression frontend đã thất bại trước sửa vì create/quiz không có mã yêu cầu ổn định. Sau sửa, mất phản hồi rồi tải lại vẫn gửi đúng mã và payload; hai phiên khác nhau có mã khác nhau.
- Frontend toàn bộ: 144 test đạt.
- Backend nhóm ứng dụng: 112 test đạt, 1 test MySQL opt-in bỏ qua khi chạy mặc định.
- MySQL thật, bật riêng: 5 test đạt (một test cha và bốn tình huống con), qua HTTP Express router/auth/controller thật và dữ liệu SQL thật.
- Gửi đồng thời 8 request tạo phiên hoàn thành: 1 response 201, 7 response 200, một ID/bản ghi, XP tăng 10 một lần.
- Gửi đồng thời 8 quiz: một ID/bản ghi. Gửi lại với kết quả khác trả 409. Tài khoản B dùng cùng mã trong bộ của B được phép, không nhận bản của A.
- Finish/answers gửi hai lần: một đáp án, mastery_level=1, review_count=1. XP tăng một lần cho mỗi phiên được hoàn thành.
- Migration trên schema cũ giữ được phiên và quiz cũ với hai cột mới NULL.
- Build đạt; lint 0 lỗi/23 cảnh báo.

Test MySQL tạo database tên `learnta_audit_<timestamp>_<pid>` riêng và dọn nó khi kết thúc. Không dùng tài khoản demo trong DB ứng dụng; các user/deck/card kiểm thử chỉ có trong database tạm.

## Trạng thái DB ứng dụng

Migration `backend/database/migrations/015_add_study_request_idempotency.sql` đã áp dụng vào DB được cấu hình trong backend. Đã kiểm tra đúng database, hai unique index được tạo và số bản ghi study_sessions/quiz_results trước và sau không đổi. Lần kết nối đầu timeout; đọc lại schema xác nhận chưa có cột/index mới rồi mới thử lại thành công.

Chỉ thêm bốn cột nullable và hai index; không sửa nội dung, không xóa hay gộp bản ghi cũ. Không tự khởi động lại process backend của người dùng hoặc triển khai production.

## Cách chạy lại kiểm tra

Từ thư mục frontend:

```powershell
npm test -- --configLoader native
npm run build
```

Từ thư mục backend:

```powershell
node --test test/*.test.js
$env:LEARNTA_MYSQL_TEST = '1'
node --test test/studyPersistence.mysql.test.js
Remove-Item Env:\LEARNTA_MYSQL_TEST
```

Test MySQL cần quyền tạo/xóa database kiểm thử riêng. Không tự ghi vào database ứng dụng khi chạy test mặc định.

Đối với môi trường khác: áp dụng migration 015 một lần trước khi chạy backend mới; triển khai backend trước frontend. DB khởi tạo mới dùng schema.sql đã cập nhật. Khi rollback mã, có thể giữ cột/index mới để không mất mã đã lưu. File migration dùng ALTER một lần, không chạy lại nguyên file trên DB đã có các cột này.

## Giới hạn còn lại

- Request từ client cũ không gửi client_request_id vẫn được chấp nhận để tương thích, nhưng không có bảo đảm chống trùng. Bản ghi đã tạo trước nâng cấp và mất phản hồi không thể tự nối lại chỉ từ mã mới; chưa tự gộp/xóa các bản trùng cũ.
- Bản test `backend/database/private-content/cau-mau/work/nhapCauMau.test.js` còn import sai module. Lệnh `npm test` backend đầy đủ hiện có 112 đạt, 1 lỗi, 1 bỏ qua; chưa chỉnh sửa công việc nội dung riêng này.
- Đã kiểm chứng HTTP → MySQL cho retry/đồng thời/XP/SRS. Chưa mở browser mới cho vòng kiểm tra này, chưa nghiệm thu CRUD metadata, audio Cloud Storage, Google OAuth hoặc rollout production.

Tham chiếu cơ chế lỗi/khóa InnoDB: [MySQL — khóa do câu lệnh SQL tạo](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html). Phần chống trùng được kiểm chứng thêm bằng test đồng thời trên MySQL thật.
