# MCP Servers

A collection of MCP servers for use with Claude Code.

## Install

Run this in PowerShell (no cloning needed):

```powershell
iex (irm https://raw.githubusercontent.com/nebelwolfi/MCP/master/install-mcps.ps1)
```

This will:
1. Clone the repo to `~/.mcp-servers` (or pull if it already exists)
2. Run `npm install` for each server
3. Register each server with `claude mcp add --scope user`

To install to a custom directory:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/nebelwolfi/MCP/master/install-mcps.ps1) } -InstallDir 'C:\your\path'"
```

## Update

Re-run the same command — it pulls the latest and re-registers any new servers.

## Verify

```powershell
claude mcp list
```

## Servers

| Name | Description |
|------|-------------|
| kanban-mcp | Kanban board via kanbn, auto-detected from cwd |
