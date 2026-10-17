# pm2 stop

Stop one PM2 process on a remote host over ssh:

```sh
hlpr pm2 stop -host <hostname> -name <pm2 name>
```

The process stays in the PM2 list. Start it again with `hlpr pm2 restart` or `hlpr pm2 start`.
