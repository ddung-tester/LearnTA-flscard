-- Migration: Add email_reminders opt-in to user_settings
-- Chạy 1 lần. Nếu cột đã tồn tại sẽ báo lỗi "Duplicate column" → bỏ qua.

ALTER TABLE user_settings
  ADD COLUMN email_reminders BOOLEAN NOT NULL DEFAULT TRUE;
