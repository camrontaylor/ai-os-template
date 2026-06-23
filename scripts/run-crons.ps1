$CronUiPath = Join-Path $PSScriptRoot "lib\cron-ui.ps1"
. $CronUiPath

Write-AgenticOsCronBanner `
    -Heading "run-crons is deprecated" `
    -Subheading "Automatic scheduling no longer uses the OS scheduler."
Write-AgenticOsCronWarn "Use 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-crons.ps1' to start the managed daemon."
Write-AgenticOsCronNote "You can also keep the Command Centre server running for in-process scheduling."

exit 0
