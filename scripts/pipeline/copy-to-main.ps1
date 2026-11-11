# Copy finished assets + the code that hooks them up from the asset-build copy into the main repo.
# Safe by design:
#  - every file it overwrites is backed up first (D:\Codes\TheLastHouse_Assetbuild\import-backups\<time>\)
#  - a code file that was changed in the main repo since the asset-build copy was made is NOT overwritten:
#    the new version is written next to it as <file>.assetbuild and listed as CONFLICT for a manual merge.
# Usage: double-click copy-assets-to-main.cmd (asset-build repo root).  Optional: -Target <path>  -DryRun
param(
  [string]$Target = 'D:\Codes\TheLastHouseonMapleStreet',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$Src = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup = Join-Path (Split-Path $Src -Parent) "import-backups\$Stamp"
# What was copied last time (hash of each code file's normalised text), so a second import is not mistaken for a change made in main.
$StateFile = Join-Path (Split-Path $Src -Parent) 'import-backups\state.json'
$State = @{}
if (Test-Path -LiteralPath $StateFile) {
  (Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $State[$_.Name] = $_.Value }
}
function TextHash([string]$text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($text)))).Replace('-', '').ToLower()
}

# kind: asset = binary, always replace (with backup) | code = check main for changes first | credits = merge section
$Files = @(
  @{ rel = 'apps/client/public/assets/models/home_elena.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/hands.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/backdrop.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/terrain.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/house_kit.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/props.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/last_house_ext.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/house_31.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/items.glb'; kind = 'asset' },
  @{ rel = 'apps/client/public/assets/models/locket.glb'; kind = 'asset' },
  @{ rel = 'apps/client/src/scene/kit.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/kit.test.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/models.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/lighting.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/exterior-scene.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/hands.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/glow.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/atmosphere.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/mist-layout.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/mist-layout.test.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/scene/backdrop.tsx'; kind = 'code' },
  @{ rel = 'apps/client/src/game/hand-pose.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/game/combat-feedback.test.ts'; kind = 'code' },
  @{ rel = 'apps/client/src/content/world/art-assets.test.ts'; kind = 'code' },
  @{ rel = '.kiro/specs/the-last-house/docs/asset-handoff.md'; kind = 'code' },
  @{ rel = 'CREDITS.md'; kind = 'credits' }
)

# Auto-discovery: everything else that is new or changed in the asset-build repo comes along too, so new assets and code
# never have to be added to the list above. Sources: every model in public/assets, files git reports as changed or new,
# and the pipeline + Blender build scripts (so the main repo can rebuild the assets).
$Skip = '(^|/)(node_modules|dist|build|coverage|\.git|import-backups|asset_creation/(bridge|textures|plans|renders|work)|\.vite|\.turbo)(/|$)|\.tmp\.|(^|/)\.env|\.assetbuild$|(^|/)(start-blender-bridge|start-dev-assetbuild)\.cmd$|(^|/)prev_[^/]*\.(png|jpg)$|\.blend1?$|\.log$|(^|/)package-lock\.json$'
$AssetExt = '\.(glb|gltf|png|jpg|jpeg|webp|ktx2|hdr|mp4|webm|mp3|ogg|wav|woff2?|bin)$'
$known = @{}
foreach ($f in $Files) { $known[$f.rel] = $true }
$found = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath (Join-Path $Src 'apps\client\public\assets\models') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
  $found.Add($_.FullName.Substring($Src.Length + 1).Replace('\', '/'))
}
foreach ($dir in @('scripts\pipeline', 'asset_creation\blender')) {
  $d = Join-Path $Src $dir
  if (Test-Path -LiteralPath $d) {
    Get-ChildItem -LiteralPath $d -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.py', '.ps1', '.cmd', '.md', '.json' } | ForEach-Object {
      $found.Add($_.FullName.Substring($Src.Length + 1).Replace('\', '/'))
    }
  }
}
$gs = cmd /c "git -C `"$Src`" status --porcelain -uall 2>nul"
foreach ($line in $gs) {
  if ($line.Length -lt 4) { continue }
  $code = $line.Substring(0, 2)
  if ($code -match 'D') { continue }
  $path = $line.Substring(3).Trim('"')
  if ($path -match ' -> ') { $path = ($path -split ' -> ')[-1].Trim('"') }
  $found.Add($path)
}
$extra = 0
foreach ($rel in ($found | Sort-Object -Unique)) {
  if ($known.ContainsKey($rel) -or $rel -match $Skip) { continue }
  if (-not (Test-Path -LiteralPath (Join-Path $Src ($rel -replace '/', '\')) -PathType Leaf)) { continue }
  $kind = if ($rel -match $AssetExt) { 'asset' } else { 'code' }
  $Files += @{ rel = $rel; kind = $kind }
  $known[$rel] = $true
  $extra++
}
Write-Host "  $($Files.Count) files to check ($extra found automatically)"

function Norm([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  return ([IO.File]::ReadAllText($path)).Replace("`r`n", "`n").TrimEnd()
}

function BaseText([string]$rel) {
  # The file as it was when the asset-build copy was made (git HEAD of the asset-build repo); $null if it is new.
  $tmp = [IO.Path]::GetTempFileName()
  cmd /c "git -C `"$Src`" show `"HEAD:$rel`" > `"$tmp`" 2>nul"
  $ok = ($LASTEXITCODE -eq 0)
  $text = $null
  if ($ok) { $text = Norm $tmp }
  Remove-Item -LiteralPath $tmp -Force
  return $text
}

function Save-Backup([string]$rel, [string]$dst) {
  if (-not (Test-Path -LiteralPath $dst)) { return }
  $b = Join-Path $Backup ($rel -replace '/', '\')
  New-Item -ItemType Directory -Force -Path (Split-Path $b -Parent) | Out-Null
  Copy-Item -LiteralPath $dst -Destination $b -Force
}

function Put([string]$from, [string]$dst) {
  if ($DryRun) { return }
  New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
  Copy-Item -LiteralPath $from -Destination $dst -Force
}

Write-Host ''
Write-Host "  The Last House - copy assets to the main repo" -ForegroundColor Cyan
Write-Host "  from: $Src"
Write-Host "  to:   $Target"
if ($DryRun) { Write-Host '  DRY RUN: nothing will be written' -ForegroundColor Yellow }
Write-Host ''
if (-not (Test-Path -LiteralPath (Join-Path $Target 'package.json'))) {
  Write-Host "  Main repo not found at $Target (no package.json). Nothing copied." -ForegroundColor Red
  exit 1
}
if ((Resolve-Path $Target).Path -eq $Src) { Write-Host '  Target is the asset-build copy itself. Nothing copied.' -ForegroundColor Red; exit 1 }

$results = @()
foreach ($f in $Files) {
  $rel = $f.rel
  $from = Join-Path $Src ($rel -replace '/', '\')
  $dst = Join-Path $Target ($rel -replace '/', '\')
  if (-not (Test-Path -LiteralPath $from)) { $results += [pscustomobject]@{ Status = 'MISSING'; File = $rel; Note = 'not in the asset-build copy' }; continue }

  if ($f.kind -eq 'asset') {
    if ((Test-Path -LiteralPath $dst) -and ((Get-FileHash $dst).Hash -eq (Get-FileHash $from).Hash)) {
      $results += [pscustomobject]@{ Status = 'same'; File = $rel; Note = '' }; continue
    }
    $mb = [math]::Round((Get-Item $from).Length / 1MB, 2)
    if ($mb -ge 3) { $results += [pscustomobject]@{ Status = 'REJECTED'; File = $rel; Note = "$mb MB is over the 3 MB budget" }; continue }
    if (-not $DryRun) { Save-Backup $rel $dst }
    Put $from $dst
    $results += [pscustomobject]@{ Status = 'copied'; File = $rel; Note = "$mb MB" }; continue
  }

  if ($f.kind -eq 'credits') {
    $section = '## Textures (CC0)'
    if (-not (Test-Path -LiteralPath $dst)) { Put $from $dst; $results += [pscustomobject]@{ Status = 'NEW'; File = $rel; Note = '' }; continue }
    $all = ([IO.File]::ReadAllText($from)).Replace("`r`n", "`n")
    $i = $all.IndexOf($section)
    $j = $all.IndexOf("`n## ", $i + $section.Length)
    $mine = if ($j -ge 0) { $all.Substring($i, $j - $i) } else { $all.Substring($i) }
    $cur = ([IO.File]::ReadAllText($dst)).Replace("`r`n", "`n")
    $ci = $cur.IndexOf($section)
    if ($ci -lt 0) {
      if (-not $DryRun) { Save-Backup $rel $dst; Add-Content -LiteralPath $dst -Value ("`r`n" + $mine.TrimEnd()) -Encoding UTF8 }
      $results += [pscustomobject]@{ Status = 'merged'; File = $rel; Note = 'texture section appended' }; continue
    }
    $cj = $cur.IndexOf("`n## ", $ci + $section.Length)
    $theirsSec = if ($cj -ge 0) { $cur.Substring($ci, $cj - $ci) } else { $cur.Substring($ci) }
    if ($theirsSec.TrimEnd() -eq $mine.TrimEnd()) { $results += [pscustomobject]@{ Status = 'same'; File = $rel; Note = 'texture credits up to date' }; continue }
    $tail = if ($cj -ge 0) { $cur.Substring($cj) } else { '' }
    $merged = $cur.Substring(0, $ci) + $mine.TrimEnd() + "`n" + $tail
    if (-not $DryRun) { Save-Backup $rel $dst; [IO.File]::WriteAllText($dst, $merged.Replace("`n", "`r`n"), (New-Object Text.UTF8Encoding($false))) }
    $results += [pscustomobject]@{ Status = 'merged'; File = $rel; Note = 'texture section updated' }; continue
  }

  # code
  $mine = Norm $from
  $theirs = Norm $dst
  if ($null -eq $theirs) { Put $from $dst; $State[$rel] = TextHash $mine; $results += [pscustomobject]@{ Status = 'NEW'; File = $rel; Note = '' }; continue }
  if ($theirs -eq $mine) { $State[$rel] = TextHash $mine; $results += [pscustomobject]@{ Status = 'same'; File = $rel; Note = '' }; continue }
  $base = BaseText $rel
  $lastImported = $State[$rel]
  $untouched = ($null -ne $base -and $theirs -eq $base) -or ($null -ne $lastImported -and (TextHash $theirs) -eq $lastImported)
  if ($untouched) {
    if (-not $DryRun) { Save-Backup $rel $dst }
    Put $from $dst
    $State[$rel] = TextHash $mine
    $results += [pscustomobject]@{ Status = 'updated'; File = $rel; Note = '' }
  } else {
    Put $from ($dst + '.assetbuild')
    $results += [pscustomobject]@{ Status = 'CONFLICT'; File = $rel; Note = 'changed in main: new version saved as .assetbuild' }
  }
}

$results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $Backup | Out-Null
  $results | Format-Table -AutoSize | Out-String -Width 200 | Set-Content -LiteralPath (Join-Path $Backup 'import-log.txt')
  Write-Host "  Backups of replaced files and this log: $Backup"
  $State | ConvertTo-Json | Set-Content -LiteralPath $StateFile
}
$conf = @($results | Where-Object { $_.Status -eq 'CONFLICT' })
if ($conf.Count -gt 0) {
  Write-Host ''
  Write-Host "  $($conf.Count) file(s) were changed in the main repo, so they were NOT overwritten." -ForegroundColor Yellow
  Write-Host '  Merge each <file>.assetbuild into <file> (or replace it), then delete the .assetbuild file.' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '  Next, in the main repo: npm run typecheck  and  npm test'
Write-Host '  Context for the main codebase: .kiro/specs/the-last-house/docs/asset-handoff.md'
Write-Host ''
