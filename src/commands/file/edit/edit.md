# file edit

Edit a file on a remote host in your local editor, and upload it only when you saved changes:

```sh
hlpr file edit -host <hostname> -path <path> [-editor code|edit|nano|vi]
```

- `-editor` picks the editor: `code` (waits for the tab to close), `edit`, `nano` or `vi`. Without it, `$VISUAL`, then `$EDITOR`, then `edit` on Windows or `vi` elsewhere.
- `-path` is the file on the remote host. A leading `~/` is expanded by the remote shell.
- `-host` is the `HostName` of the entry in `~/.ssh/config` (an IP or domain, not the `Host` alias). The command finds the entry and connects with its `Host` alias, so its `User`, `IdentityFile` and other settings apply. Fails if no entry or several entries have that `HostName`.

## How it works

1. Downloads the file over `ssh` into a temp folder, named like the remote file so editors highlight it.
2. Opens it in the `-editor` choice if given. Otherwise in `$VISUAL`, then `$EDITOR`. Without either, it uses `edit` (MS-DOS Editor, in the terminal) on Windows and `vi` elsewhere. Other wait-style editors work through `$EDITOR`, such as `EDITOR="subl -w"`.
3. When the editor exits, compares the bytes with the download. If they differ, it writes them back with
   `cat >` on the host. Unchanged files are not uploaded.
4. Deletes the temp folder.

Uploading writes into the existing file, so its owner and permissions stay the same.
The command does not check whether the remote file changed while you were editing; the last save wins.
Needs `ssh` on the local machine. A remote file must already exist.

## Examples

```sh
hlpr file edit -host 10.0.0.5 -path /etc/nginx/nginx.conf
hlpr file edit -host 10.0.0.5 -path ~/app/.env -editor code
hlpr file edit -host 10.0.0.5 -path ~/app/.env -editor nano
```

## Platform Support

- **Local machine:** needs the OpenSSH `ssh` client. Built into Windows 10/11, macOS and most Linux distributions.
- **Remote host:** must be Linux or macOS with a POSIX shell that has `cat`. Windows hosts are not supported: the command runs `cat` on the host, and the default Windows OpenSSH shell has no `cat`.
- **Paths:** use POSIX paths on the remote host (`/etc/nginx/nginx.conf`, `~/app/.env`).
- **Editor:** `-editor` needs the editor installed locally (`code` needs the VS Code shell command). Without it: `edit` (MS-DOS Editor) on Windows, `vi` on macOS and Linux, unless `VISUAL` or `EDITOR` is set.

## See Also

- [file read](../read/read.md) - print the same remote file
