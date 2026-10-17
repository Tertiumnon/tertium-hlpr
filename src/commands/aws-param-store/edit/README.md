# aws-param-store edit

Edit one AWS Systems Manager Parameter Store value in your editor:

```sh
hlpr aws-param-store edit -name <param name> [-editor code|edit|nano|vi]
```

Examples:

```sh
hlpr aws-param-store edit -name /env/app/env.dev
hlpr aws-param-store edit -name /env/app/env.dev -editor code
```

- The value is copied into a private temp file, which opens in the `-editor` choice (`code` waits for the tab to close,
  `edit`, `nano` or `vi`), else `$VISUAL`, then `$EDITOR`, then `edit` on Windows or `vi` elsewhere. The command waits until the editor closes.
- If the file is unchanged, nothing is written. If it changed, the new value is written back with the
  parameter's current type (a SecureString stays a SecureString) and the new version is printed.
- An empty value is refused. If the editor exits with an error, nothing is written.
- The temp file is removed afterwards, even when the write fails. The value is on disk only for the time
  the editor has it open. On Windows, file permissions are not enforced, so the temp folder is the
  protection there.
- Needs the AWS CLI with credentials that can read and write the parameter.
