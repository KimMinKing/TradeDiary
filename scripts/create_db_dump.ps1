param(
    [string]$ContainerName = "tradediary-postgres",
    [string]$DbUser = "tradediary",
    [string]$DbName = "tradediary",
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$dumpDir = Join-Path $rootDir "database\dumps"

if (-not (Test-Path $dumpDir)) {
    New-Item -ItemType Directory -Path $dumpDir | Out-Null
}

if (-not $OutputPath) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputPath = Join-Path $dumpDir "tradediary_$timestamp.dump"
}

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$containerDumpPath = "/tmp/$(Split-Path $resolvedOutputPath -Leaf)"

Write-Host "Creating PostgreSQL custom dump from container '$ContainerName'..."
docker exec $ContainerName sh -c "pg_dump -U $DbUser -d $DbName -Fc -f $containerDumpPath"

Write-Host "Copying dump to $resolvedOutputPath ..."
docker cp "${ContainerName}:$containerDumpPath" $resolvedOutputPath
docker exec $ContainerName rm -f $containerDumpPath

Write-Host "Dump created: $resolvedOutputPath"
