# pm2 start

Start the apps of a PM2 ecosystem config on a remote host over ssh:

```sh
hlpr pm2 start -host <hostname> -dir <dir> -config <file>
```

Runs `pm2 start <file>` from `<dir>` on the host, so every app the config declares starts. `-dir` is an absolute
path on the host; `-config` is the file name inside it (for example `pm2.config.cjs`).
