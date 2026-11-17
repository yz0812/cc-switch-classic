param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')]
    [string]$Version,
    [string]$ExecutablePath = 'src-tauri/target/x86_64-pc-windows-msvc/release/cc-switch.exe',
    [string]$OutputDirectory = 'release-assets'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# 缺少可执行文件必须失败，不能发布只有标记文件的空包。
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    throw "Portable executable not found: $ExecutablePath"
}
if ((Get-Item -LiteralPath $ExecutablePath).Length -eq 0) {
    throw 'Portable executable is empty'
}

$archiveName = "CC-Switch-Classic-v$Version-Windows-Portable.zip"
$archivePath = Join-Path $OutputDirectory $archiveName
if (Test-Path -LiteralPath $archivePath) {
    throw "Refusing to overwrite existing archive: $archivePath"
}

# 暂存目录独立创建在系统临时目录，绝不把工作区配置或历史产物打入 ZIP。
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ('cc-switch-portable-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$exe = Join-Path $stage 'cc-switch.exe'
$marker = Join-Path $stage 'portable.ini'
Copy-Item -LiteralPath $ExecutablePath -Destination $exe
@('# CC Switch Classic portable x64 build marker', 'portable=true') |
    Set-Content -LiteralPath $marker -Encoding utf8
Compress-Archive -LiteralPath $exe, $marker -DestinationPath $archivePath

Write-Output (Get-Item -LiteralPath $archivePath).FullName
