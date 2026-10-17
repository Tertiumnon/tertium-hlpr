# pm2 status

Print the status of one PM2 process on a remote host:

```sh
hlpr pm2 status -host <hostname> -name <pm2 name>
```

It prints `online`, `stopped`, `errored`, or `missing` (no such process). The exit code is 1 unless the process is
`online`, so it can gate a script.
