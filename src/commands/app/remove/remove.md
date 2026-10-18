# app remove

Find and uninstall an app by part of its name. Descriptions are not searched.

```sh
hlpr app remove -name <app name>
hlpr app delete -name <app name>
hlpr app uninstall -name <app name>
```

Use quotes for names with spaces, for example `hlpr app remove -name "Visual Studio"`.
Use ↑/↓ to move through the matching apps, Enter to uninstall the selected one, and Esc to cancel. Long lists show twelve entries at a time.

Requires an interactive terminal. Checks available package managers: winget, Chocolatey, and Scoop on Windows; Homebrew formulas and casks on macOS; apt/dpkg, RPM/DNF, pacman, zypper, snap, flatpak, and Homebrew on Linux. Only packages listed by these managers can be removed. Linux removal with apt-get, dnf, pacman, zypper, or snap may request administrator credentials. The selected package manager may ask for further confirmation.

Not supported: Mac App Store apps (`mas` cannot uninstall) and Linux packages from managers not listed above.
