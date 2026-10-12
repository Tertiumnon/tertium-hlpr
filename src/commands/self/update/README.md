# Update Command

Update hlpr itself to the latest version published on npm.

## Usage

```bash
hlpr self update
hlpr self update --help
```

### What it does

1. Reads the installed version from `package.json`
2. Looks up the latest `@tertium/hlpr` version with `npm view`
3. If npm has a newer version, updates the installation with `volta install @tertium/hlpr@latest` for Volta-managed copies or `npm install -g @tertium/hlpr@latest` otherwise. An older or equal npm version is never installed, so a locally newer build is not downgraded
4. Checks that the installed `hlpr app list --help` and `hlpr self update --help` commands run. If either fails, runs the same reinstall steps as `hlpr self fix` and checks again

### Notes

- Requires hlpr to be installed globally with npm (`npm install -g @tertium/hlpr`)
- Requires npm permissions to write to the global install location
- `--help` shows usage without contacting npm or installing anything
- A failed npm lookup or installation exits with an error
- If another installation (for example, a Bun link) comes first on PATH, updating
  the npm installation will not change which `hlpr` your shell runs
- If a Volta-managed installation is missing command files, repair it directly with `volta install @tertium/hlpr@latest`.
