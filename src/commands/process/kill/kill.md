# process kill

Kill one process by ID, every process using a port, or every process running in a folder or from a file.

## Usage

```bash
hlpr process kill -id <id>
hlpr process kill -port <port>
hlpr process kill -folder <path>
hlpr process kill -file <path>
hlpr process kill -path <path>
```

`-folder`, `-file`, and `-path` are the same target: a folder matches everything under it, a file matches processes running that exact file.

Use `-f` or `--force` to force termination and `-v` or `--verbose` for details. Windows console processes can only be ended with `--force`.

Path targets match processes whose working directory, executable, or command line is in the path (Windows checks executable and command line only). They never kill hlpr, its parent shells, or a filesystem root.

Supported on Windows, Linux, and macOS. Linux reads `/proc`; macOS uses `lsof`; Windows uses PowerShell CIM. On Windows, working directories are not checked, so a `node` process started in the folder without its path on the command line is not matched.
