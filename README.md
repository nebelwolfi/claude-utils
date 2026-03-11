# Claude Utils

A collection of MCP servers and utilities for Claude Code.

## Components

### kanban-mcp

Markdown-based kanban board with a local web UI. Requires the [`kanbn`](https://github.com/basementuniverse/kanbn) CLI.

| Tool | Description |
|------|-------------|
| `board_view` | Show the full board with all columns and tasks |
| `board_stats` | Task counts, completion rate, priority breakdown |
| `board_validate` | Check board consistency and report issues |
| `task_create` | Create a new task |
| `task_edit` | Edit an existing task's fields |
| `task_view` | View a task's full details including subtasks |
| `task_move` | Move a task to a different column |
| `task_delete` | Delete a task |
| `task_find` | Search and filter tasks |
| `task_relation` | Manage task relations (blocks, requires, etc.) |
| `task_subtask` | Manage subtasks (add, toggle, remove) |

Also ships `kanban-web` for a local board UI (`Kanban-Open` in your profile).

### convert-mcp

Quick decimal/hex conversion.

| Tool | Description |
|------|-------------|
| `dec_to_hex` | Convert decimal to hexadecimal |
| `hex_to_dec` | Convert hexadecimal to decimal |

### capstone-mcp

Multi-architecture disassembler powered by [capstone-wasm](https://www.npmjs.com/package/capstone-wasm). Supports x86, ARM, ARM64, MIPS, PPC, SPARC, SystemZ, XCore, and M68K.

| Tool | Description |
|------|-------------|
| `disassemble` | Disassemble a hex string of machine code bytes |
| `disassemble_file` | Read bytes from a file at an offset and disassemble |
| `list_architectures` | List all supported architecture/mode combinations |

### ralph.ps1 (optional)

PowerShell worker loop for automated kanban task processing.

## Install

Run this in PowerShell (no cloning needed):

```powershell
irm https://raw.githubusercontent.com/nebelwolfi/claude-utils/master/install.ps1 | iex
```

The installer will:
1. Clone the repo to `~/.claude-utils` (or pull if it already exists)
2. Prompt you to choose which components to install
3. Install prerequisites, run `npm install`, and register MCP servers with `claude mcp add --scope user`
4. Save your choices to `.installed.json` for future updates

Custom install directory:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/nebelwolfi/claude-utils/master/install.ps1) } -InstallDir 'C:\your\path'"
```

| Flag | Effect |
|------|--------|
| `-All` | Install everything without prompts |
| `-Reconfigure` | Re-prompt for previously declined components |

## Update

Re-run the same command. Previously installed components are auto-updated; declined ones are skipped.

## Verify

```powershell
claude mcp list
```
