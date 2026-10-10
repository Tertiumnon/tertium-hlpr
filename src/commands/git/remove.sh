#!/bin/bash
# @description Safely remove a local branch

if [[ $# -eq 2 && ( "$1" == "-branch" || "$1" == "-b" ) && -n "$2" ]]; then
  git branch -d -- "$2"
elif [[ $# -eq 2 && -n "$1" && "$2" == "-remote" ]]; then
  git check-ref-format --branch "$1" >/dev/null || exit 1
  git push origin --delete "$1"
elif [[ $# -eq 2 && -n "$1" && "$2" == "-both" ]]; then
  git check-ref-format --branch "$1" >/dev/null || exit 1
  git branch -d -- "$1" && git push origin --delete "$1"
else
  echo "Usage: hlpr git remove <-branch|-b> <branch> | <branch> <-remote|-both>" >&2
  exit 1
fi
