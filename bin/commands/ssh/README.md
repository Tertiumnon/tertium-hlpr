# SSH Commands

SSH configuration and setup utilities.

## Platform Support

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires Git Bash or WSL
  - Git Bash (included with Git for Windows) provides Unix-like `~/.ssh` directory
  - Native Windows SSH uses `%USERPROFILE%\.ssh` instead

## init-dir

Initialize SSH directory with proper permissions.

### Usage

```bash
hlpr ssh init-dir
```

### What it does

Creates the `~/.ssh` directory and essential SSH configuration files with correct permissions:

1. Creates `~/.ssh` directory (if it doesn't exist)
2. Creates `~/.ssh/known_hosts` file
3. Creates `~/.ssh/config` file
4. Sets directory permissions to 700 (rwx------)
5. Sets file permissions to 644 (rw-r--r--)

### Permissions explained

- `~/.ssh/` → 700 (only owner can read/write/execute)
- `~/.ssh/known_hosts` → 644 (owner can write, others can read)
- `~/.ssh/config` → 644 (owner can write, others can read)

These permissions are required by SSH for security. If permissions are incorrect, SSH will refuse to use the files.

### When to use

- Setting up SSH on a new system
- Fixing SSH permission issues
- After accidentally deleting SSH configuration files

### Example

```bash
$ hlpr ssh init-dir
# Creates ~/.ssh/ with proper structure and permissions
```

### Verify

```bash
ls -la ~/.ssh/
# Should show:
# drwx------  ~/.ssh/
# -rw-r--r--  ~/.ssh/config
# -rw-r--r--  ~/.ssh/known_hosts
```

### Note

This command will fail if `~/.ssh` already exists. If you need to fix permissions on an existing directory, you can:

```bash
chmod 700 ~/.ssh
chmod 644 ~/.ssh/known_hosts
chmod 644 ~/.ssh/config
```

### Next steps

After initializing the SSH directory, you typically:

1. Generate SSH keys: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add SSH config entries to `~/.ssh/config`
3. Add public key to remote servers or services (GitHub, GitLab, etc.)
