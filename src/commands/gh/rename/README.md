# GitHub Rename

Renames a GitHub repository by running `gh repo rename`.

```bash
hlpr gh rename -repo <owner/repo> -to <new repo name>
```

Example:

```bash
hlpr gh rename -repo tertiumnon/old-name -to new-name
```

- `-repo` is the current repository as `OWNER/REPO`.
- `-to` is the new name only, without the owner. It must not contain `/` or spaces.
- `gh` asks for confirmation before renaming. In a non-interactive shell `gh` refuses to rename without `--yes`, so this command does not pass it.
- GitHub redirects the old URL to the new one, but local clones keep the old remote URL until you update it (`git remote set-url origin <new-url>`).
- Transferring a repository to another owner is not supported; GitHub requires steps on github.com.

Requirements: the [GitHub CLI](https://cli.github.com) (`gh`), logged in with admin rights to the repository. Works the same on Windows, macOS, and Linux.
