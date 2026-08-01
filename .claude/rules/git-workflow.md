# Git Workflow Rules

## Never commit or push — this is the owner's job, not Claude's
The project owner handles all `git commit`/`git push` themselves. **Never run either command, and
never ask whether to.** Leave changes staged/unstaged in the working tree when a task is done — the
owner reviews and commits on their own schedule. This holds regardless of phrasing ("save this",
"deploy", "wrap it up") — none of that means commit or push. The only exception is if the owner gives
a specific one-off instruction to commit/push in that exact message; even then, don't treat it as
standing permission for next time.

## Branches
- Switching branches (`git checkout`/`git switch`) to look at or work on different code is fine —
  just check `git status` first and don't discard uncommitted changes without confirming.
- Never force-push without explicit instruction.
- Never push directly to `main` without asking which branch to target.
- Never use destructive commands (`reset --hard`, `checkout --`, `clean -f`) without checking
  `git status` first and confirming nothing uncommitted would be lost.

## Branches
- Never force-push without explicit instruction.
- Never push directly to `main` without asking which branch to target.
- Never use destructive commands (`reset --hard`, `checkout --`, `clean -f`) without checking
  `git status` first and confirming nothing uncommitted would be lost.
