# pm2 start

Start the apps of a PM2 ecosystem config on a remote host over ssh:

```sh
hlpr pm2 start -ssh-host <host> -dir <dir> -config <file>
```

Runs `pm2 start <file>` from `<dir>` on the host, so every app the config declares starts. `-dir` is an absolute
path on the host; `-config` is the file name inside it (for example `pm2.config.cjs`).

## Host

`-ssh-host` names the host: a HostName or Host alias from `~/.ssh/config`. `-ssh-user` sets the login user. Without
`-ssh-host`, the host and the user come from the `-ssm-param` value: `DB_SSH_HOST` and `DB_SSH_USER` when set, else
`DEPLOY_HOST` and `DEPLOY_USER`, the keys the deploy uses. A flag always wins for its own field: with `-ssh-host`, the
parameter's user is not used, so the login comes from `-ssh-user` or the ssh config.
