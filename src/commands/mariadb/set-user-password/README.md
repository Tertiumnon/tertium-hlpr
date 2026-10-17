# mariadb user-password

Set the password of a MariaDB user on a remote host:

```sh
hlpr mariadb user-password -db-name <name> -db-password <password> -host <hostname>
```

- `-db-name` is the MariaDB user name (letters, digits and underscores).
- `-db-password` is the new password. It must not be empty or contain line breaks.
- `-host` is the `HostName` of the entry in `~/.ssh/config` (an IP or domain, not the `Host` alias). The command finds the entry and connects with its `Host` alias, so its `User`, `IdentityFile` and other settings apply. Fails if no entry or several entries have that `HostName`.

The command connects with `ssh` in batch mode and runs `sudo -n mariadb` on the host, so the
host must allow passwordless `sudo` for that user and the local root login must work. It first lists
every account row of the user (`mysql.user`, one per host), then runs `ALTER USER ... IDENTIFIED BY`
for each. The password travels over stdin and never appears in the remote command line or process list.

Fails, changing nothing, if the user does not exist on the host. Needs `ssh` on the local machine.
The `-db-password` flag is visible to local process listings and shell history while the command runs.
