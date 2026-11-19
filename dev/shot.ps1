# Headless Chrome screenshot + console log capture for quick visual checks.
# Usage: powershell -File dev/shot.ps1 -Url "http://127.0.0.1:5173/#/explore" -Out shot.png [-W 1400 -H 900 -Wait 6000]
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$W = 1400,
  [int]$H = 900,
  [int]$Wait = 6000
)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
$profile = Join-Path $env:TEMP ("nl-chrome-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$outFull = [System.IO.Path]::GetFullPath($Out)
$errFile = Join-Path $env:TEMP ("nl-log-" + [guid]::NewGuid().ToString("N").Substring(0, 8) + ".txt")
$args = @(
  "--headless=new", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  "--user-data-dir=$profile", "--window-size=$W,$H", "--virtual-time-budget=$Wait",
  "--enable-logging=stderr", "--v=0", "--screenshot=$outFull", $Url
)
$args = $args | ForEach-Object { if ($_ -match ' ') { $k, $v = $_ -split '=', 2; "$k=`"$v`"" } else { $_ } }
$p = Start-Process -FilePath $chrome -ArgumentList $args -NoNewWindow -PassThru -RedirectStandardError $errFile -Wait
Get-Content $errFile | Select-String -Pattern "CONSOLE|Uncaught|ERROR:.*(js|module)" | ForEach-Object { $_.Line } | Select-Object -First 40
Remove-Item $errFile -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "saved $outFull"
