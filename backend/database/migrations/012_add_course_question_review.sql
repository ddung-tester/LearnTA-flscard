-- Ôn câu bài tập khoá học theo lịch SRS, cùng luật với từ vựng (utils/srs.js):
-- câu vào lịch ôn khi trả lời SAI; đã vào lịch thì đúng lên 1 cấp (ôn lại sau 1/3/7/14/30 ngày),
-- sai xuống 1 cấp và ôn lại ngay. next_review_at NULL = không nằm trong lịch ôn (chưa từng sai).

ALTER TABLE course_question_progress
  ADD COLUMN mastery_level TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER is_correct,
  ADD COLUMN next_review_at TIMESTAMP NULL AFTER mastery_level,
  ADD INDEX idx_course_question_progress_due (user_id, next_review_at);

-- Câu đang sai trước migration: đưa vào lịch ôn ngay
UPDATE course_question_progress SET next_review_at = CURRENT_TIMESTAMP WHERE is_correct = FALSE;
