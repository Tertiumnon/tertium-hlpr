# file find

Find files by a case-insensitive part of their name under the current directory.

```sh
hlpr file find -name <name>
hlpr file search -name <name>
```

Use quotes for names with spaces, for example `hlpr file find -name "project notes"`. Results are relative paths, sorted by name. The search includes hidden directories and does not follow directory symlinks. An unreadable directory causes a nonzero exit.
