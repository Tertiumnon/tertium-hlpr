# app list

List installed app names without versions or package details.

## Usage

```bash
hlpr app list
```

Checks available tools: winget, Chocolatey, and Scoop on Windows; Homebrew formulas and casks on macOS; dpkg, RPM/DNF, pacman, zypper, snap, flatpak, and Homebrew on Linux. The list includes packages these tools report, including system packages.

Shows ten names per page. In a terminal, use Right arrow or `n` for the next page, Left arrow or `p` for the previous page, and `q` or Esc to quit. When piped, only the first ten names are printed.
