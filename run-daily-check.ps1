# Runs the commissioner bot's daily check and pushes any resulting changes
# (new drafts in output/, updated state.json) back to GitHub, so the cloud
# routine (which can't reach the Sleeper API) can pick them up afterward.
# Scheduled via Windows Task Scheduler — see setup notes in README.md.

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location "C:\Users\mikon\sleeper-commish-bot"

$logFile = "run-daily-check.log"
"[$(Get-Date -Format o)] Starting daily check" | Out-File -Append -Encoding utf8 $logFile

try {
    node check.mjs 2>&1 | Tee-Object -Append -FilePath $logFile

    git add -A -- state.json output
    $staged = git diff --cached --name-only
    if ($staged) {
        git commit -m "check: $(Get-Date -Format 'yyyy-MM-dd') automated run" | Out-File -Append -Encoding utf8 $logFile
        git push | Out-File -Append -Encoding utf8 $logFile
        "[$(Get-Date -Format o)] Pushed changes: $staged" | Out-File -Append -Encoding utf8 $logFile
    } else {
        "[$(Get-Date -Format o)] No changes to push" | Out-File -Append -Encoding utf8 $logFile
    }
} catch {
    "[$(Get-Date -Format o)] ERROR: $_" | Out-File -Append -Encoding utf8 $logFile
    throw
}
