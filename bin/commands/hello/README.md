# Hello Commands

Example/demo commands for testing the hlpr CLI tool.

## Platform Support

- ✅ **Linux** - Fully supported
- ✅ **macOS** - Fully supported
- ✅ **Windows** - Requires Git Bash or WSL

## world

Print a personalized hello world message.

### Usage

```bash
hlpr hello world
```

The command will prompt you for a name and then print a personalized greeting.

### Example

```bash
$ hlpr hello world
Enter name: Alice
Hello World, Alice
```

### Variables

- `name` - Your name (prompted during execution)

This command demonstrates the variable substitution feature of hlpr, where `{{name}}` in the script is replaced with user input.
