# 🚀 OmniKB: Complete Installation, Multi-Agent Wiring & Setup Guide

This guide provides step-by-step instructions for installing, configuring, and wiring **OmniKB** across all operating systems (Windows, macOS, Linux) and AI coding harnesses (**Antigravity, Claude Code / Desktop, Cursor, Windsurf, VS Code / Cline, Codex, and Python/REST Agents**).

---

## 📋 Table of Contents

1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Installation Options](#2-installation-options)
   - [Option A: Zero-Install via `npx` (Fastest for MCP & AI Agents)](#option-a-zero-install-via-npx-recommended-for-mcp)
   - [Option B: Global Installation via `npm` (Recommended for CLI Developers)](#option-b-global-installation-via-npm)
   - [Option C: From Source (For Contributors & Local Hacking)](#option-c-building-from-source)
3. [Interactive Setup Wizard (`omnikb setup`)](#3-interactive-setup-wizard)
4. [AI Editor & MCP Client Configuration](#4-ai-editor--mcp-client-configuration)
   - [Google Antigravity / Gemini IDE](#-google-antigravity--gemini-ide)
   - [Claude Code CLI & Claude Desktop](#-claude-code-cli--claude-desktop)
   - [Cursor IDE](#-cursor-ide)
   - [Windsurf (Codeium)](#-windsurf-codeium)
   - [VS Code (Cline, Roo Code, Continue)](#-vs-code-extensions-cline-roo-code-continue)
5. [Local REST API & Web Visualizer Dashboard](#5-local-rest-api--web-visualizer-dashboard)
6. [Multi-Workspace Auto-Discovery & Real-Time Sync](#6-multi-workspace-auto-discovery--real-time-sync)
7. [Post-Installation Verification & Health Check](#7-post-installation-verification--health-check)
8. [Troubleshooting & FAQ Matrix](#8-troubleshooting--faq-matrix)

---

## 1. Prerequisites & System Requirements

OmniKB is lightweight and runs entirely locally without external server dependencies or GPU requirements.

| Component | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` (LTS) | `v20.x` or `v22.x` |
| **npm** | `>= 8.0.0` | Latest |
| **RAM** | `512 MB` free RAM | `1 GB+` |
| **Disk Space** | `50 MB` | `100 MB` |
| **Operating System** | Windows 10/11, macOS 12+, Linux (Ubuntu, Debian, Fedora, Arch) | Any 64-bit OS |
| **Git** *(Optional)* | `>= 2.30.0` | Latest (enables auto-reconciliation on branch checkout) |

Verify your Node.js and npm version in your terminal:
```bash
node -v   # Should output v18.0.0 or higher
npm -v    # Should output 8.0.0 or higher
```

---

## 2. Installation Options

### Option A: Zero-Install via `npx` (Recommended for MCP)

You **do not** need to install OmniKB globally if you are only connecting it to AI editors (Claude, Cursor, Antigravity, etc.). `npx` downloads and executes the latest production bundle on the fly:

```bash
# Test MCP stdio server execution:
npx -y omnikb serve --mcp

# Launch local REST API & Visualizer:
npx -y omnikb serve --port 7890
```

---

### Option B: Global Installation via `npm`

For daily terminal usage, CI/CD pipelines, and fast CLI access:

```bash
npm install -g omnikb
```

Verify the installation:
```bash
omnikb --version
omnikb help
```

---

### Option C: Building From Source

If you want to contribute or customize the AST parsers and Graph engine:

```bash
# 1. Clone the repository
git clone https://github.com/ashhstr/omnikb.git
cd omnikb

# 2. Install dependencies & compile TypeScript
npm install
npm run build

# 3. Verify tests and graph diagnostics
npm test
npm run diagnose

# 4. Link binary globally
npm link
```

---

## 3. Interactive Setup Wizard

OmniKB includes a built-in interactive setup wizard that automatically configures your Second Brain storage location and auto-injects MCP settings into all detected AI editors:

```bash
# Run via npx (no install needed):
npx omnikb setup

# Or if installed globally:
omnikb setup
```

### What the Wizard Does:
1. **Configures Memory Storage Path**: Defaults to `~/.omnikb`, or lets you choose any directory/drive (e.g., `D:\OmniKB-Memory`).
2. **Auto-Detects AI Editors**: Checks your system for Google Antigravity, Claude Desktop, Cursor, and Windsurf.
3. **Auto-Wires MCP Configuration**: Injects the `omnikb` MCP server definition directly into each editor's configuration file.

---

## 4. AI Editor & MCP Client Configuration

If you prefer manual configuration, copy the appropriate JSON snippet below into your editor's configuration file.

### 🌌 Google Antigravity / Gemini IDE

**Configuration File Location**:
- Windows: `%USERPROFILE%\.gemini\config\mcp.json`
- macOS / Linux: `~/.gemini/config/mcp.json`

**JSON Configuration**:
```json
{
  "mcpServers": {
    "omnikb": {
      "command": "npx",
      "args": ["-y", "omnikb", "serve", "--mcp"]
    }
  }
}
```

---

### 🟣 Claude Code CLI & Claude Desktop

**Configuration File Location**:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**JSON Configuration**:
```json
{
  "mcpServers": {
    "omnikb": {
      "command": "npx",
      "args": ["-y", "omnikb", "serve", "--mcp"]
    }
  }
}
```

*For Claude Code CLI:*
```bash
claude mcp add omnikb npx -y omnikb serve --mcp
```

---

### ⚡ Cursor IDE

**Method 1 — Cursor UI Settings**:
1. Open **Cursor Settings** (`Ctrl + ,` / `Cmd + ,`).
2. Navigate to **Features** $\rightarrow$ **MCP Servers**.
3. Click **Add New MCP Server**:
   - **Name**: `omnikb`
   - **Type**: `command`
   - **Command**: `npx -y omnikb serve --mcp`

**Method 2 — JSON File (`.cursor/mcp.json` or Global Settings)**:
```json
{
  "mcpServers": {
    "omnikb": {
      "command": "npx",
      "args": ["-y", "omnikb", "serve", "--mcp"]
    }
  }
}
```

---

### 🌊 Windsurf (Codeium)

**Configuration File Location**:
- Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- macOS / Linux: `~/.codeium/windsurf/mcp_config.json`

**JSON Configuration**:
```json
{
  "mcpServers": {
    "omnikb": {
      "command": "npx",
      "args": ["-y", "omnikb", "serve", "--mcp"]
    }
  }
}
```

---

### 💻 VS Code Extensions (Cline, Roo Code, Continue)

**Cline / Roo Code Settings** (`cline_mcp_settings.json`):
```json
{
  "mcpServers": {
    "omnikb": {
      "command": "npx",
      "args": ["-y", "omnikb", "serve", "--mcp"]
    }
  }
}
```

---

## 5. Local REST API & Web Visualizer Dashboard

For browser-based graph exploration, custom Python agents, ChatGPT actions, or OpenCode integration, start the local HTTP REST API:

```bash
omnikb serve --port 7890
```

### Available Endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `http://127.0.0.1:7890/visual` | `GET` | **Interactive D3 Web Dashboard 2.0** (Dark Mode Visualizer). |
| `http://127.0.0.1:7890/v1/health` | `GET` | Health check, active workspace info, and node/edge statistics. |
| `http://127.0.0.1:7890/v1/workspaces` | `GET` | Lists all registered repositories in the global catalog. |
| `http://127.0.0.1:7890/v1/graph/data` | `GET / POST` | Returns full graph payload (nodes, edges, god nodes, stats). |
| `http://127.0.0.1:7890/v1/explore` | `POST` | Surgical AST exploration (`{"query": "AuthManager", "maxDepth": 3}`). |
| `http://127.0.0.1:7890/v1/impact` | `POST` | Blast radius risk calculation (`{"target": "storage.ts", "depth": 5}`). |
| `http://127.0.0.1:7890/v1/search` | `POST` | Inverted index & token search (`{"query": "auth token", "limit": 10}`). |
| `http://127.0.0.1:7890/v1/sync` | `POST` | Force atomic graph reconciliation (`{"workspace": "all"}`). |

---

## 6. Multi-Workspace Auto-Discovery & Real-Time Sync

OmniKB is built with **100% Universal Automation**:

1. **Automatic Discovery**: Whenever you initialize or create a new project in your workspace root (e.g. `C:\Ash-Workspace\NewApp`), OmniKB automatically discovers `package.json`, `.git`, `Cargo.toml`, or `pubspec.yaml` and registers it without manual commands.
2. **Universal Live Auto-Sync**: In `serve` mode or MCP mode, all registered repositories are watched simultaneously. Code edits in any repository are immediately parsed and indexed in the background.
3. **Background Self-Healing Heartbeat**: A lightweight 60s background heartbeat automatically verifies disk freshness and heals any desynchronization (such as after `git checkout` or `git pull`).
4. **Auto-Pruning**: Deleted or moved project folders are automatically pruned from the registry safely.

### Manual Workspace CLI Management:
```bash
# Register a specific project
omnikb register C:\Projects\MyPortfolio "Portfolio"

# List all registered workspaces
omnikb workspaces

# Switch active workspace
omnikb switch Portfolio

# Watch all registered projects simultaneously
omnikb watch --all

# Force reconcile all projects
omnikb sync --all

# Clean up deleted paths from registry
omnikb prune
```

---

## 7. Post-Installation Verification & Health Check

### Step 1: Terminal Verification
Run the diagnostic command inside your repository:
```bash
omnikb init
omnikb diagnose
```
Expected Output:
```
🩺 Diagnostic Results:
- Unique Nodes Identified : 500+
- Tracked Source Files    : 50+
- Internal Broken Edges   : ✅ None (0)
- Missing File References : ✅ All files exist locally
🎉 Graph integrity check PASSED! 100% healthy.
```

### Step 2: AI Agent Verification
In your AI editor (Cursor, Claude, or Antigravity), ask your agent:
> *"List my OmniKB workspaces using kb_workspaces, and show the status of the current codebase."*

If the agent invokes `kb_workspaces` and `kb_status` successfully, your MCP wiring is 100% operational!

### Step 3: Web Dashboard Verification
Open [http://127.0.0.1:7890/visual](http://127.0.0.1:7890/visual) in your browser. You should see an interactive force-directed graph of your symbols, god nodes, and call hierarchies.

---

## 8. Troubleshooting & FAQ Matrix

### ❓ Issue 1: `Port 7890 is already in use`
- **Cause**: Another instance of OmniKB or another application is occupying port 7890.
- **Solution**: Specify a custom port:
  ```bash
  omnikb serve --port 7899
  ```
  *(Note: Even if the HTTP port is occupied, MCP stdio mode continues running with 0 interruption).*

### ❓ Issue 2: MCP server fails to start on Windows (`npx` execution policy)
- **Cause**: Windows PowerShell execution policy or path spacing issues.
- **Solution**: In your MCP JSON configuration, use `cmd` with `/c`:
  ```json
  {
    "mcpServers": {
      "omnikb": {
        "command": "cmd.exe",
        "args": ["/c", "npx", "-y", "omnikb", "serve", "--mcp"]
      }
    }
  }
  ```

### ❓ Issue 3: Stale Context / Files not updating
- **Cause**: Watcher might have been stopped or large batch file renames occurred.
- **Solution**: Run a universal sync:
  ```bash
  omnikb sync --all
  ```
  Or ask your AI Agent to run `kb_sync({ workspace: "all" })`.

### ❓ Issue 4: Where is the persistent knowledge data stored?
- **Global Registry**: `~/.omnikb/registry.json`
- **Per-Project Knowledge Graph**: `<project-root>/.omnikb/knowledge-graph.json`
- **Live Markdown Architecture**: `<project-root>/KNOWLEDGE_BASE.md`
- **Interactive Visualizer**: `<project-root>/.omnikb/graph.html`

---

## 💡 Summary Checklist for Quick Setup

- [ ] Node.js `>= 18.0.0` installed.
- [ ] Run `npx omnikb setup` or `npm install -g omnikb`.
- [ ] Add `omnikb` to your AI editor's MCP config.
- [ ] Restart your AI editor (Cursor / Claude / Antigravity).
- [ ] Test with `kb_status` or `kb_explore`.

🚀 **You are all set! OmniKB is now powering your AI coding assistant with real-time graph intelligence and >85% token savings.**
