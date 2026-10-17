# aws-param-store set

Replace the value of one `KEY=value` line in a `.env` value stored in AWS Systems Manager Parameter Store.
Every other line stays as it is:

```sh
printf '%s' "$NEW_PASSWORD" | hlpr aws-param-store set -name /env/app/env.prod -key DB_PASSWORD
hlpr aws-param-store set -name /env/app/env.prod -key DB_HOST -value 10.0.0.6
```

- `-name` is the parameter that holds the `.env` text.
- `-key` is the variable to change. It must be a variable name such as `DB_PASSWORD`.
- `-value` is the new value. Without it, the value is read from stdin, so it stays off the command line.
  `-value` is visible in shell history and in local process listings while the command runs.

## What it changes

- Only the one line that assigns the key. Its leading indent, `export ` prefix and CRLF line ending are kept.
- A key that is missing, or set more than once, is refused and nothing is written. Remove the extra lines first.
- A value that has spaces, `#`, `$` or other special characters is written in single quotes, which `.env`
  parsers read literally. A value that contains a single quote or a line break is refused.
- The parameter keeps its type: a SecureString stays a SecureString.
- Nothing is printed except the version number. The value is never echoed.

## Rotate a database password

Change the password on the database first, then store it in the `.env` parameter straight away:

```sh
NEW_PASSWORD=$(openssl rand -base64 24)
hlpr mariadb user-password -db-name app -db-password "$NEW_PASSWORD" -host 10.0.0.5
printf '%s' "$NEW_PASSWORD" | hlpr aws-param-store set -name /env/app/env.prod -key DB_PASSWORD
```

Run the two steps back to back. If the second one fails, the database has the new password and the parameter
still has the old one, so repeat the `set` step with the same value. Then restart or redeploy the app so it reads
the new value. This command does not restart anything.

## Requirements

Needs the AWS CLI with credentials that can read and write the parameter. Use
[`read -key`](../read/README.md) to check the stored value of one variable.
