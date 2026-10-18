# self fix

Reinstall the latest `@tertium/hlpr` package when command files are missing or damaged. This works even when the installed version is already the latest.

```sh
hlpr self fix
```

For a Volta-managed installation, this removes the existing hlpr package and installs it again with Volta. Other installations use `npm install -g --force @tertium/hlpr@latest`. The command needs network access and permission to modify the global installation. If installation fails after Volta removes the package, run `volta install @tertium/hlpr@latest` to retry.

The main `hlpr` entry point handles `self fix` directly, so it remains available when the nested command files are missing.
