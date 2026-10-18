# aws-param-store add

Create a new parameter in AWS Systems Manager Parameter Store:

```sh
hlpr aws-param-store add -name <param name> [-type SecureString|String] [-value <value>]
```

Example: `printf 'DATABASE_URL=mysql://app:...' | hlpr aws-param-store add -name /env/app/env.prod`

- The value is read from stdin unless `-value` is given, so it stays off the command line. A trailing line break is dropped.
- `-type` is `SecureString` by default; use `String` for values that are not secret.
- The name must not exist. AWS refuses an existing name, so `add` never overwrites a value. To change a value, use
  `aws-param-store set` (one line) or `aws-param-store edit` (the whole value).
- An empty value is refused.
- Needs the AWS CLI with permission to create parameters.
