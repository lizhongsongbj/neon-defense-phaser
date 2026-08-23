$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$config = Invoke-RestMethod -Uri 'http://127.0.0.1:5174/api/image-studio/config'
$items = @($config.items | Where-Object { $_.tier -in @(2,3) })
$results = @()
$progressDir = Join-Path $root 'public\assets\generated\progression\tier-2'
New-Item -ItemType Directory -Force -Path $progressDir | Out-Null

foreach ($tier in @(2,3)) {
  foreach ($item in @($items | Where-Object { $_.tier -eq $tier })) {
    Write-Output ("START tier {0}: {1} ({2})" -f $tier, $item.name, $item.id)
    $success = $false
    $lastError = ''
    for ($attempt = 1; $attempt -le 3 -and -not $success; $attempt++) {
      try {
        $body = @{ id=$item.id; prompt=$item.prompt; size='1024x1024'; outputMode='cutout' } | ConvertTo-Json
        $result = Invoke-RestMethod -Uri 'http://127.0.0.1:5174/api/generate-asset' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 600
        $success = $true
        $results += [pscustomobject]@{ tier=$tier; id=$item.id; name=$item.name; success=$true; fileName=$result.fileName; imageUrl=$result.imageUrl; rawUrl=$result.rawUrl; cutoutApplied=$result.cutoutApplied; error='' }
        if ($tier -eq 2) {
          $relative = $result.imageUrl.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
          $source = Join-Path $root ('public\' + $relative.Substring('assets\'.Length))
          if (-not (Test-Path -LiteralPath $source)) {
            $source = Join-Path $root ('public\' + $result.imageUrl.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar))
          }
          Copy-Item -LiteralPath $source -Destination (Join-Path $progressDir ($item.id + '.png')) -Force
        }
        Write-Output ("DONE tier {0}: {1} -> {2}" -f $tier, $item.name, $result.fileName)
      } catch {
        $lastError = $_.Exception.Message
        Write-Output ("RETRY {0}/3 {1}: {2}" -f $attempt, $item.id, $lastError)
        if ($attempt -lt 3) { Start-Sleep -Seconds (8 * $attempt) }
      }
    }
    if (-not $success) {
      $results += [pscustomobject]@{ tier=$tier; id=$item.id; name=$item.name; success=$false; fileName=''; imageUrl=''; rawUrl=''; cutoutApplied=$false; error=$lastError }
      Write-Output ("FAILED tier {0}: {1}" -f $tier, $item.name)
    }
  }
}
$manifest = Join-Path $root 'tools\tier-2-3-generation-results.json'
[IO.File]::WriteAllText($manifest, ($results | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false))
Write-Output ("SUMMARY success={0} failed={1}" -f @($results | Where-Object success).Count, @($results | Where-Object { -not $_.success }).Count)