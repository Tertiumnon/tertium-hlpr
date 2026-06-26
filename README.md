# hlpr

A CLI utility for running shell scripts with variable substitution and TypeScript-based commands.

## Platform Support

hlpr works on all major operating systems:

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires [Git for Windows](https://git-scm.com/download/win) (includes Git Bash)

**Note for Windows users:** Shell script commands (`.sh` files) require Bash, which is included with Git for Windows. TypeScript commands work on all platforms.

## Installation

```bash
# Install globally
npm install -g @tertium/hlpr

# Or with yarn
yarn global add @tertium/hlpr

# Or locally in your project
npm install @tertium/hlpr
```

## Usage

```bash
# Basic usage
hlpr <category> <command>

# Examples
hlpr git fodd
hlpr hello world
hlpr ssh init dir

# TypeScript commands (nested structure)
hlpr file rename <directory> <style> [--dry|-n]

# Continue execution even if commands fail
hlpr -f ssh init dir
```

## Available Commands

See individual command documentation for detailed usage, options, and examples.

### TypeScript Commands

- **[file rename](src/commands/file/rename/README.md)** - Recursively rename files/folders with various case styles
- **[help](src/commands/help/README.md)** - Display help information about hlpr commands
- **[process list-port](src/commands/process/list-port/README.md)** - List processes running on a port
- **[process kill-port](src/commands/process/kill-port/README.md)** - Kill processes on a port

### Shell Script Commands

Shell scripts support variable substitution using `{{variable}}` syntax.

- **[git](src/commands/git/README.md)** - Git utilities (fodd, precommit, switch-clean)
- **[hello](src/commands/hello/README.md)** - Example greeting command with variable substitution
- **[nvm](src/commands/nvm/README.md)** - Node Version Manager utilities
- **[ssh](src/commands/ssh/README.md)** - SSH configuration and setup utilities

## How It Works

### Shell Scripts

1. The command `hlpr hello world` looks for a script at `commands/hello/world.sh`
2. If the script contains variables like `{{name}}`, you'll be prompted to enter values
3. Each line of the script is executed with the variables replaced

### TypeScript Commands

1. The command `hlpr file rename` looks for a script at `commands/file/rename/rename.ts`
2. Arguments are passed directly to the TypeScript module
3. The module is executed with Bun runtime

## Directory Structure

```
src/
├── core/
│   └── command/
│       └── command.types.ts
├── commands/
│   ├── file/
│   │   └── rename/
│   │       ├── rename.ts
│   │       ├── rename.test.ts
│   │       └── README.md
│   ├── git/
│   │   ├── fodd.sh
│   │   ├── precommit.sh
│   │   ├── switch-clean.sh
│   │   └── README.md
│   ├── hello/
│   │   ├── world.sh
│   │   └── README.md
│   ├── nvm/
│   │   ├── install.sh
│   │   ├── lts.sh
│   │   └── README.md
│   ├── process/
│   │   ├── kill-port/
│   │   │   ├── kill-port.ts
│   │   │   └── README.md
│   │   └── list-port/
│   │       ├── list-port.ts
│   │       └── README.md
│   └── ssh/
│       ├── init-dir.sh
│       └── README.md
├── index.ts
└── commands.ts
```

## Adding Your Own Scripts

### Shell Scripts

1. Create a directory structure in `commands/<category>/`
2. Add your `.sh` script files
3. Use `{{variable}}` syntax for user inputs

Example script (`commands/hello/world.sh`):

```bash
echo "Hello World, {{name}}"
```

### TypeScript Commands

1. Create a nested directory structure in `commands/<category>/<command>/`
2. Add your TypeScript file named `<command>.ts`
3. Implement CLI argument parsing and logic
4. Optionally add tests in `<command>.test.ts`

Example structure:

```text
commands/
└── file/
    └── rename/
        ├── rename.ts      # Main implementation
        ├── rename.test.ts # Tests
        └── README.md      # Documentation
```

## Command Naming

The utility maps command arguments to script files:

**Shell Scripts:**

- `hlpr git fodd` → runs `commands/git/fodd.sh`
- `hlpr hello world` → runs `commands/hello/world.sh`
- `hlpr ssh init dir` → runs `commands/ssh/initdir.sh`

**TypeScript Commands:**

- `hlpr file rename <args>` → runs `commands/file/rename/rename.ts`

## How Shell Scripts (.sh) Work

Shell scripts are bash scripts stored in `src/commands/<category>/` directories. They support interactive variable substitution and are cross-platform compatible.

### Variable Substitution

Shell scripts can use `{{variable}}` placeholders for user input:

```bash
#!/bin/bash
# Example: src/commands/greet/hello.sh
echo "Hello {{name}}, welcome to {{place}}"
```

When you run `hlpr greet hello`, the utility:
1. Reads the script
2. Finds all `{{variable}}` placeholders
3. Prompts you to enter values for each variable
4. Executes the script with variables replaced

**Example interaction:**
```
$ hlpr greet hello
Enter value for name: Alice
Enter value for place: Wonderland
Hello Alice, welcome to Wonderland
```

### Script Execution

- Each line of the script is executed sequentially
- If any line fails and `-f` flag is not set, execution stops
- Scripts have access to standard bash features (pipes, redirects, etc.)

### Windows Compatibility

`.sh` scripts run on Windows through **PowerShell** and the modern cross-platform command stack.

**How it works:**

1. User runs: `hlpr git fodd`
2. hlpr detects the platform is Windows
3. hlpr invokes **PowerShell** to execute the `.sh` script
4. PowerShell (v7+) and installed tools provide Unix-like command support
5. Commands like `grep`, `sed`, `ls`, etc. work through various implementations

**Why this works:**

Modern Windows systems have multiple sources for Unix-like commands:

- **PowerShell 7+** - Cross-platform, provides built-in Unix-like commands and aliases (ls, grep, select-string, etc.)
- **Git** - Installs Unix utilities as part of its toolchain
- **Node.js** - Provides command-line tools that work cross-platform
- **Package managers** - scoop, chocolatey, and winget provide Unix tools
- **WSL 2** - Windows Subsystem for Linux provides full Linux compatibility

Scripts work because:
- Modern tools use consistent command-line interfaces across platforms
- PowerShell Core has native cross-platform support
- Common utilities are available through multiple sources in system PATH

**Example:**

```bash
#!/bin/bash
# This script works on Windows, Linux, and macOS
echo "Running on: $(uname -s || echo 'Windows PowerShell')"
if [ -d "./src" ]; then
  echo "Found src directory"
  ls src | head -5
fi
```

**Requirements:**

- **Modern PowerShell** (v7+) is recommended for full compatibility
- **Windows 10+** with default PowerShell Core support
- **Git** installed (provides additional Unix utilities)
- **Node.js** for runtime support

No special configuration needed - hlpr automatically detects and uses PowerShell on Windows.

### Creating Shell Scripts

1. Create directory: `src/commands/<category>/`
2. Add `.sh` file: `<command>.sh`
3. Add shebang: `#!/bin/bash`
4. Use `{{variable}}` for user input
5. Build with `bun run build` (copies `.sh` files to `bin/commands/`)

Example:

```bash
#!/bin/bash
# src/commands/greet/hello.sh
NAME={{name}}
echo "Hello $NAME!"
echo "Today is $(date '+%A')"
```

### Building and Distribution

Shell scripts are:
- **Copied** (not compiled) during build to `bin/commands/`
- **Distributed** as part of the published package
- **Platform-compatible** across Linux, macOS, and Windows (with Git Bash)

## Error Handling

By default, the utility stops execution if any command fails. Use the `-f` flag to continue execution despite failures:

```bash
# Stop on first failure (default)
hlpr ssh init dir

# Continue despite failures
hlpr -f ssh init dir
```

## Development

```bash
# Clone the repository
git clone https://github.com/tertiumnon/hlpr.git

# Install dependencies
npm install

# Build the project
bun run build

# Link for local development
npm link
```

## License

MIT
