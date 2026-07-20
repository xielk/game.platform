import 'dotenv/config';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/sql-run.mjs <sql-file> [more-sql-files]');
  process.exit(1);
}

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`SQL file not found: ${file}`);
    process.exit(1);
  }
}

const required = ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Database configuration missing: ${missing.join(', ')}`);
  process.exit(1);
}

const mysql = process.env.MYSQL_BIN || 'mysql';
const baseArgs = [
  `--host=${process.env.DB_HOST}`,
  `--port=${process.env.DB_PORT || '3306'}`,
  `--user=${process.env.DB_USERNAME}`,
  `--database=${process.env.DB_DATABASE}`,
  '--default-character-set=utf8mb4',
];

if (process.env.DB_PASSWORD) baseArgs.push(`--password=${process.env.DB_PASSWORD}`);

for (const file of files) {
  console.log(`Applying SQL: ${file}`);
  const result = spawnSync(mysql, [...baseArgs, `--execute=source ${file}`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
