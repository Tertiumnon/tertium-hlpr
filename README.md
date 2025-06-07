# hlpr

A CLI utility for running shell scripts with variable substitution.

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

# Continue execution even if commands fail
hlpr -f ssh init dir
```

## How It Works

1. The command `hlpr hello world` looks for a script at `commands/hello/world.sh`
2. If the script contains variables like `{{name}}`, you'll be prompted to enter values
3. Each line of the script is executed with the variables replaced

## Directory Structure

```
commands/
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

1. Create a directory structure in `commands/<category>/`
2. Add your `.sh` script files
3. Use `{{variable}}` syntax for user inputs

Example script (`commands/hello/world.sh`):
```bash
echo "Hello World, {{name}}"
```

## Command Naming

The utility maps command arguments to script files:
- `hlpr git fodd` → runs `commands/git/fodd.sh`
- `hlpr hello world` → runs `commands/hello/world.sh`
- `hlpr ssh init dir` → runs `commands/ssh/initdir.sh`

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
npm run build

# Link for local development
npm link
```

## License

MIT