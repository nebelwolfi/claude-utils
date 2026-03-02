param(
    [string]$InstallDir = "$env:USERPROFILE\.mcp-servers"
)

$repo = "https://github.com/nebelwolfi/MCP.git"

# When invoked via iex/irm, $PSScriptRoot is empty — clone the repo first
if (-not $PSScriptRoot -or $PSScriptRoot -eq "") {
    Write-Host "Cloning MCP repo to $InstallDir..."
    if (Test-Path $InstallDir) {
        Write-Host "Directory exists, pulling latest..."
        Push-Location $InstallDir
        git pull --quiet
        Pop-Location
    } else {
        git clone $repo $InstallDir --quiet
    }
    $repoRoot = $InstallDir
} else {
    $repoRoot = $PSScriptRoot
}

Get-ChildItem -Path $repoRoot -Directory | ForEach-Object {
    $mcpDir = $_.FullName
    $mcpName = $_.Name

    $pkg = Join-Path $mcpDir "package.json"
    if (-not (Test-Path $pkg)) {
        Write-Warning "Skipping $mcpName — no package.json found"
        return
    }

    # Install dependencies and build (always, to pick up source changes)
    Write-Host "Installing/building $mcpName..."
    Push-Location $mcpDir
    npm install --silent
    Pop-Location

    # Resolve entry point after build
    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    $main = if ($json.main) { $json.main } else { "index.js" }
    $entryPoint = Join-Path $mcpDir $main

    if (-not (Test-Path $entryPoint)) {
        Write-Warning "Skipping $mcpName — entry point not found: $entryPoint"
        return
    }

    Write-Host "Registering MCP: $mcpName -> $entryPoint"
    claude mcp remove --scope user $mcpName 2>$null
    claude mcp add --scope user $mcpName node $entryPoint
}

Write-Host "Done. Run 'claude mcp list' to verify."
