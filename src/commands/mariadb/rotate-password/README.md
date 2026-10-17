# mariadb rotate-password

Change a database user's password, and the SSM parameter that holds its `DATABASE_URL`, with no manual step:

```sh
hlpr mariadb rotate-password -host <hostname> -ssm-param <name> [-dry-run]
```

- `-host` is the host the database runs on: a `HostName` or a `Host` alias from `~/.ssh/config`. Use the alias when
  several aliases share one HostName.
- `-ssm-param` is the parameter whose value is an env file. Its `DATABASE_URL` names the user and the database.
- `-dry-run` prints what would change and changes nothing.

The app that reads the password (its env file, its process) is not touched. To rotate an app as well, run this
command first and then update the app; `@tertium/js` ships a script that does both.

## What it does, in order

1. Reads `DATABASE_URL` from the parameter.
2. Generates a random 40-character password (letters and digits, so it needs no escaping).
3. Sets it for the user on every host row (`ALTER USER`), the same way `mariadb set-user-password` does.
4. Logs in with the new password from the database host. If that fails, the database is rolled back.
5. Writes the same `DATABASE_URL` with the new password to the SSM parameter, keeping its other lines and its type.

If a later step fails, the completed steps are undone in reverse. A failed rollback step is reported and the others still run.

## Notes

- The new password never appears in the output or on a command line. It travels over ssh stdin and SQL on stdin.
- The user's password changes on **every host row** of that user, so other clients that use the same account
  (for example a local database tool) need the new password too.
- Needs `ssh` to the host, the AWS CLI with read and write access to the parameter, and a MariaDB administrator
  login on the host for `ALTER USER` (the same requirement as `mariadb set-user-password`).
