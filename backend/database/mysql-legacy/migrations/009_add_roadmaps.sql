-- Lộ trình học (giống luyentu): mỗi lộ trình là một chuỗi bộ từ mẫu (user_id NULL) theo thứ tự.
-- Nội dung nạp bằng `npm run seed:roadmaps` từ database/content/lo-trinh.json.

CREATE TABLE IF NOT EXISTS roadmaps (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level_label VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_roadmaps_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roadmap_decks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  roadmap_id BIGINT UNSIGNED NOT NULL,
  deck_id BIGINT UNSIGNED NOT NULL,
  -- Khoá ổn định trong file nội dung, để chạy lại script nạp không tạo bộ từ trùng
  deck_key VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_roadmap_decks_roadmap
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_roadmap_decks_deck
    FOREIGN KEY (deck_id) REFERENCES decks(id)
    ON DELETE CASCADE,

  UNIQUE KEY unique_roadmap_decks_key (deck_key),
  UNIQUE KEY unique_roadmap_decks_deck (deck_id),
  INDEX idx_roadmap_decks_order (roadmap_id, sort_order)
) ENGINE=InnoDB;
