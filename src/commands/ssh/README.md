# SSH Commands

SSH configuration and setup utilities.

## mkcon

Run `hlpr ssh mkcon` to create a key, authorize it on a remote host,
and add a backed-up local SSH config entry. See [mkcon](mkcon/README.md).

## mkkey

Run `hlpr ssh mkkey` to create a key pair and add a backed-up local SSH config entry
without connecting to the remote host. It shows the public key at the end. See [mkkey](mkkey/README.md).

Both commands name keys `~/.ssh/<host>-<user>`.

## read

Run `hlpr ssh read -file <connection-name>` to print one connection's `Host` block from `~/.ssh/config`. See [read](read/README.md).

## Platform Support

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires Git Bash or WSL
  - Git Bash (included with Git for Windows) provides Unix-like `~/.ssh` directory
  - Native Windows SSH uses `%USERPROFILE%\.ssh` instead

## fix

Run `hlpr ssh fix --permissions` to set the permissions of your existing `~/.ssh` and its files:

- `~/.ssh` → 700
- `*.pub`, `config`, `known_hosts`, `known_hosts.old` → 644
- every other file (private keys, `authorized_keys`, config backups) → 600

It only changes modes. It does not create, move, or delete files, and it does not ask for confirmation.
It needs an existing `~/.ssh`; run `hlpr ssh setup` first if there is none. On Windows, the Git Bash `chmod` may not reflect Unix modes on NTFS, so check the result with the SSH client.

## setup

Create `~/.ssh` with the permissions SSH requires.

### Usage

```bash
hlpr ssh setup
```

### What it does

Creates the `~/.ssh` directory and essential SSH configuration files with correct permissions.
If `~/.ssh` already exists, the command asks before changing its permissions; answer `y` to continue, or press Enter to leave everything unchanged.

Steps:

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
$ hlpr ssh setup
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

Existing `known_hosts` and `config` files are kept; the command only adds missing files and sets permissions. To fix permissions by hand instead, run:

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
