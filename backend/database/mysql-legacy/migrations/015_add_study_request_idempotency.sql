-- Apply before deploying the controller changes. Existing rows retain NULL keys.
ALTER TABLE study_sessions
  ADD COLUMN client_request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER user_id,
  ADD COLUMN request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER client_request_id,
  ADD UNIQUE KEY uq_study_sessions_user_request (user_id, client_request_id);

ALTER TABLE quiz_results
  ADD COLUMN client_request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER user_id,
  ADD COLUMN request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER client_request_id,
  ADD UNIQUE KEY uq_quiz_results_user_request (user_id, client_request_id);
