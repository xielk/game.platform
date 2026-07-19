import 'dotenv/config';
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  const required = ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Database configuration missing: ${missing.join(', ')}`);
    process.exit(1);
  }
  const user = encodeURIComponent(process.env.DB_USERNAME);
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const database = encodeURIComponent(process.env.DB_DATABASE);
  process.env.DATABASE_URL = `mysql://${user}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT || '3306'}/${database}`;
}

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
