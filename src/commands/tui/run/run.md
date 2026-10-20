# tui run

Run a small full-screen terminal app.

## Usage

```bash
hlpr tui run <explorer> [folder]
```

- `explorer` - a two-panel file manager, like a small Midnight Commander. Both panels start in the given folder, or the current folder. Folders are listed first.
  - `↑` / `↓` or `k` / `j` - move the cursor
  - `Tab` - switch panel
  - `Enter` or `→` - open the selected folder
  - `←` or `Backspace` - go to the parent folder
  - `F5` - copy the selected file or folder to the other panel
  - `F6` - move the selected file or folder to the other panel
  - `F7` - create a folder in the active panel
  - `F8` - delete the selected file or folder (type `y` and Enter to confirm)
  - `F10`, `q`, `Esc`, or `Ctrl+C` - quit

Copy and move never overwrite an existing item. Move copies and then deletes the source, so it is slower than a rename on large folders. Items cannot be selected in bulk. Requires an interactive terminal. Works on Windows, Linux, and macOS.
