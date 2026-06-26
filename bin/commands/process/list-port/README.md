# list-port

List process(es) running on a specified port. Supports both Windows and Linux/macOS.

## Usage

```bash
hlpr process list-port <port> [options]
```

## Arguments

- `port` - Port number (1-65535)

## Options

- `-v, --verbose` - Show verbose output
- `-h, --help` - Show help message

## Examples

```bash
# List processes on port 3000
hlpr process list-port 3000

# List with verbose output
hlpr process list-port 8080 -v

# List processes on port 5432
hlpr process list-port 5432
```

## Output Format

Displays a table with:
- **PID** - Process ID
- **STATE** - Connection state (LISTENING, ESTABLISHED, etc.)
- **COMMAND** - Process name/command

## Platform Support

### Windows
- Uses `netstat -ano` to find processes
- Uses `tasklist` to get process names
- Shows PID, state, and command

### Linux/macOS
- Uses `lsof` (preferred) or `netstat` (fallback) to find processes
- Shows PID, state, and command name

## Exit Codes

- `0` - Success (processes found)
- `1` - No processes found or error

## See Also

- `hlpr process kill-port` - Kill processes on a port
