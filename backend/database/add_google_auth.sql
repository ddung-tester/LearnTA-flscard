-- Migration: Add Google OAuth support
-- Chạy 1 lần duy nhất. Nếu chạy lần 2 sẽ báo lỗi "Duplicate column" → bỏ qua.

ALTER TABLE users
  ADD COLUMN google_id  VARCHAR(255) NULL UNIQUE AFTER password_hash,
  ADD COLUMN avatar_url VARCHAR(512) NULL AFTER google_id;
