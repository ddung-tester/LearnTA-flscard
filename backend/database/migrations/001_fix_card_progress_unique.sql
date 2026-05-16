USE learn_ta_flashcard;

DELETE FROM card_progress
WHERE user_id IS NULL;

CREATE TEMPORARY TABLE card_progress_dedup AS
SELECT
  MIN(id) AS keep_id,
  user_id,
  card_id,
  MAX(mastery_level) AS mastery_level,
  SUM(review_count) AS review_count,
  SUM(correct_count) AS correct_count,
  SUM(wrong_count) AS wrong_count,
  MAX(last_reviewed_at) AS last_reviewed_at,
  MAX(next_review_at) AS next_review_at
FROM card_progress
GROUP BY user_id, card_id
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
  ON cp.user_id = d.user_id
 AND cp.card_id = d.card_id
 AND cp.id <> d.keep_id;

DROP TEMPORARY TABLE card_progress_dedup;

SET @schema_name = DATABASE();

SELECT COUNT(*)
INTO @has_progress_unique
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'card_progress'
  AND index_name = 'unique_user_card_progress';

SET @sql = IF(
  @has_progress_unique > 0,
  'ALTER TABLE card_progress DROP INDEX unique_user_card_progress',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*)
INTO @has_progress_owner_key
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'card_progress'
  AND column_name = 'progress_owner_key';

SET @sql = IF(
  @has_progress_owner_key > 0,
  'ALTER TABLE card_progress DROP COLUMN progress_owner_key',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE card_progress
  MODIFY user_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE card_progress
  ADD UNIQUE KEY unique_user_card_progress (user_id, card_id);
