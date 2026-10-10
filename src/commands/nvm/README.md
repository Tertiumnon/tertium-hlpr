# NVM Commands

Install and switch Node.js versions with nvm. Install nvm itself with `hlpr install nvm`.

## Usage

```bash
hlpr nvm i -v lts
hlpr nvm i -v 24
hlpr nvm use -v 24
hlpr nvm use -version 24
```

`-v` and `-version` are equivalent. Versions may be `lts`, a major version such as `24`, or a complete version such as `24.1.0`.

## Platform support

- Linux and macOS with Bash
- Windows through Git Bash or WSL

The commands load nvm from `$NVM_DIR/nvm.sh` or `~/.nvm/nvm.sh` when it is not already available.

`hlpr nvm use` verifies and activates the version inside its subprocess. Because nvm-sh is a shell function, run the displayed `nvm use <version>` command directly if the version must remain active in the current shell.
