ALTER TABLE study_sessions
  ADD COLUMN segment_size INT UNSIGNED NOT NULL DEFAULT 0 AFTER max_combo,
  ADD COLUMN segment_total INT UNSIGNED NOT NULL DEFAULT 0 AFTER segment_size,
  ADD COLUMN segment_completed INT UNSIGNED NOT NULL DEFAULT 0 AFTER segment_total,
  ADD COLUMN progress_segments JSON NULL AFTER segment_completed;

ALTER TABLE study_answers
  ADD COLUMN answer_meta JSON NULL AFTER is_correct;

ALTER TABLE quiz_results
  ADD COLUMN progress_segments JSON NULL AFTER total;
