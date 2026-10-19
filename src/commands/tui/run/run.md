# tui run

Run a small full-screen terminal app.

## Usage

```bash
hlpr tui run <browse> [folder]
```

- `browse` - a simple full-screen file list, like a very small Midnight Commander. Starts in the current folder unless one is given. Folders are listed first.
  - `↑` / `↓` or `k` / `j` - move the cursor
  - `Enter` or `→` - open the selected folder
  - `←` or `Backspace` - go to the parent folder
  - `q`, `Esc`, or `Ctrl+C` - quit

`browse` shows one pane only, and files cannot be opened, copied, or moved from it. Requires an interactive terminal. Works on Windows, Linux, and macOS.
