# Prompt Commands

Setup utilities for PowerShell prompt themes.

## Platform Support

- ✅ **Windows** - Requires Git Bash (included with Git for Windows) and winget

## setup

Install and enable [oh-my-posh](https://ohmyposh.dev) or [Starship](https://starship.rs) in the PowerShell profile.

### Usage

```bash
hlpr prompt setup
```

You will be prompted for `tool`: `oh-my-posh` or `starship`.

### What it does

1. Installs the chosen tool with `winget`
2. Finds your PowerShell profile (`$PROFILE`)
3. Appends the init line to the profile if it is not already there:
   - oh-my-posh: `oh-my-posh init pwsh | Invoke-Expression`
   - starship: `Invoke-Expression (&starship init powershell)`

Running it again does not duplicate the init line.

### Next steps

Restart PowerShell. For themes and configuration, see the cheatsheets in `pages/software/powershell/`.
