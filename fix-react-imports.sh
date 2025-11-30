#!/bin/bash
# Fix all React. patterns in ui components

files=(
  "client/src/components/ui/input.tsx"
  "client/src/components/ui/card.tsx"
  "client/src/components/ui/button.tsx"
  "client/src/components/ui/label.tsx"
  "client/src/components/ui/textarea.tsx"
  "client/src/components/ui/checkbox.tsx"
  "client/src/components/ui/progress.tsx"
  "client/src/components/StepProgressBanner.tsx"
  "client/src/components/Chart.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Checking $file for React. patterns..."
    grep -n "React\." "$file" | head -5
  fi
done
