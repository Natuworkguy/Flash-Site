#!/bin/bash
set -euo pipefail

FLASH_INSTALL_URL="https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.sh"

echo "==> Fetching FLASH installer from $FLASH_INSTALL_URL"
SCRIPT="$(curl -fsSL "$FLASH_INSTALL_URL")" || {
    echo "==> Failed to download the FLASH installer. Check your internet connection and try again." >&2
    exit 1
}

echo "==> Running installer"
exec bash -c "$SCRIPT" bash "$@"
