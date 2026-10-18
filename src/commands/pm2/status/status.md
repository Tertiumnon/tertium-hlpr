# pm2 status

Print the status of one PM2 process on a remote host:

```sh
hlpr pm2 status -ssh-host <host> -name <pm2 name>
```

It prints `online`, `stopped`, `errored`, or `missing` (no such process). The exit code is 1 unless the process is
`online`, so it can gate a script.

## Host

`-ssh-host` names the host: a HostName or Host alias from `~/.ssh/config`. `-ssh-user` sets the login user. Without
`-ssh-host`, the host and the user come from the `-ssm-param` value: `DB_SSH_HOST` and `DB_SSH_USER` when set, else
`DEPLOY_HOST` and `DEPLOY_USER`, the keys the deploy uses. A flag always wins for its own field: with `-ssh-host`, the
parameter's user is not used, so the login comes from `-ssh-user` or the ssh config.
