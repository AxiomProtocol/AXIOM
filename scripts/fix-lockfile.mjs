import { execSync } from 'child_process';

console.log('Regenerating package-lock.json to sync with package.json...');
try {
  execSync('npm install --package-lock-only --legacy-peer-deps', {
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit',
    timeout: 300000,
  });
  console.log('package-lock.json updated successfully.');
} catch (e) {
  console.error('Failed to update lockfile:', e.message);
  process.exit(1);
}
