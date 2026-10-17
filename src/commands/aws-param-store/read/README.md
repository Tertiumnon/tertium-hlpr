# aws-param-store read

Print one AWS Systems Manager Parameter Store value, decrypted, exactly as stored:

```sh
hlpr aws-param-store read -name <param name>
```

Example: `hlpr aws-param-store read -name /env/app/env.dev`

The value goes to standard output with no added newline, so redirect it only where you intend to keep it.
Nothing is written to disk. Needs the AWS CLI with credentials that can read the parameter.
