# File Mv Command

Rename or move a single file and automatically update every reference to it — markdown links,
wikilinks, and quoted import/require/href/src paths — in every text file under a directory, recursively.

No extension filtering is applied when scanning: every text file under the root is checked, and
binary files are skipped automatically.

## Usage

```bash
hlpr file mv <oldPath> <newPath> [--root <dir>] [--dry|-n] [--force] [--no-update-content]
```

### Arguments

- `<oldPath>` - Path to the existing file
- `<newPath>` - New path or filename. If it has no directory separators, the file is renamed
  in place (kept in the same directory as `<oldPath>`); otherwise it's treated as a full path
  and the file is moved there (missing directories are created).
- `--root <dir>` - Directory to scan for references (default: current directory)
- `--dry` or `-n` - Preview changes without applying them
- `--force` - Overwrite the destination file if it already exists
- `--no-update-content` - Skip updating references in other files (only rename/move the file)

## Examples

```bash
# Rename a markdown file in place and fix every link to it
hlpr file mv docs/old-name.md new-name.md

# Preview what would change first
hlpr file mv docs/old-name.md new-name.md --dry

# Move a file into another folder
hlpr file mv docs/old-name.md docs/archive/old-name.md

# Only scan a specific subtree for references
hlpr file mv docs/old-name.md new-name.md --root docs

# Overwrite an existing destination file
hlpr file mv docs/old-name.md docs/existing.md --force
```

## What Gets Updated

For every text file under `--root` (default: current directory), the command rewrites:

- **Markdown links & images**: `[text](./old-name.md)`, `![alt](../old-name.md)`, including
  `<path with spaces>` wrapping, `#heading` fragments, and `"title"` suffixes.
- **Wikilinks**: `[[old-name]]`, `[[old-name|Alias]]`, `[[old-name#Section]]`. Bare wikilinks
  (no path, Obsidian-style) are matched by basename across the whole scanned root — but only
  when that basename is unique. If another file shares the same basename anywhere under the
  root, bare wikilinks are left untouched to avoid an ambiguous rewrite (the command reports
  this in its output).
- **Quoted paths**: `'./old-name'`, `"../old-name.md"`, `` `./old-name` `` — covers JS/TS
  imports and requires, and HTML `href`/`src` attributes.

Each reference is resolved relative to the *referencing file's own directory* (or to `--root`
for root-relative/leading-`/` links) before being matched, so files in different folders each
get the correct relative path to the new location — not just a blind text substitution.

Links to unrelated files, and links using absolute URLs (`http://`, `mailto:`, etc.), are never
touched.

## Safety

- Errors out if the destination already exists, unless `--force` is passed.
- Handles case-only renames correctly on case-insensitive filesystems (Windows/macOS).
- `--dry` reports exactly what would be renamed and which files would be updated (and how many
  references in each), without touching disk.
- Skips `.git` and `node_modules` when scanning for references.

## TypeScript API

```typescript
import { renameFile } from './commands/file/mv/mv.js'

const result = await renameFile('docs/old-name.md', 'new-name.md', {
  root: 'docs',
  dryRun: false,
  force: false,
  updateContent: true,
})

// result.from / result.to           — resolved absolute paths
// result.updatedFiles                — [{ file, count }, ...]
// result.bareBasenameAmbiguous       — true if bare wikilinks were skipped due to a name clash
```

## See Also

- [Main hlpr README](../../../../README.md)
- [file rename](../rename/README.md) - bulk case-style renaming for whole directory trees
- [TypeScript Implementation](./mv.ts)
- [Tests](./mv.test.ts)
