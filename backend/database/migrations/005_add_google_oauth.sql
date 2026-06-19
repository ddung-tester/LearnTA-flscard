-- Migration 005: Add Google OAuth support
-- Allows password_hash to be NULL for Google-only accounts
-- Adds google_id column for linking to Google accounts
-- Adds auth_provider to distinguish login method

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email,
  ADD COLUMN auth_provider ENUM('local', 'google') NOT NULL DEFAULT 'local' AFTER google_id,
  ADD INDEX idx_users_google_id (google_id);
