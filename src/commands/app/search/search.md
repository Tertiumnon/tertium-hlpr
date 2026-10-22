# app search

Find installed apps or remote packages by a case-insensitive part of their name.

```sh
hlpr app search -name <name> [--remote]
hlpr app find -name <name> [--remote]
```

Use quotes for names with spaces, for example `hlpr app search -name "Visual Studio"`. Without `--remote`, searches the installed packages reported by available system package managers and prints matching app names. With `--remote`, searches the package managers' remote catalogs and prints each match with its manager, for example `Visual Studio Code [winget]`.

Remote search uses winget, choco, and scoop on Windows; brew on macOS; and apt-cache, dnf, pacman, zypper, snap, flatpak, and brew on Linux. It needs network access and at least one supported package manager; unavailable managers are skipped, and results depend on each manager's remote index.

Homebrew formulae and casks are queried separately on macOS, so casks remain distinguishable when output is captured. Linux searches Homebrew formulae only, uses DNF 4/5 `repoquery` for package names, and restricts zypper results to packages. Empty searches do not stop other managers; genuine manager failures still return an error. Linux installed searches omit dpkg entries that are no longer installed.

Scoop results include only configured buckets. Add a bucket first, for example `scoop bucket add extras` for Sourcetree, then repeat the search.
