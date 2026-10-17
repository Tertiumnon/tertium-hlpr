# file read

Print a file from a remote host over SSH:

```sh
hlpr file read -host <hostname> -path <path>
```

- `-path` is the file on the remote host. A leading `~/` is expanded by the remote shell.
- `-host` is the `HostName` of the entry in `~/.ssh/config` (an IP or domain, not the `Host` alias). The command finds the entry and connects with its `Host` alias, so its `User`, `IdentityFile` and other settings apply. Fails if no entry or several entries have that `HostName`.

Runs `cat` on the host and writes the bytes to stdout, so pipe it or redirect it as needed.
Needs `ssh` on the local machine. Fails with the remote error (for example, no such file).

## Examples

```sh
hlpr file read -host 10.0.0.5 -path /etc/nginx/nginx.conf
hlpr file read -host 10.0.0.5 -path ~/app/.env > local.env
```

## Platform Support

- **Local machine:** needs the OpenSSH `ssh` client. Built into Windows 10/11, macOS and most Linux distributions.
- **Remote host:** must be Linux or macOS with a POSIX shell that has `cat`. Windows hosts are not supported: the command runs `cat` on the host, and the default Windows OpenSSH shell has no `cat`.
- **Paths:** use POSIX paths on the remote host (`/etc/nginx/nginx.conf`, `~/app/.env`).

## See Also

- [file edit](../edit/README.md) - edit the same remote file in your editor
