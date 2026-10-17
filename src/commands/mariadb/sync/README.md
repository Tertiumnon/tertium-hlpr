# mariadb sync

Copy one MariaDB database over another. It dumps the source on its SSH host and pipes the dump straight into
the target on its SSH host, so nothing is staged on disk in between:

```sh
hlpr mariadb sync -from-host <hostname> (-from-db-url <url> | -from-ssm-param <parameter>) \
                  -to-host <hostname> (-to-db-url <url> | -to-ssm-param <parameter>) [-dry-run] [-skip-backup] [-backup-dir <dir>]
```

- Each side needs its own `-…-host` (see `mariadb backup`) and exactly one of its URL or SSM parameter, the same as `mariadb backup`.
- `DATABASE_URL` is read as seen from that host, so `127.0.0.1` stays `127.0.0.1`.
- `-dry-run` resolves both sides, finds the binaries, prints the row counts and stops. It writes nothing.
- The target is backed up first to `<backup-dir>/<database>-before-sync_<timestamp>.sql` (default `backups`).
  If the backup fails, nothing is overwritten. `-skip-backup` turns the backup off.

**It overwrites the target without asking.** Run `-dry-run` first. The backup is the way back.

Refuses to run when source and target are the same database. Needs `ssh` locally, `mariadb-dump` or `mysqldump`
on the source host, and `mariadb` or `mysql` on both hosts. Needs the AWS CLI for `-…-ssm-param`.

## Examples

Both sides with plain credentials:

```sh
hlpr mariadb sync -from-host 10.0.0.5 -from-db-url "mysql://app:s3cret@127.0.0.1/app" \
                  -to-host 10.0.0.6 -to-db-url "mysql://app:s3cret@127.0.0.1/app_test" -dry-run
```

Both sides from SSM, so no password is on the command line:

```sh
hlpr mariadb sync -from-host 10.0.0.5 -from-ssm-param /env/app/env.prod \
                  -to-host 10.0.0.6 -to-ssm-param /env/app/env.test
```

Caution: plain credentials in `-from-db-url` or `-to-db-url` go on the local command line, so they can show up in shell history and in local process listings while the command runs. Quote the URLs, and percent-encode special characters in passwords (`@` as `%40`, `#` as `%23`). The SSM form keeps passwords out of the command.
