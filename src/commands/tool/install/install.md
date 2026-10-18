# Install tools

Install Docker, htop, fastfetch, Starship, Claude CLI, Codex CLI, Copilot CLI, or another supported tool. Run without a name to choose from a keyboard menu.

```bash
hlpr tool install
hlpr tool install starship
hlpr tool install psreadline
hlpr tool install pstop
hlpr tool install tldr
hlpr tool install docker
hlpr tool install oh-my-zsh
hlpr tool install htop
hlpr tool install fastfetch
hlpr tool install claude-cli
hlpr tool install -name codex-cli
hlpr tool install -n copilot-cli
```

The menu uses ↑/↓, Enter or Space to install, and Esc to cancel. Name a tool as `hlpr tool install claude-cli` or with `-name claude-cli` (`-n` also works). Extra arguments are rejected. For Node.js, Python, Bun, Rust, and Go, use [`hlpr runtime install`](../../runtime/install/install.md).

| Tool | Supported environment |
| --- | --- |
| oh-my-posh | Windows, configured for PowerShell |
| Starship | Windows, configured for PowerShell |
| PSReadLine | Windows PowerShell or PowerShell Core |
| pstop | Windows |
| tldr | Windows/macOS/Linux with Node.js/npm (`npm install --global tldr`) |
| Claude CLI | Windows/macOS/Linux with Node.js/npm (`@anthropic-ai/claude-code`, command `claude`) |
| Codex CLI | Windows/macOS/Linux with Node.js/npm (`@openai/codex`, command `codex`) |
| Copilot CLI | Windows/macOS/Linux with Node.js/npm (`@github/copilot`, command `copilot`) |
| Docker | Windows (winget Docker Desktop), macOS (Homebrew Docker Desktop), Debian/Ubuntu (apt `docker.io`), Fedora (dnf `moby-engine` and `docker-cli`), Arch (pacman `docker`) |
| oh-my-zsh | Linux/macOS with Zsh; Windows through WSL |
| htop | macOS (Homebrew), Debian/Ubuntu (apt), Fedora (dnf), Arch (pacman); no native Windows install |
| fastfetch | Windows (winget, Chocolatey, Scoop), macOS (Homebrew), Debian/Ubuntu (apt), Fedora (dnf), Arch (pacman) |

Prompt tools (oh-my-posh, Starship) and PSReadLine are installed with `winget` or the PowerShell Gallery and require PowerShell on Windows. oh-my-zsh uses its official installation script and requires curl. For htop and fastfetch, hlpr uses the first available package manager in the order shown above. Fastfetch's apt package requires Debian 13+ or Ubuntu 25.04+; older releases need an [upstream `.deb` release](https://github.com/fastfetch-cli/fastfetch/releases). On Linux, the package manager may ask for administrator credentials.

Docker uses the first available supported package manager for the platform. Windows and macOS install Docker Desktop; start the app after installation. Linux installs the distribution's Docker Engine package, which may differ from Docker's official `docker-ce` release. On Fedora and Arch, start the service with `sudo systemctl start docker`; use `sudo docker` unless you have configured [non-root access](https://docs.docker.com/engine/install/linux-postinstall/). Docker Desktop has [system requirements and licensing terms](https://docs.docker.com/desktop/setup/install/windows-install/).

### Prompt setup

For oh-my-posh and Starship, hlpr finds your PowerShell profile (`$PROFILE`), removes the other prompt tool's init line if present, and appends the chosen tool's init line if it is not already there:

- oh-my-posh: `oh-my-posh init pwsh | Invoke-Expression`
- starship: `Invoke-Expression (&starship init powershell)`

Running it again does not duplicate the init line. Other profile lines are left untouched. The installed tool is not uninstalled when you switch; only the profile line changes. PSReadLine is configured with Tab menu completion and history predictions in ListView.

Restart your shell after installation. For PowerShell themes and configuration, see the cheatsheets in `pages/software/powershell/`.
