-- Cài đặt riêng từng người dùng (giao diện sáng/tối, âm thanh, cách xem lý thuyết, cài đặt học từng chế độ).
-- Một cột JSON để frontend thêm cài đặt mới không cần migration; PATCH gộp bằng JSON_MERGE_PATCH.
ALTER TABLE user_settings
  ADD COLUMN preferences JSON NULL AFTER email_reminders;
