#!/bin/bash
# @description Create a branch without switching to it

if [[ $# -ne 2 || ( "$1" != "-branch" && "$1" != "-b" ) || -z "$2" ]]; then
  echo "Usage: hlpr git create <-branch|-b> <branch>" >&2
  exit 1
fi

git branch -- "$2"
