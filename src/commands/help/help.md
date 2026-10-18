# Help

Use `hlpr help`, `hlpr --help`, or `hlpr -h` to see commands grouped by category, with their syntax and short descriptions. The output uses color in a terminal and plain text when piped or when `NO_COLOR` is set.

Help discovers built commands and reads their usage and description from each command's source and doc file. Aliases come from the same map used by the CLI, so adding a command or alias updates both help entry points after a build.

Bare `hlpr` shows the logo, version, and a hint to run `hlpr help`.
