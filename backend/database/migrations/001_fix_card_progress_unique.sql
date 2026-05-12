USE english_flashcard_quiz_app;

CREATE TEMPORARY TABLE card_progress_dedup AS
SELECT
  MIN(id) AS keep_id,
  COALESCE(user_id, 0) AS owner_key,
  card_id,
  MAX(mastery_level) AS mastery_level,
  SUM(review_count) AS review_count,
  SUM(correct_count) AS correct_count,
  SUM(wrong_count) AS wrong_count,
  MAX(last_reviewed_at) AS last_reviewed_at,
  MAX(next_review_at) AS next_review_at
FROM card_progress
GROUP BY COALESCE(user_id, 0), card_id
HAVING COUNT(*) > 1;

UPDATE card_progress cp
JOIN card_progress_dedup d ON d.keep_id = cp.id
SET cp.mastery_level = d.mastery_level,
    cp.review_count = d.review_count,
    cp.correct_count = d.correct_count,
    cp.wrong_count = d.wrong_count,
    cp.last_reviewed_at = d.last_reviewed_at,
    cp.next_review_at = d.next_review_at;

DELETE cp
FROM card_progress cp
JOIN card_progress_dedup d
  ON COALESCE(cp.user_id, 0) = d.owner_key
 AND cp.card_id = d.card_id
 AND cp.id <> d.keep_id;

DROP TEMPORARY TABLE card_progress_dedup;

ALTER TABLE card_progress
  DROP INDEX unique_user_card_progress;

ALTER TABLE card_progress
  ADD COLUMN progress_owner_key BIGINT UNSIGNED
    GENERATED ALWAYS AS (COALESCE(user_id, 0)) STORED AFTER user_id;

ALTER TABLE card_progress
  ADD UNIQUE KEY unique_user_card_progress (progress_owner_key, card_id);
