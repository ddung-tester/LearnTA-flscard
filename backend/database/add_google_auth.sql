-- Google OAuth schema upgrade. Safe to run against both old and new installs.

SET @schema_name = DATABASE();

SELECT COUNT(*)
INTO @has_google_id
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND column_name = 'google_id';

SET @sql = IF(
  @has_google_id = 0,
  'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*)
INTO @has_avatar_url
FROM information_schema.columns
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND column_name = 'avatar_url';

SET @sql = IF(
  @has_avatar_url = 0,
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL AFTER google_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Google-only users do not have a password hash.
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

SELECT COUNT(*)
INTO @has_google_unique_index
FROM information_schema.statistics
WHERE table_schema = @schema_name
  AND table_name = 'users'
  AND column_name = 'google_id'
  AND non_unique = 0;

SET @sql = IF(
  @has_google_unique_index = 0,
  'ALTER TABLE users ADD UNIQUE KEY unique_users_google_id (google_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
