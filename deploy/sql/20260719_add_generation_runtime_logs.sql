SET @runtime_logs_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'generation_tasks'
    AND COLUMN_NAME = 'runtime_logs'
);

SET @runtime_logs_sql = IF(
  @runtime_logs_exists = 0,
  'ALTER TABLE generation_tasks ADD COLUMN runtime_logs JSON NULL AFTER model_params',
  'SELECT "runtime_logs already exists"'
);

PREPARE runtime_logs_stmt FROM @runtime_logs_sql;
EXECUTE runtime_logs_stmt;
DEALLOCATE PREPARE runtime_logs_stmt;
