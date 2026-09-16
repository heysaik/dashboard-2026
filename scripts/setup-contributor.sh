#!/bin/sh
set -eu
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
for dependency in node gitleaks; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    printf 'Missing %s. Install development tools with: brew install node gitleaks\n' "$dependency" >&2
    exit 1
  fi
done
existing_hooks=$(git config --local --get core.hooksPath || true)
if [ -n "$existing_hooks" ] && [ "$existing_hooks" != .githooks ]; then
  printf '%s\n' 'This checkout already has a different hooksPath. Integrate the hooks manually before replacing it.' >&2
  exit 1
fi
git config --local core.hooksPath .githooks
git config --local commit.template "$repo_root/.github/commit-template.txt"
git config --local commit.cleanup strip
printf '%s\n' 'Commit and push checks are enabled for this checkout.'
