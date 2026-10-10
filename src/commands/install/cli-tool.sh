#!/bin/bash
# @description Install and enable oh-my-posh or starship in the PowerShell profile (switches from the other one)

case "$1" in
  oh-my-posh)
    winget install JanDeDobbeleer.OhMyPosh -s winget
    init_line='oh-my-posh init pwsh | Invoke-Expression'
    other_line='Invoke-Expression (&starship init powershell)'
    ;;
  starship)
    winget install Starship.Starship
    init_line='Invoke-Expression (&starship init powershell)'
    other_line='oh-my-posh init pwsh | Invoke-Expression'
    ;;
  *)
    echo "Unknown tool: $1 (use oh-my-posh or starship)"
    exit 1
    ;;
esac

profile=$(powershell.exe -NoProfile -Command '$PROFILE' | tr -d '\r')
profile=$(cygpath -u "$profile")
mkdir -p "$(dirname "$profile")"
touch "$profile"

if grep -qF "$other_line" "$profile"; then
  grep -vF "$other_line" "$profile" > "$profile.tmp"
  mv "$profile.tmp" "$profile"
  echo "Removed other prompt init line from $profile"
fi

if grep -qF "$init_line" "$profile"; then
  echo "Already configured in $profile"
else
  echo "$init_line" >> "$profile"
  echo "Added init line to $profile"
fi

echo "✓ Done. Restart PowerShell to apply."
