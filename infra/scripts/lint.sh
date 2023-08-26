#!/bin/bash

for dir in packages/*; do
  if [ -d "$dir" ]; then
    cd "$dir" || continue
    pnpm lint --fix
    cd ../../
  fi
done
