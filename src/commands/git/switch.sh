#!/bin/bash
# @description Switch to a branch

if [[ $# -ne 2 || "$1" != "-branch" || -z "$2" ]]; then
  echo "Usage: hlpr git switch -branch <branch>" >&2
  exit 1
fi

git switch -- "$2"
