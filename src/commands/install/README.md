# Install Commands

CLI installation utilities.

## Platform Support

- **Windows** - installs runtimes with winget or their official installer; PowerShell tools require PowerShell
- **macOS** - installs runtimes with Homebrew; nvm and oh-my-zsh require a compatible shell and curl
- **Debian/Ubuntu** - installs runtimes with apt or their official installer; nvm and oh-my-zsh require a compatible shell and curl

Install [oh-my-posh](https://ohmyposh.dev), [Starship](https://starship.rs), [PSReadLine](https://learn.microsoft.com/powershell/module/psreadline/about/about_psreadline), pstop, nvm, or [oh-my-zsh](https://ohmyz.sh/).

### Usage

```bash
hlpr install
hlpr install starship
hlpr install psreadline
hlpr install pstop
hlpr install nvm
hlpr install oh-my-zsh
hlpr install node -v 24
hlpr install python -v 3
hlpr install bun -v 1
hlpr install node -version 24
```

`install` and `i` are equivalent. Choose from the displayed list, or pass an app name. Node defaults to the current LTS release. Python and Bun do not have LTS channels, so they default to the latest stable release. Runtime versions are selected by major number with `-v` or `-version`.

### Compatibility

| Tool | Supported environment |
| --- | --- |
| oh-my-posh | Windows, configured for PowerShell |
| Starship | Windows, configured for PowerShell |
| PSReadLine | Windows PowerShell or PowerShell Core |
| pstop | Windows |
| nvm | Linux/macOS with Bash; Windows through Git Bash or WSL |
| oh-my-zsh | Linux/macOS with Zsh; Windows through WSL |
| Node.js | Windows (winget), macOS (Homebrew), Debian/Ubuntu (NodeSource and apt) |
| Python | Windows (Python install manager), macOS (Homebrew), Debian/Ubuntu (apt) |
| Bun | Windows/Linux (official installer), macOS (Homebrew) |

### What it does

1. Installs oh-my-posh, Starship, or pstop with `winget`, PSReadLine from the PowerShell Gallery, or nvm/oh-my-zsh from their official installation scripts
2. For prompt tools, finds your PowerShell profile (`$PROFILE`)
3. Removes the other prompt tool's init line from the profile, if present
4. Appends the chosen prompt tool's init line if it is not already there:
   - oh-my-posh: `oh-my-posh init pwsh | Invoke-Expression`
   - starship: `Invoke-Expression (&starship init powershell)`

Running it again does not duplicate the init line. Other profile lines are left untouched.

The installed tool is not uninstalled when you switch. Only the profile line changes.

### Next steps

Restart your shell after installation. For PowerShell themes and configuration, see the cheatsheets in `pages/software/powershell/`.
