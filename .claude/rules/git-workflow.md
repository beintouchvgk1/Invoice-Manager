# Git Workflow Rules

## Push — always confirm first
Never run `git push` without explicit user confirmation, no matter the phrasing ("deploy", "publish",
"send it"). Show `git log origin/main..HEAD --oneline` and `git diff origin/main..HEAD --stat` first,
then ask, then wait for an explicit yes.

## Commits
- Only commit when the user explicitly asks — don't commit proactively after a task.
- Show `git status` and `git diff --stat` before staging.
- Stage specific files by name — never `git add -A` / `git add .` without reviewing what's included.
- Message format: `type: short description` (`feat`, `fix`, `refactor`, `style`, `chore`, `docs`).
- Never commit `.env` / `.env.local` or anything with the Mongo connection string / JWT secret.

## Branches
- Never force-push without explicit instruction.
- Never push directly to `main` without asking which branch to target.
- Never use destructive commands (`reset --hard`, `checkout --`, `clean -f`) without checking
  `git status` first and confirming nothing uncommitted would be lost.
