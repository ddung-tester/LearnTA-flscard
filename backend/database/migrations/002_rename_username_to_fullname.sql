USE english_flashcard_quiz_app;

SET @schema_name = DATABASE();

SELECT COUNT(*)
INTO @has_username_index
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND index_name = 'username';

SET @sql = IF(
  @has_username_index > 0,
  'ALTER TABLE users DROP INDEX username',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*)
INTO @has_username_column
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND column_name = 'username';

SELECT COUNT(*)
INTO @has_fullname_column
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND column_name = 'fullname';

SET @sql = IF(
  @has_username_column > 0 AND @has_fullname_column = 0,
  'ALTER TABLE users CHANGE COLUMN username fullname VARCHAR(50) NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
