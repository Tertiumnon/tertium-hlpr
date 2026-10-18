# ssh mkkey

Create an SSH key pair and save its connection to `~/.ssh/config`, without
connecting to the remote host:

```sh
hlpr ssh mkkey
```

The command asks for the SSH user, host or IP address, and a connection name
(default: the host). It creates a dedicated Ed25519 key pair named
`~/.ssh/<host>-<user>`, unless that pair already exists. `ssh-keygen` asks for
the key passphrase. Before editing the config, the command creates a
`~/.ssh/config.bak-...` backup; the backup is empty if the file did not exist.
It refuses to replace an existing connection name.

At the end, the command prints the public key so you can add it to a remote
host, for example with `ssh-copy-id` or a provider's key settings. Use
`ssh <connection-name>` after the remote side has the key.

Use [`hlpr ssh mkcon`](../mkcon/mkcon.md) instead if you also want the key
installed on the remote host automatically.

Requires `ssh-keygen` on the local PATH.
