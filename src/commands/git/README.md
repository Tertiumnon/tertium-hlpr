# Git Commands

Helpful git utilities for common development workflows.

## Platform Support

All Git commands work on:

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires Git for Windows (includes Git Bash)

---

## fodd

Fetch and update develop branch from origin.

**Usage:**
```bash
hlpr git fodd
```

**What it does:**
- Fetches the `develop` branch from origin
- Updates your local `develop` branch to match the remote

**When to use:**
- Before starting work to ensure you have the latest develop branch
- To sync your local develop with the remote

**Command:**
```bash
git fetch origin develop:develop
```

---

## precommit

Run build and stage binaries before commit.

**Usage:**
```bash
hlpr git precommit
```

**What it does:**
1. Runs `bun run build` to compile your project
2. Stages the `bin/` directory for commit

**When to use:**
- Before committing changes to ensure binaries are up-to-date
- As a git pre-commit hook to automate the process

**Example workflow:**
```bash
# Make changes to source files
hlpr git precommit  # Build and stage bin/
git commit -m "feat: add new feature"
```

---

## switch-clean

Safely switch to a target branch and delete the previous branch (both local and remote).

**Usage:**
```bash
hlpr git switch-clean <target-branch>
```

**What it does:**

1. **Validates current state**
   - Checks you're on a branch (not detached HEAD)
   - Ensures you're not already on the target branch
   - Verifies there are no uncommitted changes

2. **Checks for unpushed commits**
   - Fails if current branch has commits that haven't been pushed
   - Prevents accidental loss of work

3. **Fetches target branch**
   - Runs `git fetch origin <target-branch>:<target-branch>`
   - Updates the target branch to match remote

4. **Switches to target branch**
   - Checks out the target branch

5. **Deletes previous branch**
   - Deletes local branch: `git branch -d <old-branch>`
   - Deletes remote branch (if exists): `git push origin --delete <old-branch>`

**Safety Features:**

- ✅ **Uncommitted changes check** - Prevents switching if you have uncommitted work
- ✅ **Unpushed commits check** - Ensures all work is pushed before deletion
- ✅ **Remote existence check** - Only deletes remote branch if it exists
- ✅ **Safe branch deletion** - Uses `git branch -d` (not `-D`), refuses to delete unmerged branches

**Examples:**

```bash
# Switch from feature branch to develop and clean up
hlpr git switch-clean develop
# ✓ Switched to 'develop' and deleted 'feature/add-auth' (local & remote)

# Switch to main
hlpr git switch-clean main
# ✓ Switched to 'main' and deleted 'develop' (local only)
```

**Error Handling:**

The command will fail and exit if:

- No target branch is specified
- Not currently on a branch (detached HEAD)
- Already on the target branch
- There are uncommitted changes
- Current branch has unpushed commits
- Target branch doesn't exist on remote

**Solution:**
- Commit or stash uncommitted changes
- Push unpushed commits: `git push origin <branch>`
- Ensure target branch exists on remote
