# Install Commands

Setup utilities for PowerShell prompt themes.

## Platform Support

- ✅ **Windows** - Requires PowerShell and winget

## cli-tool

Install and enable [oh-my-posh](https://ohmyposh.dev) or [Starship](https://starship.rs) in the PowerShell profile.

### Usage

```bash
hlpr install cli-tool
hlpr install cli-tool starship
```

Choose from the displayed list, or pass `oh-my-posh` or `starship` as the final argument.

### What it does

1. Installs the chosen tool with `winget`
2. Finds your PowerShell profile (`$PROFILE`)
3. Removes the other tool's init line from the profile, if present (this is how you switch)
4. Appends the chosen tool's init line if it is not already there:
   - oh-my-posh: `oh-my-posh init pwsh | Invoke-Expression`
   - starship: `Invoke-Expression (&starship init powershell)`

Running it again does not duplicate the init line. Other profile lines are left untouched.

The installed tool is not uninstalled when you switch. Only the profile line changes.

### Next steps

Restart PowerShell. For themes and configuration, see the cheatsheets in `pages/software/powershell/`.
