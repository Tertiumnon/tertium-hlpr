# aws-param-store remove

Delete a parameter, its value and its history, from AWS Systems Manager Parameter Store:

```sh
hlpr aws-param-store remove -name <param name> -confirm <param name>
```

- `-confirm` must repeat the name exactly. A stray flag or a different name removes nothing.
- This cannot be undone. Save the value first, for example with `hlpr aws-param-store read -name <param name>`.
- Needs the AWS CLI with permission to delete parameters.
