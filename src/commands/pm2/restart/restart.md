# pm2 restart

Restart one PM2 process on a remote host over ssh, with `--update-env` so it reads the current environment:

```sh
hlpr pm2 restart -ssh-host <host> -name <pm2 name>
```

- `-ssh-host` is a `HostName` or `Host` alias from `~/.ssh/config`.
- `-name` is the PM2 process name (`pm2 ls` on the host).

The remote shell is `zsh -i` when zsh is installed (it loads `~/.zshrc`, where PM2 is usually put on PATH), and a
login `sh` otherwise.

## Host

`-ssh-host` names the host: a HostName or Host alias from `~/.ssh/config`. `-ssh-user` sets the login user. Without
`-ssh-host`, the host and the user come from the `-ssm-param` value: `DB_SSH_HOST` and `DB_SSH_USER` when set, else
`DEPLOY_HOST` and `DEPLOY_USER`, the keys the deploy uses. A flag always wins for its own field: with `-ssh-host`, the
parameter's user is not used, so the login comes from `-ssh-user` or the ssh config.
