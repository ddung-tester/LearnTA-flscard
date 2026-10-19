-- Tiến độ bài tập khoá học riêng: kết quả LẦN TRẢ LỜI GẦN NHẤT của người học cho mỗi câu.
-- Tiến độ từ vựng không cần bảng mới: đọc card_progress trên bộ từ của buổi.
-- Nạp lại khoá học giữ nguyên id câu (khớp theo question_key); câu bị xoá khỏi file thì mất tiến độ theo.

CREATE TABLE IF NOT EXISTS course_question_progress (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  is_correct BOOLEAN NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_course_question_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_course_question_progress_question
    FOREIGN KEY (question_id) REFERENCES course_questions(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_course_question_progress (user_id, question_id)
) ENGINE=InnoDB;
