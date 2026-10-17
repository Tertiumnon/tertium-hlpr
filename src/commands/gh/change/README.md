# GitHub Change

Renames the default branch of the GitHub repository in the current directory, using `gh api` to call GitHub's branch rename endpoint.

```bash
hlpr gh change -default-branch <name> -to <new name>
```

Example:

```bash
hlpr gh change -default-branch master -to main
```

- `-default-branch` must be the repository's current default branch. The command stops if it is not, so it cannot rename a different branch.
- `-to` is the new branch name. It must differ from `-default-branch` and contain no spaces.
- GitHub makes the renamed branch the default and updates open pull requests that target it.
- Local clones keep the old branch name until you run `git branch -m master main` and update the remote HEAD.
- Does not change other repository settings, such as branch protection rules, which GitHub may keep on the old name.

Requirements: the [GitHub CLI](https://cli.github.com) (`gh`), logged in with push rights to the repository, run from inside the repository. Works the same on Windows, macOS, and Linux.
