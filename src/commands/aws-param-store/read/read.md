# aws-param-store read

Print one AWS Systems Manager Parameter Store value, decrypted, exactly as stored:

```sh
hlpr aws-param-store read -name <param name>
hlpr aws-param-store read -name <param name> -key <variable>
```

Examples:

```sh
hlpr aws-param-store read -name /env/app/env.dev
hlpr aws-param-store read -name /env/app/env.dev -key DB_PASSWORD
```

With `-key`, the parameter is read as a `.env` text and only that variable's value is printed, without
quotes or a trailing comment. It fails if the variable is missing or set more than once.

The value goes to standard output with no added newline, so redirect it only where you intend to keep it.
Nothing is written to disk. Needs the AWS CLI with credentials that can read the parameter.
