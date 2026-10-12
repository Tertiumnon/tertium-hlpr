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
hlpr git create -b feature/example
hlpr git switch -branch feature/example
hlpr git rm -b feature/example
hlpr git rm feature/example -remote
hlpr git sync
hlpr git clean
hlpr hello
hlpr hello world
hlpr ssh init dir

# TypeScript commands (nested structure)
hlpr rename -dir <dir> -style <style> -r -d -f
hlpr mv <oldPath> <newPath>

# Continue execution even if commands fail
hlpr -f ssh init dir
```

## Available Commands

See individual command documentation for detailed usage, options, and examples.

### TypeScript Commands

- **[rename](src/commands/rename/README.md)** (`rn`) - Rename files/directories with various case styles
- **[mv](src/commands/mv/README.md)** - Rename/move a single file and update all references to it
- **[help](src/commands/help/README.md)** - Display help information about hlpr commands
- **[hello](src/commands/hello/README.md)** - Display the Wake Up Neo sequence, Matrix rain, or Hello World art
- **[list process](src/commands/list/process/README.md)** - List running processes
- **[net scan](src/commands/net/scan/README.md)** - Show local TCP/UDP ports and their processes
- **[net devices](src/commands/net/devices/README.md)** - List known local-network device IPv4 addresses
- **[kill process](src/commands/kill/process/README.md)** - Kill a process by ID or port

### Shell Script Commands

Shell scripts support variable substitution using `{{variable}}` syntax.

- **[git](src/commands/git/README.md)** - Create, switch, remove, and clean Git branches/files
- **[nvm](src/commands/nvm/README.md)** - Node Version Manager utilities
- **[install](src/commands/install/README.md)** (`i`) - Install supported command-line tools
- **[ssh](src/commands/ssh/README.md)** - SSH configuration and setup utilities

## How It Works

### Shell Scripts

1. A shell command such as `hlpr git clean` looks for `commands/git/clean.sh`
2. If the script contains variables like `{{name}}`, you'll be prompted to enter values
3. Each line of the script is executed with the variables replaced

### TypeScript Commands

1. The command `hlpr rename` looks for a script at `commands/rename/rename.ts`
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
│   │   ├── clean.sh
│   │   ├── create.sh
│   │   ├── remove.sh
│   │   ├── switch.sh
│   │   ├── sync.sh
│   │   └── README.md
│   ├── hello/
│   │   ├── hello.ts
│   │   ├── hello.test.ts
│   │   ├── world/
│   │   │   ├── world.ts
│   │   │   └── world.test.ts
│   │   └── README.md
│   ├── i/
│   │   ├── i.ts
│   │   ├── i.test.ts
│   │   └── README.md
│   ├── nvm/
│   │   ├── i.sh
│   │   ├── use.sh
│   │   └── README.md
│   ├── kill/
│   │   └── process/
│   │       ├── process.ts
│   │       └── README.md
│   ├── list/
│   │   └── process/
│   │       ├── process.ts
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

Example script (`commands/example/greet.sh`):

```bash
echo "Hello World, {{name}}"
```

### TypeScript Commands

1. Create `commands/<category>/<category>.ts` or a nested `commands/<category>/<command>/<command>.ts`
2. Add the TypeScript implementation
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

- `hlpr git clean` → runs `commands/git/clean.sh`
- `hlpr nvm i -v 24` → runs `commands/nvm/i.sh`
- `hlpr nvm use -v 24` → runs `commands/nvm/use.sh`
- `hlpr ssh init dir` → runs `commands/ssh/initdir.sh`

**TypeScript Commands:**

- `hlpr rename <args>` → runs `commands/rename/rename.ts`
- `hlpr hello` → runs `commands/hello/hello.ts`
- `hlpr hello world` → runs `commands/hello/world/world.ts`

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

1. User runs: `hlpr git clean`
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
git clone https://github.com/Tertiumnon/tertium-hlpr.git
cd tertium-hlpr

# Install dependencies
npm install

# Setup git hooks (runs tests before commit)
npm run setup:hooks

# Build the project
bun run build

# Link for local development
npm link
```

### Git Hooks

This project uses native git hooks (`.githooks/pre-commit`) to run tests before each commit. After cloning or pulling, ensure hooks are configured:

```bash
npm run setup:hooks
```

The pre-commit hook:
- Runs unit and integration tests
- Runs end-to-end tests
- Aborts commit if tests fail
- Can be skipped with `SKIP_E2E=1 git commit` (not recommended)

## License

MIT
