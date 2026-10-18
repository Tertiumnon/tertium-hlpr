# app install

Find an app by a case-insensitive part of its name in the available package managers, then choose which package to install from a keyboard menu.

```sh
hlpr app install -name <app name>
```

Use quotes for names with spaces, for example `hlpr app install -name "Visual Studio"`. The command searches the same remote catalogs as `hlpr app search -name <name> --remote`, then lists each match with its ID and manager, for example `Visual Studio Code (Microsoft.VisualStudioCode) [winget]`.

Use ↑/↓ to move through the list, Enter to install the selected package, and Esc to cancel. Long lists show twelve entries at a time. The menu needs an interactive terminal.

Installs run with the selected manager and an exact package ID: winget, choco, scoop, brew (formula), brew-cask (cask), apt-get, dnf, pacman, zypper, snap, or flatpak. Each manager must be installed; unavailable managers are skipped. Windows uses winget, choco, and scoop; macOS uses brew; Linux uses apt-cache, dnf, pacman, zypper, snap, flatpak, and brew. Installs through apt-get, dnf, pacman, zypper, and snap run with `sudo` and may ask for your password. flatpak installs from the flathub remote.
