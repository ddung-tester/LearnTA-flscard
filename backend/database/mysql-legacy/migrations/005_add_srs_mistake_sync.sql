USE learn_ta_flashcard;

CREATE TABLE IF NOT EXISTS mistake_words (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  card_id BIGINT UNSIGNED NULL,
  deck_id BIGINT UNSIGNED NULL,

  term_en VARCHAR(255) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  example_sentence TEXT,
  source VARCHAR(40) NOT NULL DEFAULT 'quiz',
  mistake_count INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('active', 'reviewed') NOT NULL DEFAULT 'active',

  last_wrong_at TIMESTAMP NULL,
  last_reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_mistake_words_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_mistake_words_card
    FOREIGN KEY (card_id) REFERENCES cards(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_mistake_words_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE SET NULL,

  UNIQUE KEY unique_mistake_user_card (user_id, card_id),
  INDEX idx_mistake_words_user_id (user_id),
  INDEX idx_mistake_words_deck_id (deck_id),
  INDEX idx_mistake_words_status (status),
  INDEX idx_mistake_words_last_wrong_at (last_wrong_at),
  INDEX idx_mistake_words_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS card_reviews (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  card_id BIGINT UNSIGNED NULL,
  deck_id BIGINT UNSIGNED NULL,

  term_en VARCHAR(255) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  example_sentence TEXT,
  source VARCHAR(40) NOT NULL DEFAULT 'quiz',
  level TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ease VARCHAR(20) NULL,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMP NULL,
  next_review_at TIMESTAMP NULL,
  status ENUM('active', 'mastered') NOT NULL DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_card_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_card_reviews_card
    FOREIGN KEY (card_id) REFERENCES cards(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_card_reviews_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE SET NULL,

  UNIQUE KEY unique_card_reviews_user_card (user_id, card_id),
  INDEX idx_card_reviews_user_id (user_id),
  INDEX idx_card_reviews_deck_id (deck_id),
  INDEX idx_card_reviews_next_review_at (next_review_at),
  INDEX idx_card_reviews_status (status),
  INDEX idx_card_reviews_created_at (created_at)
) ENGINE=InnoDB;

SET @schema_name = DATABASE();

SELECT COUNT(*)
INTO @has_study_duration_seconds
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'study_sessions'
  AND column_name = 'duration_seconds';

SET @sql = IF(
  @has_study_duration_seconds = 0,
  'ALTER TABLE study_sessions ADD COLUMN duration_seconds INT UNSIGNED NOT NULL DEFAULT 0 AFTER ended_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*)
INTO @has_study_created_at
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'study_sessions'
  AND column_name = 'created_at';

SET @sql = IF(
  @has_study_created_at = 0,
  'ALTER TABLE study_sessions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER progress_segments',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*)
INTO @has_study_updated_at
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'study_sessions'
  AND column_name = 'updated_at';

SET @sql = IF(
  @has_study_updated_at = 0,
  'ALTER TABLE study_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE study_sessions
  MODIFY mode ENUM('flashcard', 'quiz', 'written', 'review') NOT NULL;

SELECT COUNT(*)
INTO @has_study_mode_index
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'study_sessions'
  AND index_name = 'idx_study_sessions_user_mode';

SET @sql = IF(
  @has_study_mode_index = 0,
  'ALTER TABLE study_sessions ADD INDEX idx_study_sessions_user_mode (user_id, mode)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
