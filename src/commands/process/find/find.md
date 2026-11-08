# process find

```sh
hlpr process find -name <name>
hlpr process find -id <id>
```

Find running processes by a case-insensitive substring of their executable name
or by exact process ID. The result shows the ID, state, and command name. Use
`hlpr process search` as an alias for `hlpr process find`. The command exits
with an error when no processes match.

Requires `tasklist` on Windows or `ps` on Linux and macOS. Windows reports the
state as RUNNING because `tasklist` does not report the Unix process state.
