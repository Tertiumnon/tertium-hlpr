# kill-port

Kill process(es) running on a specified port. Supports both Windows and Linux/macOS.

## Usage

```bash
hlpr process kill-port <port> [options]
```

## Arguments

- `port` - Port number (1-65535)

## Options

- `-f, --force` - Force kill (SIGKILL on Linux, /F on Windows)
- `-v, --verbose` - Show verbose output
- `-h, --help` - Show help message

## Examples

```bash
# Kill process on port 3000
hlpr process kill-port 3000

# Force kill with verbose output
hlpr process kill-port 8080 --force --verbose

# Kill process on port 5432
hlpr process kill-port 5432 -v
```

## Platform Support

### Windows
- Uses `netstat -ano` to find processes
- Uses `taskkill` to kill processes
- `-f/--force` flag uses `/F` switch (force termination)

### Linux/macOS
- Uses `lsof` (preferred) or `netstat` to find processes
- Uses `kill` command to terminate processes
- `-f/--force` flag sends SIGKILL instead of SIGTERM

## Exit Codes

- `0` - Success (all processes killed or no processes found)
- `1` - Failure (some processes could not be killed)
