# Git Workflow

A plain guide to working with git safely. This is generic and reusable as written. It does not assume any one project.

## Core ideas

- **Repo.** A repo is a folder whose history git tracks. It lives on your computer and usually has a copy online (the remote).
- **Clone.** Cloning copies a remote repo down to your computer so you can work on it.
- **Status.** `git status` shows what you have changed and what is staged. Run it often. It is the cheapest way to know where you stand.
- **Add.** `git add` stages the changes you want to save next. Staging is choosing what goes into the next commit.
- **Commit.** `git commit` saves your staged changes as one labeled step in history, with a short message saying what changed.
- **Push.** `git push` sends your commits up to the remote so others (and backups) have them.
- **Pull.** `git pull` brings down commits other people pushed, so your copy is current.
- **Branch.** A branch is a separate line of work. You make changes on a branch without touching the main line until you are ready.
- **PR (pull request).** A PR proposes merging your branch into the main line. It is where changes get reviewed before they land.

## A safe flow

1. **Pull before you start.** Get the latest so you do not build on top of stale work.
2. **Make a feature branch.** Name it for the work, like `feature/signup-form`. Keep the main line clean.
3. **Commit as you go.** Small, labeled commits are easier to read and undo than one giant one.
4. **Push your branch.** This backs up your work and makes it shareable.
5. **Open a PR.** Let the change be reviewed, then merge it into main.

## What NOT to do

- **No unattended push to main.** Do not push straight to the main branch and walk away. Main is the line everyone depends on. Changes reach it through a reviewed PR.
- **Do not treat the IDE as the source of truth.** Your editor shows the working copy, not history. The repo and the remote are the truth. Save and commit so your work actually exists in history, not just on screen.

## A typical day

1. `git pull` to get current.
2. `git checkout -b feature/my-change` to start a branch.
3. Do the work. Run `git status` to see what changed.
4. `git add` the files you mean to save.
5. `git commit -m "short message"` to save the step.
6. Repeat the work, add, commit cycle as needed.
7. `git push` to send the branch up.
8. Open a PR, get it reviewed, merge it.

## Common fixes

- **Merge conflict.** Two changes touched the same lines. Git marks the spots in the file. Open the file, pick the right version (or blend them), remove the conflict markers, then `git add` the file and commit. Take it one file at a time.
- **Wrong branch.** You committed on the wrong branch. You can move the work to the right branch. Easiest path: make the correct branch from where you are, then reset the wrong branch back. When unsure, ask before rewriting history.
- **Pushed a secret.** If a password, key, or token ends up in a commit, treat it as leaked. Rotate it right away (change the secret at its source so the old one stops working). Make sure your `.env` file is listed in `.gitignore` so secrets never get committed again. Removing it from history is a separate, more careful step, but rotating first is what actually protects you.
