# pm2 stop

Stop one PM2 process on a remote host over ssh:

```sh
hlpr pm2 stop -ssh-host <host> -name <pm2 name>
```

The process stays in the PM2 list. Start it again with `hlpr pm2 restart` or `hlpr pm2 start`.

## Host

`-ssh-host` names the host: a HostName or Host alias from `~/.ssh/config`. `-ssh-user` sets the login user. Without
`-ssh-host`, the host and the user come from the `-ssm-param` value: `DB_SSH_HOST` and `DB_SSH_USER` when set, else
`DEPLOY_HOST` and `DEPLOY_USER`, the keys the deploy uses. A flag always wins for its own field: with `-ssh-host`, the
parameter's user is not used, so the login comes from `-ssh-user` or the ssh config.
