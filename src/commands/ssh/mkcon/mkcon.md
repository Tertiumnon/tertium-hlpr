# ssh mkcon

Create an SSH key for a remote account, install its public key, and save a local
connection:

```sh
hlpr ssh mkcon
```

The command asks for the SSH user, host or IP address, and a connection name
(default: the host). It creates a dedicated Ed25519 key pair named
`~/.ssh/<host>-<user>`, unless that pair already exists. `ssh-keygen`
asks for the key passphrase. SSH then connects
to the remote host and may ask for the account password or host-key confirmation.
The remote account must provide a POSIX shell and `mktemp`; the command creates
an `authorized_keys.bak-...` backup on the remote host before adding the public
key. It does not add the key again if it is already present.

After remote authorization succeeds, the command creates a local
`~/.ssh/config.bak-...` backup before appending a `Host` entry. Both backups are
created even when the corresponding file did not exist; in that case, the backup
is empty. It refuses to replace an existing connection name. Use
`ssh <connection-name>` afterward.

Requires `ssh` and `ssh-keygen` on the local PATH. On Windows, use an SSH client
that supports password prompts in the terminal. An interrupted attempt can leave
the new key pair in `~/.ssh`; rerunning the command reuses a complete pair.
