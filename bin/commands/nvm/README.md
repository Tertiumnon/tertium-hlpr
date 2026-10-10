# NVM Commands

Node Version Manager (nvm) utility commands.

## install

Install Node Version Manager (nvm).

### Usage

```bash
hlpr nvm install
```

### Platform Support

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ⚠️ **Windows** - Requires Git Bash or WSL (Windows Subsystem for Linux)
  - **Alternative for Windows**: Use [nvm-windows](https://github.com/coreybutler/nvm-windows) instead

### What it does

Downloads and installs nvm from the official repository using the installation script:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

### Post-installation

After installation, you may need to:

1. Close and reopen your terminal
2. Or source your shell profile:

   ```bash
   source ~/.bashrc  # or ~/.zshrc, ~/.bash_profile, etc.
   ```

### Verify installation

```bash
nvm --version
```

## lts

Install and use the latest Node.js LTS (Long Term Support) version.

### Platform Support (lts)

Same as `install` command - requires nvm to be installed.

### Usage

```bash
hlpr nvm lts
```

### What it does (lts)

1. Downloads and installs the latest LTS version of Node.js
2. Switches to use the newly installed LTS version

Equivalent to running:

```bash
nvm install --lts
nvm use --lts
```

### Example

```bash
$ hlpr nvm lts
Downloading and installing node v20.11.0...
Now using node v20.11.0 (npm v10.2.4)
```

### Prerequisites

- nvm must be installed first (use `hlpr nvm install`)

### Verify (lts)

```bash
node --version  # Should show the LTS version
npm --version   # npm comes with Node.js
```
