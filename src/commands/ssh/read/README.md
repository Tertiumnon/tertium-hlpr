# ssh read

Print the `Host` block for one connection from `~/.ssh/config`:

```sh
hlpr ssh read -file <connection-name>
hlpr ssh read -f <connection-name>
```

The block starts at the matching `Host` line and ends before the next `Host` or `Match` line. A line such as `Host web api` matches either alias. Matching is case-insensitive, like `ssh`.

The command only reads the file. It does not print key contents; the `IdentityFile` path is shown as stored. Fails if the file is missing or no entry matches.
