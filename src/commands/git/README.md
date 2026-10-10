# Git Commands

Small wrappers around common Git branch and cleanup operations.

## Usage

```bash
# Create a local branch without switching to it
hlpr git create -branch <branch>
hlpr git create -b <branch>

# Switch branches
hlpr git switch -branch <branch>

# Safely remove a merged local branch
hlpr git remove -branch <branch>
hlpr git rm -branch <branch>
hlpr git rm -b <branch>
hlpr git rm <branch> -remote
hlpr git rm <branch> -both

# Fetch all configured remotes and tags, pruning stale references
hlpr git sync

# Remove all untracked files and directories
hlpr git clean
```

`remove` uses `git branch -d`, so Git refuses to delete an unmerged local branch. `-remote` deletes the branch from `origin`; `-both` safely deletes it locally and then remotely. `clean` uses `git clean -fd`; it permanently removes untracked files and directories but preserves ignored files.

All commands require Git. On Windows, shell commands require Git Bash or WSL.
