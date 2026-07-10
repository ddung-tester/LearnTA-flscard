-- Keep Google-only accounts valid and make answer submission idempotent.

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Preserve the earliest answer if historical retries created duplicates.
DELETE newer
FROM study_answers newer
JOIN study_answers older
  ON older.session_id = newer.session_id
 AND older.card_id = newer.card_id
 AND older.id < newer.id;

ALTER TABLE study_answers
  ADD UNIQUE KEY unique_study_answer_session_card (session_id, card_id);

-- Repair the XP counter for users created before streak updates maintained it.
UPDATE users u
LEFT JOIN (
  SELECT user_id, COALESCE(SUM(xp_earned), 0) AS total_xp
  FROM streak_logs
  GROUP BY user_id
) logs ON logs.user_id = u.id
SET u.total_xp = COALESCE(logs.total_xp, 0);
