#!/bin/bash
# @description Remove all untracked files and directories

if [[ $# -ne 0 ]]; then
  echo "Usage: hlpr git clean" >&2
  exit 1
fi

git clean -fd
