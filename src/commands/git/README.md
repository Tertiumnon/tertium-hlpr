# Git Commands

Git utility commands for common workflows.

## Platform Support

All Git commands work on:

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires Git for Windows (includes Git Bash)

## switch-clean

Safely switch to a target branch and delete the previous branch (both local and remote).

### Usage

```bash
hlpr git switch-clean <target-branch>
```

### What it does

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

6. **Shows success message**
   - One-line summary of what was done

### Examples

```bash
# Switch from feature branch to develop and clean up
hlpr git switch-clean develop
# ✓ Switched to 'develop' and deleted 'feature/add-auth' (local & remote)

# Switch to main
hlpr git switch-clean main
# ✓ Switched to 'main' and deleted 'develop' (local only)
```

### Error Handling

The command will fail and exit if:

- No target branch is specified
- Not currently on a branch (detached HEAD)
- Already on the target branch
- There are uncommitted changes
- Current branch has unpushed commits
- Target branch doesn't exist on remote

### Safety Features

- **Uncommitted changes check**: Prevents switching if you have uncommitted work
- **Unpushed commits check**: Ensures all work on current branch is pushed before deletion
- **Remote existence check**: Only tries to delete remote branch if it exists
- **Safe branch deletion**: Uses `git branch -d` (not `-D`), which refuses to delete unmerged branches

## Other Git Commands

### fodd

Fetch and update develop branch from origin.

```bash
hlpr git fodd
```

Runs: `git fetch origin develop:develop`

### precommit

Pre-commit hook script.

```bash
hlpr git precommit
```
