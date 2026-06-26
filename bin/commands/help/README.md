# Help Command

Displays help information about available commands in the hlpr CLI tool.

## Usage

```bash
hlpr help
# or
hlpr --help
# or
hlpr -h
# or just
hlpr
```

## Description

The help command automatically discovers all available commands in the `commands/` directory and displays them in an organized format. It shows:

- Command categories (e.g., file, git, ssh, nvm)
- Command names and full usage
- Command type (TypeScript or Shell)
- Command descriptions (when available)
- Usage examples

## Features

- Auto-discovers commands from the commands directory
- Groups commands by category
- Shows command types (TypeScript or Shell scripts)
- Extracts descriptions from:
  - `@description` comments in source files
  - README.md files in command directories
- Displays formatted help with usage examples

## Examples

```bash
# Show all available commands
hlpr help

# If no command is provided, help is shown automatically
hlpr
```

## Output

The help command displays:

1. **Header** - Tool name and version
2. **Usage** - Basic syntax
3. **Options** - Available flags (-f, -v, help)
4. **Available Commands** - Grouped by category with descriptions
5. **Examples** - Common usage patterns
