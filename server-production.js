const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || '5000';
const HOSTNAME = '0.0.0.0';

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');
console.log(`[Boot] Starting Next.js standalone on ${HOSTNAME}:${PORT}`);

const child = spawn(process.execPath, [standaloneServer], {
  env: {
    ...process.env,
    HOSTNAME: HOSTNAME,
    PORT: PORT,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
  cwd: path.join(__dirname, '.next', 'standalone'),
});

child.on('error', (err) => {
  console.error('[Boot] Failed to start Next.js:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  console.error(`[Boot] Next.js exited with code ${code}`);
  process.exit(code || 1);
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
