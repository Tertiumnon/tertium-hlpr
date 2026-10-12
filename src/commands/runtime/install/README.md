# Install runtimes

Install Node.js, Python, Bun, Rust, or Go. Run without a name to choose from a keyboard menu.

```bash
hlpr runtime install
hlpr runtime install node -v 24
hlpr runtime install python -v 3
hlpr runtime install bun -v 1
hlpr runtime install rust
hlpr runtime install go
```

The menu uses ↑/↓, Enter or Space to install, and Esc to cancel. `-version` also accepts a major number for Node.js, Python, and Bun. Rust and Go install the current package version and do not accept a version flag.

| Runtime | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Node.js | winget LTS | Homebrew `node@24` by default | Debian/Ubuntu: NodeSource and apt |
| Python | Python install manager | Homebrew | Debian/Ubuntu: apt |
| Bun | Official installer | Homebrew | Official installer |
| Rust | winget Rustup | Homebrew | Debian/Ubuntu: apt; Fedora: dnf; Arch: pacman |
| Go | winget | Homebrew | Debian/Ubuntu: apt; Fedora: dnf; Arch: pacman |

Node defaults to the current LTS line. Python and Bun default to their current stable releases. On Linux, Rust and Go use the first available package manager among apt, dnf, and pacman. Package versions may lag upstream releases. Restart your shell after installation.
