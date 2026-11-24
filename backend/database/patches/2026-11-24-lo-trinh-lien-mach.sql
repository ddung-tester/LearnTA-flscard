-- Lộ trình học liền mạch (24/11/2026). Chạy một lần trong Supabase SQL Editor, chạy lại vẫn an toàn.
-- 1) Câu bài tập gắn với mục lý thuyết của buổi
ALTER TABLE course_questions ADD COLUMN IF NOT EXISTS grammar_id VARCHAR(80) NULL;

-- 2) Đã đọc lý thuyết của buổi (đồng bộ giữa các máy)
CREATE TABLE IF NOT EXISTS course_lesson_progress (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id BIGINT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  theory_read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id)
);
DROP TRIGGER IF EXISTS trg_course_lesson_progress_updated_at ON course_lesson_progress;
CREATE TRIGGER trg_course_lesson_progress_updated_at BEFORE UPDATE ON course_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE course_lesson_progress ENABLE ROW LEVEL SECURITY;
