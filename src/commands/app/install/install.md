# app install

Find an app by a case-insensitive part of its name in the available package managers, then choose which package to install from a keyboard menu.

```sh
hlpr app install -name <app name>
```

Use quotes for names with spaces, for example `hlpr app install -name "Visual Studio"`. The command searches the same remote catalogs as `hlpr app search -name <name> --remote`, then lists each match whose name contains the text, with its ID and manager. Descriptions are not searched, for example `Visual Studio Code (Microsoft.VisualStudioCode) [winget]`.

Use ↑/↓ to move through the list, Enter to install the selected package, and Esc to cancel. Long lists show twelve entries at a time. The menu needs an interactive terminal.

Scoop results include only configured buckets. To make apps such as Sourcetree available through Scoop, first run `scoop bucket add extras`, then repeat the command. Results from other known buckets are excluded because Scoop cannot install them by name until their bucket is configured.

Installs run with the selected manager and an exact package ID: winget, choco, scoop, brew (formula), brew-cask (cask), apt-get, dnf, pacman, zypper, snap, or flatpak. Each manager must be installed; unavailable managers are skipped. Windows uses winget, choco, and scoop; macOS searches Homebrew formulae and casks separately; Linux uses apt-cache, DNF 4/5 `repoquery`, pacman, zypper (packages only), snap, flatpak, and Homebrew formulae. An empty search in one manager does not discard matches from other managers; genuine manager failures are reported.

Installs through apt-get, dnf, pacman, zypper, and snap require `sudo` and may ask for your password. Flatpak 1.2 or newer resolves the exact application ID across configured remotes and may ask you to select a remote, installation, or branch; Flathub is not required. Snap packages that require classic confinement need a manual `snap install <id> --classic`; hlpr does not enable it automatically.

Catalogs and package availability depend on the host's configuration. Tests with captured output and simulated command results do not verify native macOS or Linux installation.
