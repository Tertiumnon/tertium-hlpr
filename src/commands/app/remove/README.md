# app remove

Find and uninstall an app by part of its name or ID.

```sh
hlpr app remove -name <app name>
hlpr app delete -name <app name>
hlpr app uninstall -name <app name>
```

Use quotes for names with spaces, for example `hlpr app remove -name "Visual Studio"`.
Enter the displayed number to uninstall one app, or press Enter to cancel.

Requires an interactive terminal. Checks available package managers: winget, Chocolatey, and Scoop on Windows; Homebrew formulas and casks on macOS; apt/dpkg, RPM/DNF, pacman, and Homebrew on Linux. Only packages listed by these managers can be removed. Linux removal may request administrator credentials. The selected package manager may ask for further confirmation.
