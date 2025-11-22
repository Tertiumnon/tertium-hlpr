# Rename Command

Recursively rename files and folders according to a specific case style.

## Usage

```bash
hlpr file rename <directory> <style> [--dry|-n]
```

### Arguments

- `<directory>` - The root directory to recursively process
- `<style>` - The target case style (see Supported Styles below)
- `--dry` or `-n` - Optional dry-run mode (preview changes without applying)

## Supported Styles

| Style | Description | Example |
|-------|-------------|---------|
| `title_underscore` | Title case with underscores | `File_Name` |
| `pascal_underscore` | Pascal-style with underscores (alias `title_underscore`) | `File_Name` |
| `snake` | Lowercase with underscores | `file_name` |
| `kebab` | Lowercase with hyphens | `file-name` |
| `camel` | Lowercase first word, capitalized rest | `fileName` |
| `pascal` | All words capitalized, no separators | `FileName` |
| `upper` | Uppercase with underscores | `FILE_NAME` |
| `lower` | Lowercase with underscores | `file_name` |

## Examples

### Dry Run (Preview Changes)

```bash
# Preview renaming all files/folders to kebab-case
hlpr file rename ./my-project kebab --dry

# Preview renaming with short flag
hlpr file rename ./src snake -n
```

### Apply Changes

```bash
# Rename all files/folders to kebab-case
hlpr file rename ./my-project kebab

# Rename to PascalCase
hlpr file rename ./docs pascal

# Rename current directory
hlpr file rename . snake
hlpr rename . snake
```

## Features

### ✅ Recursive Processing

The command walks through all subdirectories, renaming:

1. Files first (so they don't interfere with directory renames)
2. Directories after processing their contents

### ✅ Extension Preservation

File extensions are preserved. Only the base name is transformed:

- `file-name.md` → `file_name.md` (snake case)
- `MyComponent.tsx` → `my-component.tsx` (kebab case)

### ✅ Leading Dot Files

Files starting with a dot (e.g., `.gitignore`, `.env`) are handled specially:

- The leading dot is preserved
- The rest of the name is transformed
- `.gitIgnore` → `.git-ignore` (kebab case)

### ✅ Case-Only Renames (Windows)

Windows filesystems are case-insensitive, so renaming `File.txt` to `file.txt` requires special handling. The command uses a temporary file strategy to handle this correctly.

### ✅ Conflict Resolution

If a renamed file would conflict with an existing file, the command automatically adds a `_N` suffix:

- If `file-name.txt` → `file_name.txt` already exists
- The new file becomes `file_name_1.txt`

### ✅ Dry-Run Mode

Use `--dry` or `-n` to preview all changes before applying them:

```bash
hlpr file rename ./src kebab --dry
```

Output:

```text
Dry run - would rename 3 items:
  src/myFile.ts → src/my-file.ts
  src/anotherFile.ts → src/another-file.ts
  src/someFolder → src/some-folder
```

## TypeScript API

The command can also be used programmatically:

```typescript
import { renameRecursive, transformBasename } from './commands/rename/rename.js'

// Transform a single basename
const newName = transformBasename('MyFileName', 'kebab')
// Returns: 'my-file-name'

// Recursively rename with dry-run
const changes = await renameRecursive('./my-project', 'snake', { dryRun: true })
// Returns: [{ from: '...', to: '...' }, ...]

// Apply changes
await renameRecursive('./my-project', 'kebab')
```

## Technical Details

### Word Splitting

The command intelligently splits filenames into words by:

1. Splitting on non-alphanumeric characters (hyphens, underscores, spaces, etc.)
2. Splitting on CamelCase boundaries (`myFileName` → `my`, `File`, `Name`)
3. Preserving Unicode letters and numbers

### Transformation Algorithm

1. Walk directory tree recursively
2. For each file:
   - Extract basename (without extension)
   - Transform basename according to style
   - Append original extension
   - Rename file (handling case-only renames and conflicts)
3. For each directory (after processing contents):
   - Transform directory name according to style
   - Rename directory (handling case-only renames and conflicts)

### Error Handling

- If a rename fails, the command attempts to revert temporary changes
- All errors are logged to stderr
- The command exits with code 1 on failure

## Limitations

- Files and directories must be accessible (proper permissions)
- Very long paths (>260 characters on Windows) may fail
- Symlinks are not followed (treated as regular files/directories)

## Examples by Style

Starting with: `MyTestFile-name_Example.txt`

| Style | Result |
|-------|--------|
| `title_underscore` | `My_Test_File_Name_Example.txt` |
| `snake` | `my_test_file_name_example.txt` |
| `kebab` | `my-test-file-name-example.txt` |
| `camel` | `myTestFileNameExample.txt` |
| `pascal` | `MyTestFileNameExample.txt` |
| `upper` | `MY_TEST_FILE_NAME_EXAMPLE.txt` |
| `lower` | `my_test_file_name_example.txt` |

## See Also

- [Main hlpr README](../../README.md)
- [TypeScript Implementation](./rename.ts)
- [Tests](./rename.test.ts)
