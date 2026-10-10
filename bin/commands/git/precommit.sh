#!/bin/bash
# @description Run build and stage bin/ directory before commit

echo "Running build before commit..."
bun run build
git add bin/