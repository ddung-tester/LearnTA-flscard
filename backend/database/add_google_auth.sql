-- Migration: Add Google OAuth support
-- Run this script once against your flashcard_db database.
-- Safe to run multiple times (uses IF NOT EXISTS logic via column check).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id  VARCHAR(255) NULL UNIQUE AFTER password_hash,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL AFTER google_id;
