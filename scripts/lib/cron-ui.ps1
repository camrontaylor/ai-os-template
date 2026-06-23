function Write-AgenticOsCronBanner {
    param(
        [string]$Heading,
        [string]$Subheading = ""
    )

    Write-Host ""
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|                                              |" -ForegroundColor Cyan
    Write-Host "|                 AI-OS CRON                   |" -ForegroundColor Cyan
    Write-Host "|                                              |" -ForegroundColor Cyan
    Write-Host "|              MANAGED RUNTIME                 |" -ForegroundColor Cyan
    Write-Host "|                                              |" -ForegroundColor Cyan
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host $Heading -ForegroundColor Cyan
    if (-not [string]::IsNullOrWhiteSpace($Subheading)) {
        Write-Host $Subheading -ForegroundColor DarkGray
    }
    Write-Host ""
}

function Write-AgenticOsCronInfo {
    param([string]$Text)
    Write-Host $Text -ForegroundColor Cyan
}

function Write-AgenticOsCronSuccess {
    param([string]$Text)
    Write-Host "  OK  $Text" -ForegroundColor Green
}

function Write-AgenticOsCronWarn {
    param([string]$Text)
    Write-Host "  WARN $Text" -ForegroundColor Yellow
}

function Write-AgenticOsCronFail {
    param([string]$Text)
    Write-Host "  ERR  $Text" -ForegroundColor Red
}

function Write-AgenticOsCronNote {
    param([string]$Text)
    Write-Host $Text -ForegroundColor DarkGray
}
