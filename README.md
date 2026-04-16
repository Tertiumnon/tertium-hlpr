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

### Shell Script Commands

Shell scripts support variable substitution using `{{variable}}` syntax.

- `git fodd` - Git command
- `hello world` - Hello world example
- `ssh init dir` - SSH initialization

### TypeScript Commands

TypeScript commands are implemented as `.ts` files and run directly with Bun.

#### file rename

Recursively rename files and folders according to a specific case style.

**Supported styles:**

- `title_underscore` - Title_Case_With_Underscores
- `snake` - snake_case_lowercase
- `kebab` - kebab-case-lowercase
- `camel` - camelCaseLowerFirst
- `pascal` - PascalCaseUpperFirst
- `upper` - UPPER_CASE_WITH_UNDERSCORES
- `lower` - lower_case_with_underscores

**Examples:**

```bash
# Dry run (preview changes without applying)
hlpr file rename ./my-project kebab --dry
hlpr file rename ./src snake -n

# Apply changes
hlpr file rename ./my-project kebab
hlpr file rename ./docs pascal
```

**Features:**

- ✅ Recursive directory traversal
- ✅ Extension preservation (e.g., `file-name.md` core name only)
- ✅ Leading dot file support (e.g., `.gitignore`)
- ✅ Case-only rename handling (Windows compatibility)
- ✅ Conflict resolution (adds `_N` suffix)
- ✅ Dry-run mode (`--dry` or `-n`)

See `commands/file/rename/README.md` for detailed documentation.

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
commands/
├── file/
│   └── rename/
│       ├── rename.ts
│       ├── rename.test.ts
│       └── README.md
├── git/
│   └── fodd.sh
├── hello/
│   └── world.sh
├── nvm/
│   ├── install.sh
│   └── lts.sh
└── ssh/
    └── initdir.sh
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
