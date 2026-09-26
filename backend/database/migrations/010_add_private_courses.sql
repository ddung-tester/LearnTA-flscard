-- Khoá học riêng: tài liệu cá nhân của MỘT người dùng (không công khai).
-- Nội dung nạp bằng `node scripts/nhap-khoa-hoc.js` từ database/private-content/ (thư mục không commit).
-- Từ vựng mỗi bài là một bộ từ riêng của chủ khoá (decks.user_id = chủ khoá).

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_courses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_courses_user_slug (user_id, slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_lessons (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT UNSIGNED NOT NULL,
  lesson_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  deck_id BIGINT UNSIGNED NULL,
  -- Lý thuyết đã chuẩn hoá: { grammar: [{ id, title, pattern, rules[], examples[{ en, vi }] }], notes: [] }
  content JSON NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_course_lessons_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_course_lessons_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE SET NULL,

  UNIQUE KEY unique_course_lessons_number (course_id, lesson_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_questions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED NOT NULL,
  -- Mã câu trong file nội dung, để nạp lại không tạo câu trùng
  question_key VARCHAR(80) NOT NULL,
  source VARCHAR(20) NOT NULL,
  section VARCHAR(80) NOT NULL,
  type ENUM('multiple_choice', 'fill_blank') NOT NULL,
  instruction TEXT NULL,
  prompt TEXT NOT NULL,
  -- Trắc nghiệm: [{ key, text }] và chữ cái đáp án đúng. Điền từ: các cách viết được chấp nhận.
  options JSON NULL,
  answer_key VARCHAR(4) NULL,
  accepted_answers JSON NULL,
  explanation TEXT NULL,
  answer_source VARCHAR(60) NULL,
  image_description VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_course_questions_lesson
    FOREIGN KEY (lesson_id) REFERENCES course_lessons(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_course_questions_key (lesson_id, question_key),
  INDEX idx_course_questions_order (lesson_id, sort_order)
) ENGINE=InnoDB;

-- Lời giải thích của AI theo từng (câu hỏi, câu trả lời đã chuẩn hoá): gọi Gemini một lần rồi dùng lại
CREATE TABLE IF NOT EXISTS course_question_explanations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  answer_norm VARCHAR(255) NOT NULL,
  explanation TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_course_question_explanations_question
    FOREIGN KEY (question_id) REFERENCES course_questions(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_course_question_explanations (question_id, answer_norm)
) ENGINE=InnoDB;
