# GitHub Usage Guide

Practical steps for working with this repo; add your own tips in **Additional Notes**.

## Prerequisites
- Install Git and set your name/email: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
- Authenticate with GitHub (SSH key or HTTPS with a personal access token if prompted).

## Clone the repo
```bash
git clone https://github.com/TrynotCatchError/server-dashboard.git
cd server-dashboard
git status   # confirm clean working tree
```

## Daily workflow
1) Sync main: `git checkout main` and `git pull origin main`.  
2) Branch for work: `git checkout -b feature/<topic>` (keep names short, e.g., `feature/auth` or `fix/logging`).  
3) Develop and test locally; keep changes scoped to the branch.  
4) Stage and commit small, coherent units:
   ```bash
   git add .
   git commit -m "feat: short description"   # or fix/docs/chore
   ```
5) Push the branch: `git push -u origin feature/<topic>`.

## Open a pull request
- On GitHub, open a PR from your branch into `main`.
- Checklist before requesting review:
  - Tests pass locally (and CI if present).
  - No unrelated debug code.
  - Docs and env notes updated if behavior changed.
- Address review comments with follow-up commits (avoid force-push unless necessary).

## Keep your branch current
```bash
git checkout feature/<topic>
git fetch origin
git merge origin/main   # or: git rebase origin/main
# Resolve conflicts if any, then:
git push
```

## Merge and clean up
- After approval, merge the PR on GitHub (squash or merge commit per team preference).
- Update local main: `git checkout main && git pull origin main`.
- Remove finished branches:
  ```bash
  git branch -d feature/<topic>
  git push origin --delete feature/<topic>   # optional cleanup on GitHub
  ```

## Deploy updated code (summary)
- On the server repo directory:
  ```bash
  git pull origin main
  npm install        # only if package files changed
  npm run build      # if the project has a build step
  pm2 restart server-dashboard
  ```

## Additional Notes (add more here)
- Tip: If commits are messy, use `git commit --amend` before pushing, or `git rebase -i origin/main` to clean history (advanced).
- Add your own tips below as you learn new workflows or tools. Keep each bullet short and actionable.
