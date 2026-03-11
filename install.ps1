param(
    [string]$InstallDir = "$env:USERPROFILE\.claude-utils",
    [switch]$All,
    [switch]$Reconfigure
)

$repo = "https://github.com/nebelwolfi/claude-utils.git"

# When invoked via iex/irm, $PSScriptRoot is empty - clone the repo first
if (-not $PSScriptRoot -or $PSScriptRoot -eq "") {
    Write-Host "Cloning claude repo to $InstallDir..."
    if (Test-Path $InstallDir) {
        Write-Host "Directory exists, pulling latest..."
        Push-Location $InstallDir
        git fetch origin --quiet
        $local = git rev-parse HEAD
        $remote = git rev-parse origin/master
        if ($local -eq $remote) {
            Write-Host "Already up to date - no updates available."
            Pop-Location
            return
        }
        git reset --hard origin/master --quiet
        Pop-Location
    } else {
        git clone $repo $InstallDir --quiet
    }
    $repoRoot = $InstallDir
} else {
    $repoRoot = $PSScriptRoot
}

# --- Load saved install state ---
$installedPath = Join-Path $repoRoot ".installed.json"
$saved = @{}
if (Test-Path $installedPath) {
    $raw = Get-Content $installedPath -Raw | ConvertFrom-Json
    foreach ($prop in $raw.PSObject.Properties) {
        $saved[$prop.Name] = [bool]$prop.Value
    }
}

# --- Discover components ---
$components = @()

# MCP servers (subdirs with package.json, skip node_modules)
Get-ChildItem -Path $repoRoot -Directory | Where-Object { $_.Name -ne "node_modules" } | ForEach-Object {
    $dir = $_.FullName
    $name = $_.Name
    $pkg = Join-Path $dir "package.json"
    if (-not (Test-Path $pkg)) { return }

    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    $cfg = if ($json.installConfig) { $json.installConfig } else { $null }
    $displayName = if ($cfg -and $cfg.displayName) { $cfg.displayName } else { $name }

    $components += @{
        Name        = $name
        DisplayName = $displayName
        Type        = "mcp"
        Dir         = $dir
        Config      = $cfg
        PackageJson = $json
    }
}

# ralph.ps1 as a standalone script component
$ralphScript = Join-Path $repoRoot "ralph.ps1"
if (Test-Path $ralphScript) {
    $components += @{
        Name        = "ralph"
        DisplayName = "Ralph Worker Loop (ralph.ps1)"
        Type        = "script"
        Dir         = $repoRoot
        Config      = $null
        Script      = $ralphScript
    }
}

# --- Select what to install ---
$toInstall = @()

foreach ($comp in $components) {
    $name = $comp.Name

    if ($saved.ContainsKey($name)) {
        if ($saved[$name]) {
            Write-Host "  [update] $($comp.DisplayName)"
            $toInstall += $comp
        } elseif ($Reconfigure) {
            $answer = Read-Host "Install $($comp.DisplayName)? (y/N)"
            if ($answer -match '^[yY]$') {
                $toInstall += $comp
            } else {
                $saved[$name] = $false
            }
        } else {
            Write-Host "  [skip]   $($comp.DisplayName) (previously declined, use -Reconfigure to re-prompt)"
        }
    } elseif ($All) {
        Write-Host "  [new]    $($comp.DisplayName)"
        $toInstall += $comp
    } else {
        $answer = Read-Host "Install $($comp.DisplayName)? (y/N)"
        if ($answer -match '^[yY]$') {
            $toInstall += $comp
        } else {
            $saved[$name] = $false
        }
    }
}

if ($toInstall.Count -eq 0) {
    Write-Host "Nothing to install."
    $saved | ConvertTo-Json | Set-Content $installedPath -Encoding UTF8
    return
}

# --- Ensure profile exists ---
$profileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) {
    New-Item -Path $profileDir -ItemType Directory -Force | Out-Null
}
if (-not (Test-Path $PROFILE)) {
    New-Item $PROFILE -ItemType File -Force | Out-Null
}

# --- Install each component ---
foreach ($comp in $toInstall) {
    $name = $comp.Name
    Write-Host ""
    Write-Host "--- Installing $($comp.DisplayName) ---"

    if ($comp.Type -eq "mcp") {
        $cfg = $comp.Config

        # Prerequisites
        if ($cfg -and $cfg.prerequisites) {
            foreach ($prereq in $cfg.prerequisites) {
                $label = if ($prereq.label) { $prereq.label } else { $prereq.command }
                if (-not (Get-Command $prereq.command -ErrorAction SilentlyContinue)) {
                    Write-Host "  Installing prerequisite: $label..."
                    Invoke-Expression $prereq.install
                } else {
                    Write-Host "  $label already installed."
                }
            }
        }

        # npm install + build
        Write-Host "  npm install..."
        Push-Location $comp.Dir
        npm install --silent
        Pop-Location

        # Register MCP server
        $main = if ($comp.PackageJson.main) { $comp.PackageJson.main } else { "index.js" }
        $entryPoint = Join-Path $comp.Dir $main
        if (Test-Path $entryPoint) {
            Write-Host "  Registering MCP server: $name -> $entryPoint"
            claude mcp remove --scope user $name 2>$null
            claude mcp add --scope user $name node $entryPoint
        } else {
            Write-Warning "  Entry point not found: $entryPoint - skipping MCP registration"
        }

        # Profile setup (functions, aliases, etc.)
        if ($cfg -and $cfg.profileSetup) {
            $profileContent = Get-Content $PROFILE -Raw
            foreach ($setup in $cfg.profileSetup) {
                $body = $setup.body.Replace('{{entryDir}}', $comp.Dir).Replace('{{repoRoot}}', $repoRoot)
                if (-not $profileContent -or -not $profileContent.Contains($setup.name)) {
                    Add-Content $PROFILE "`n$body"
                    Write-Host "  Registered $($setup.name) in profile."
                } else {
                    Write-Host "  $($setup.name) already in profile."
                }
            }
        }
    }
    elseif ($comp.Type -eq "script") {
        $dotSource = ". `"$($comp.Script)`""
        $profileContent = Get-Content $PROFILE -Raw
        if (-not $profileContent -or -not $profileContent.Contains($comp.Script)) {
            Add-Content $PROFILE "`n$dotSource"
            Write-Host "  Registered in profile ($PROFILE)."
        } else {
            Write-Host "  Already registered in profile."
        }
    }

    $saved[$name] = $true
}

# --- Save state ---
$saved | ConvertTo-Json | Set-Content $installedPath -Encoding UTF8
Write-Host ""
Write-Host "Install state saved to $installedPath"
Write-Host 'Reload your shell: . "$PROFILE"'
