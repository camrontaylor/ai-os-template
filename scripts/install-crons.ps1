[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
)

$CronUiPath = Join-Path $PSScriptRoot "lib\cron-ui.ps1"
. $CronUiPath

Write-AgenticOsCronBanner `
    -Heading "install-crons is deprecated" `
    -Subheading "Starting the managed cron daemon instead."
Write-AgenticOsCronInfo "Redirecting to start-crons..."
& (Join-Path $PSScriptRoot "start-crons.ps1") @Arguments
exit $LASTEXITCODE
