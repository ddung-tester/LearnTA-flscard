CREATE DATABASE IF NOT EXISTS railway
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE railway;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  fullname VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),

  total_xp INT UNSIGNED NOT NULL DEFAULT 0,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  last_study_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS decks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  icon VARCHAR(80),
  theme_color VARCHAR(50),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,

  streak INT UNSIGNED NOT NULL DEFAULT 0,
  mastered_count INT UNSIGNED NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_decks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  UNIQUE KEY unique_user_deck_title (user_id, title),
  INDEX idx_decks_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cards (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  deck_id BIGINT UNSIGNED NOT NULL,

  term_en VARCHAR(255) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  example_sentence TEXT,
  note TEXT,

  pronunciation VARCHAR(255),
  part_of_speech VARCHAR(50),

  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_cards_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE CASCADE,

  INDEX idx_cards_deck_id (deck_id),
  INDEX idx_cards_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  deck_id BIGINT UNSIGNED NOT NULL,

  mode ENUM('flashcard', 'quiz', 'written') NOT NULL,
  direction ENUM('en-vi', 'vi-en') NOT NULL,

  only_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  random_order BOOLEAN NOT NULL DEFAULT FALSE,

  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,

  total INT UNSIGNED NOT NULL DEFAULT 0,
  correct INT UNSIGNED NOT NULL DEFAULT 0,
  review INT UNSIGNED NOT NULL DEFAULT 0,
  xp_earned INT UNSIGNED NOT NULL DEFAULT 0,
  max_combo INT UNSIGNED NOT NULL DEFAULT 0,

  CONSTRAINT fk_study_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_study_sessions_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE CASCADE,

  INDEX idx_study_sessions_user_id (user_id),
  INDEX idx_study_sessions_deck_id (deck_id),
  INDEX idx_study_sessions_created (started_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS study_answers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  card_id BIGINT UNSIGNED NOT NULL,

  question_text TEXT,
  correct_answer TEXT,
  user_answer TEXT,

  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_study_answers_session
    FOREIGN KEY (session_id) REFERENCES study_sessions(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_study_answers_card
    FOREIGN KEY (card_id) REFERENCES cards(id)
    ON DELETE CASCADE,

  INDEX idx_study_answers_session_id (session_id),
  INDEX idx_study_answers_card_id (card_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS card_progress (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  card_id BIGINT UNSIGNED NOT NULL,

  mastery_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  correct_count INT UNSIGNED NOT NULL DEFAULT 0,
  wrong_count INT UNSIGNED NOT NULL DEFAULT 0,

  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_card_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_card_progress_card
    FOREIGN KEY (card_id) REFERENCES cards(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_user_card_progress (user_id, card_id),
  INDEX idx_card_progress_user_id (user_id),
  INDEX idx_card_progress_card_id (card_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  deck_id BIGINT UNSIGNED NOT NULL,

  question_type ENUM('multiple_choice', 'written', 'flashcard') NOT NULL,
  direction ENUM('en-vi', 'vi-en') NOT NULL,

  correct INT UNSIGNED NOT NULL DEFAULT 0,
  review INT UNSIGNED NOT NULL DEFAULT 0,
  total INT UNSIGNED NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quiz_results_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_quiz_results_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE CASCADE,

  INDEX idx_quiz_results_deck_id (deck_id),
  INDEX idx_quiz_results_user_id (user_id),
  INDEX idx_quiz_results_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS streak_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,

  study_date DATE NOT NULL,
  xp_earned INT UNSIGNED NOT NULL DEFAULT 0,
  cards_reviewed INT UNSIGNED NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_streak_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_user_study_date (user_id, study_date),
  INDEX idx_streak_logs_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,

  default_direction ENUM('en-vi', 'vi-en') NOT NULL DEFAULT 'en-vi',
  only_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  random_order BOOLEAN NOT NULL DEFAULT FALSE,
  reward_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reward_trigger_count INT UNSIGNED NOT NULL DEFAULT 10,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
