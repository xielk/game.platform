export function configureEnvironment() {
  if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_DATABASE && process.env.DB_USERNAME) {
    const user = encodeURIComponent(process.env.DB_USERNAME);
    const password = encodeURIComponent(process.env.DB_PASSWORD || '');
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '3306';
    const database = encodeURIComponent(process.env.DB_DATABASE);
    process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${database}`;
  }
}
