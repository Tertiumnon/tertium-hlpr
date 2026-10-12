# list app

List applications installed through the operating system package manager.

## Usage

```bash
hlpr list app -installed
```

Uses `winget list` on Windows, `brew list --versions` on macOS, and `apt list --installed` on Debian/Ubuntu.
