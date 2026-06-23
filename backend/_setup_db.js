// Temporary setup script — creates the flowgrid database
const { execSync } = require('child_process');
require('dotenv').config();

const url = new URL(process.env.DATABASE_URL);
const password = decodeURIComponent(url.password);
const user = url.username;
const host = url.hostname;
const port = url.port || '5432';
const dbName = url.pathname.slice(1);

const pgBin = 'C:\\Program Files\\PostgreSQL\\18\\bin';

console.log(`Creating database "${dbName}" on ${host}:${port} as user "${user}"...`);

try {
  execSync(`"${pgBin}\\createdb.exe" -U ${user} -h ${host} -p ${port} ${dbName}`, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: 'inherit',
  });
  console.log('✅ Database created successfully!');
} catch (e) {
  if (e.status === 1) {
    console.log('ℹ️  Database may already exist (that is fine).');
  } else {
    console.error('❌ Failed:', e.message);
  }
}
