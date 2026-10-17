# pm2 restart

Restart one PM2 process on a remote host over ssh, with `--update-env` so it reads the current environment:

```sh
hlpr pm2 restart -host <hostname> -name <pm2 name>
```

- `-host` is a `HostName` or `Host` alias from `~/.ssh/config`.
- `-name` is the PM2 process name (`pm2 ls` on the host).

The remote shell is `zsh -i` when zsh is installed (it loads `~/.zshrc`, where PM2 is usually put on PATH), and a
login `sh` otherwise.
