#!/bin/bash
set -euo pipefail

# Copies every config/**/*.example to the same name without .example (and, with
# -t, to test.<name>). An existing file is left alone, so local edits survive a
# re-run; pass -f to overwrite.

include_test=false
force=false
while [ $# -ne 0 ]; do
  case "$1" in
    -t | --test ) include_test=true ;;
    -f | --force ) force=true ;;
  esac
  shift
done

copy_config () {
  local src="$1" dest="$2"
  if [ -e "$dest" ] && [ "$force" != true ]; then
    echo "$dest exists, skipping (use -f to overwrite)"
    return
  fi
  echo "$src -> $dest"
  cp -- "$src" "$dest"
}

find config -type f -name '*.example' -print0 | while IFS= read -r -d '' file; do
  new_name=$(printf '%s\n' "$file" | sed -E -e 's/\.example$//')
  copy_config "$file" "$new_name"

  if [ "$include_test" = true ]; then
    dir_name=$(dirname -- "$new_name")
    base_name=$(basename -- "$new_name")
    copy_config "$file" "$dir_name/test.$base_name"
  fi
done
