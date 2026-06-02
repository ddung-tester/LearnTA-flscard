USE railway;

SET @schema_name = DATABASE();

SELECT COUNT(*)
INTO @has_sort_order_column
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'cards'
  AND column_name = 'sort_order';

SET @sql = IF(
  @has_sort_order_column = 0,
  'ALTER TABLE cards ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_favorite',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE cards c
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY deck_id
      ORDER BY created_at DESC, id DESC
    ) - 1 AS next_sort_order
  FROM cards
) ordered_cards ON ordered_cards.id = c.id
SET c.sort_order = ordered_cards.next_sort_order
WHERE @has_sort_order_column = 0;

SELECT COUNT(*)
INTO @has_cards_sort_order_index
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'cards'
  AND index_name = 'idx_cards_sort_order';

SET @sql = IF(
  @has_cards_sort_order_index = 0,
  'ALTER TABLE cards ADD INDEX idx_cards_sort_order (deck_id, sort_order)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
