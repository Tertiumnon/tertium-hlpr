# mariadb backup

Dump a MariaDB or MySQL database over SSH into a local `.sql` file:

```sh
hlpr mariadb backup -host <hostname> -db-url <url> [-backup-dir <dir>] [-prefix <name>]
hlpr mariadb backup -host <hostname> -ssm-param <parameter> [-backup-dir <dir>] [-prefix <name>]
```

- `-host` is the `HostName` of the entry in `~/.ssh/config` (an IP or domain, not the `Host` alias). The command finds the entry and connects with its `Host` alias, so its `User`, `IdentityFile` and other settings apply. Fails if no entry or several entries have that `HostName`. The dump runs on that host.
- Give exactly one of `-db-url` (a `mysql://` or `mariadb://` URL, as the app on that host uses it) or
  `-ssm-param` (an AWS SSM parameter whose value is an env file; `DATABASE_URL` is read from it in memory).
- `-backup-dir` defaults to `backups` in the current directory. `-prefix` defaults to `backup`.

The output is `<backup-dir>/<prefix>_<timestamp>.sql`. The dump uses `--single-transaction --routines --triggers`
and the password is passed through `MYSQL_PWD`, not as an argument. Empty or partial files are removed.

Requires `ssh` locally, and `mariadb-dump` or `mysqldump` on the SSH host (Homebrew keg paths are probed too).
Needs the AWS CLI for `-ssm-param`. Give paths the way the local shell expects them: Git Bash `/c/...` paths
are not Windows paths, so use `C:\...` or a relative path.

## Examples

Plain credentials in the URL:

```sh
hlpr mariadb backup -host 10.0.0.5 -db-url "mysql://app:s3cret@127.0.0.1/app"
```

Credentials from SSM, so the password is not on the command line:

```sh
hlpr mariadb backup -host 10.0.0.5 -ssm-param /env/app/env.prod
```

Caution: plain credentials in `-db-url` go on the local command line, so they can show up in shell history and in local process listings while the command runs. Quote the URL, and percent-encode special characters in the password (`@` as `%40`, `#` as `%23`). `-ssm-param` keeps the password out of the command.
