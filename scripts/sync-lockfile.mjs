import { execSync } from 'child_process';

// Regenerate package-lock.json from current package.json
// This ensures npm ci will succeed with the updated dependencies
try {
  console.log('Regenerating package-lock.json...');
  execSync('npm install --package-lock-only --legacy-peer-deps', {
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit',
    timeout: 120000
  });
  console.log('Done - package-lock.json regenerated successfully');
} catch (error) {
  console.error('Failed to regenerate lockfile:', error.message);
  process.exit(1);
}
