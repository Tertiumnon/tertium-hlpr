# app search

Find installed apps by a case-insensitive part of their name. Prints matching app names only.

```sh
hlpr app search -name <name>
hlpr app find -name <name>
```

Use quotes for names with spaces, for example `hlpr app search -name "Visual Studio"`. Searches the installed packages reported by available system package managers; it does not search online catalogs.
