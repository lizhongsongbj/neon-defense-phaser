$repo = 'C:\Users\1\Desktop\neon-defense-phaser'
$git = 'C:\Users\1\AppData\Local\Programs\MinGit\cmd\git.exe'
$log = Join-Path $repo '.github-auto-sync.log'

function Write-Log([string]$message) {
  Add-Content -LiteralPath $log -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message)
}

function Git([string[]]$arguments) {
  & $git -C $repo @arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "git $($arguments -join ' ') failed with exit code $LASTEXITCODE" }
}

Write-Log 'GitHub auto-sync watcher started.'
while ($true) {
  try {
    $status = ((& $git -C $repo status --porcelain=v1 2>$null) -join "`n").Trim()
    if ($status) {
      Start-Sleep -Seconds 8
      $stableStatus = ((& $git -C $repo status --porcelain=v1 2>$null) -join "`n").Trim()
      if ($stableStatus -and $stableStatus -eq $status) {
        Git @('add', '-A')
        & $git -C $repo diff --cached --quiet
        if ($LASTEXITCODE -ne 0) {
          $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
          Git @('commit', '-m', "Auto-sync $stamp")
          Git @('fetch', 'origin')
          Git @('rebase', 'origin/main')
          Git @('push', 'origin', 'main')
          Write-Log 'Changes committed and pushed to origin/main.'
        }
      }
    }
  } catch {
    Write-Log ("Sync error: " + $_.Exception.Message)
    Start-Sleep -Seconds 15
  }
  Start-Sleep -Seconds 4
}
