#Requires -Version 5.1
param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$FlashInstallUrl = "https://raw.githubusercontent.com/Natuworkguy/Flash/main/install.ps1"

Write-Host "==> Fetching FLASH installer from $FlashInstallUrl"
try {
    $Installer = Invoke-RestMethod -Uri $FlashInstallUrl
} catch {
    Write-Host "==> Failed to download the FLASH installer. Check your internet connection and try again." -ForegroundColor Red
    exit 1
}

Write-Host "==> Running installer"
& ([scriptblock]::Create($Installer)) -Uninstall:$Uninstall
