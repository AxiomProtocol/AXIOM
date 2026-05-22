# Replit INDEX_LOCKED recovery

Use this only for a Replit workspace import or Git checkout that failed with
`INDEX_LOCKED`.

## Safety warning

Only remove `.git/index.lock` after confirming no active Git process is running.
Do not add this cleanup to application runtime code.

## Recovery steps

1. Stop all running Replit processes.
2. Open the Replit shell.
3. Confirm no Git command is still active.
4. Run:

```bash
rm -f .git/index.lock
git status
git fetch --quiet --depth=1 --no-tags origin main
git reset --hard origin/main
git clean -fd
npm install
npm run build
```

If `git status` shows unexpected local work, save it before running
`git reset --hard` or `git clean -fd`.
