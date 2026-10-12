# Install Commands

Install tools such as Docker, htop, and fastfetch.

## Platform Support

- **Windows** - installs Docker Desktop with winget; PowerShell tools require PowerShell
- **macOS** - installs Docker Desktop with Homebrew; oh-my-zsh requires a compatible shell and curl
- **Debian/Ubuntu** - installs Docker Engine with apt; oh-my-zsh requires a compatible shell and curl

Install [oh-my-posh](https://ohmyposh.dev), [Starship](https://starship.rs), [PSReadLine](https://learn.microsoft.com/powershell/module/psreadline/about/about_psreadline), pstop, [Docker](https://docs.docker.com/get-docker/), [oh-my-zsh](https://ohmyz.sh/), htop, or fastfetch.

### Usage

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
```

In the interactive menu, use ↑/↓ to choose an app and Enter or Space to install it; Esc cancels. You can also pass an app name directly. For Node.js, Python, Bun, Rust, and Go, use [`hlpr runtime install`](../../runtime/install/README.md).

### Compatibility

| Tool | Supported environment |
| --- | --- |
| oh-my-posh | Windows, configured for PowerShell |
| Starship | Windows, configured for PowerShell |
| PSReadLine | Windows PowerShell or PowerShell Core |
| pstop | Windows |
| tldr | Windows/macOS/Linux with Node.js/npm (`npm install --global tldr`) |
| Docker | Windows (winget Docker Desktop), macOS (Homebrew Docker Desktop), Debian/Ubuntu (apt `docker.io`), Fedora (dnf `moby-engine` and `docker-cli`), Arch (pacman `docker`) |
| oh-my-zsh | Linux/macOS with Zsh; Windows through WSL |
| htop | macOS (Homebrew), Debian/Ubuntu (apt), Fedora (dnf), Arch (pacman); no native Windows install |
| fastfetch | Windows (winget, Chocolatey, Scoop), macOS (Homebrew), Debian/Ubuntu (apt), Fedora (dnf), Arch (pacman) |

For htop and fastfetch, hlpr uses the first available package manager in the order shown above. Fastfetch's apt package requires Debian 13+ or Ubuntu 25.04+; older releases need an [upstream `.deb` release](https://github.com/fastfetch-cli/fastfetch/releases). On Linux, the package manager may ask for administrator credentials.

Docker uses the first available supported package manager for the platform. Windows and macOS install Docker Desktop; start the app after installation. Linux installs the distribution's Docker Engine package, which may differ from Docker's official `docker-ce` release. On Fedora and Arch, start the service with `sudo systemctl start docker`; use `sudo docker` unless you have configured [non-root access](https://docs.docker.com/engine/install/linux-postinstall/). Docker Desktop has [system requirements and licensing terms](https://docs.docker.com/desktop/setup/install/windows-install/).

### What it does

1. Installs oh-my-posh, Starship, or pstop with `winget`, PSReadLine from the PowerShell Gallery with Tab menu completion and history predictions in ListView, or oh-my-zsh from its official installation script
2. For prompt tools, finds your PowerShell profile (`$PROFILE`)
3. Removes the other prompt tool's init line from the profile, if present
4. Appends the chosen prompt tool's init line if it is not already there:
   - oh-my-posh: `oh-my-posh init pwsh | Invoke-Expression`
   - starship: `Invoke-Expression (&starship init powershell)`

Running it again does not duplicate the init line. Other profile lines are left untouched.

The installed tool is not uninstalled when you switch. Only the profile line changes.

### Next steps

Restart your shell after installation. For PowerShell themes and configuration, see the cheatsheets in `pages/software/powershell/`.
