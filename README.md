# 🌐 OmniKB: Universal Real-Time Code Knowledge Base & Graph Intelligence Engine

[![Release](https://img.shields.io/github/v/release/ashhstr/omnikb?style=flat-square&color=2563eb)](https://github.com/ashhstr/omnikb/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-11%2F11%20PASS%20(100%25)-success?style=flat-square)](test/run-tests.js)
[![Token Savings](https://img.shields.io/badge/Token%20Savings-85%25%20--%2095%25-green?style=flat-square)](test/benchmark-token-savings.js)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple?style=flat-square)](https://modelcontextprotocol.io)

**OmniKB** is a local-first Code Knowledge Base and AST Graph Intelligence Engine for AI coding agents (**Antigravity, Cursor, Claude Code, Windsurf, Codex, Gemini CLI, Aider, and Copilot**).

Instead of dumping entire files or directories into context windows, OmniKB provides **Surgical Context Retrieval**: exact symbol signatures, call hierarchies, upstream blast radiuses, and verbatim source lines in a single query.

---

## 🏛️ The 4 Pillars of OmniKB

OmniKB synthesizes the core strengths of four open-source developer tools into a unified TypeScript engine:

```
                               ┌─────────────────────────────────────────┐
                               │           OMNIKB UNIFIED ENGINE         │
                               └────────────────────┬────────────────────┘
                                                    │
        ┌──────────────────────────┬────────────────┴──────────┬──────────────────────────┐
        ▼                          ▼                           ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     context7     │       │     GitNexus     │       │    codegraph     │       │     graphify     │
│ Dynamic MCP Docs │       │ Graph RAG Engine │       │ Real-Time Watcher│       │ PageRank Hubs    │
│ & Schema Context │       │ & Blast Radius   │       │ & Inverted Index │       │ & God Node Radar │
└──────────────────┘       └──────────────────┘       └──────────────────┘       └──────────────────┘
```

1. **`context7` (`upstash/context7`)**: Dynamic MCP context injection protocol, version-specific schema resolution, and live documentation sync.
2. **`GitNexus` (`abhigyanpatwari/GitNexus`)**: Zero-server local Graph RAG, multi-hop call graph traversal, and blast radius regression scoring.
3. **`codegraph` (`colbymchenry/codegraph`)**: OS-native file watcher (<500ms debounce), sub-token inverted indexing, and elimination of the slow "grep-glob-read" loop.
4. **`graphify` (`Graphify-Labs/graphify`)**: PageRank graph centrality scoring ($d = 0.85$), God Node architectural bottleneck detection, and persistent memory.

---

## 🚀 Key Capabilities

- 💰 **85% – 95%+ Token Reduction**: Returns focused AST subgraphs and line-numbered verbatim code snippets, cutting prompt token costs.
- 🌐 **Universal Multi-Workspace Catalog**: Manages multiple projects concurrently with an LRU memory pool. Switch active workspaces on the fly.
- 🔄 **Zero-Config Global Auto-Discovery**: Background watcher monitors parent drives (`C:\`, `D:\`) and indexes new codebases without manual CLI commands.
- 🛡️ **Blast Radius CI/CD Gatekeeper (`omnikb audit-impact`)**: Evaluates refactoring risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) with exit codes (0/1) for pre-commit hooks and GitHub Actions.
- 📊 **Web Dashboard 2.0 & Dynamic Visualizer**: Serves real-time REST API endpoints (`/v1/graph/data`, `/v1/graph/impact`) and an interactive dark-mode D3 graph visualizer (`http://127.0.0.1:7890/visual`).
- 🔒 **100% Freshness Guarantee**: Incremental SHA-256 hash tracking and atomic swap file persistence (`.tmp`) prevent data corruption and stale context.
- 🧩 **12+ Multi-Language Parsers**: Native AST compiler support for TypeScript, JavaScript, Python, Go, Rust, Dart/Flutter, Vue, Svelte SFC, Prisma ORM, SQL DDL, Java, Kotlin (JVM), and PHP.

---

## 📊 Empirical Token Savings Benchmark

Measured directly on real-world repositories via `npm run benchmark-tokens`:

| Context Retrieval Method | Payload Size | Estimated Tokens | Token Savings Rate |
| :--- | :--- | :--- | :--- |
| **Naive Full Context Dump** (Reading raw `/src`) | **265,312 Bytes** | **~69,819 Tokens** | `0%` *(Baseline)* |
| **OmniKB `kb_explore` (`checkFreshness`)** | **27,841 Bytes** | **~7,327 Tokens** | **`89.51%` Savings** |
| **OmniKB `kb_explore` (`CodeParser`)** | **30,130 Bytes** | **~7,929 Tokens** | **`88.64%` Savings** |
| **OmniKB `kb_explore` (`calculateImpact`)** | **48,054 Bytes** | **~12,646 Tokens** | **`81.89%` Savings** |
| **OmniKB `kb_search` (Inverted Index Query)** | **~3,400 Bytes** | **~890 Tokens** | **`98.72%` Savings** |
| **Average On-Demand Retrieval** | **~45,000 Bytes** | **~11,958 Tokens** | **`82.87% – 91.00%+` Savings** |

---

## 📦 Quickstart & Installation

### Option 1: Global 1-Liner Installation (Recommended)

Install the pre-compiled binary package directly via npm:

```powershell
# 1. Install global package from GitHub release
npm install -g https://github.com/ashhstr/omnikb/releases/download/v1.5.0/omnikb-1.5.0.tgz

# 2. Run the interactive setup wizard
omnikb setup
```

The interactive wizard will:
1. Prompt you to pick a custom Second Brain memory directory (default: `~/.omnikb`).
2. Auto-inject the MCP configuration into your selected AI editors (**Antigravity, Claude Desktop/Code, Cursor, Windsurf**).

---

### Option 2: Local Source Installation (Contributors)

```powershell
# 1. Clone the repository
git clone https://github.com/ashhstr/omnikb.git
cd omnikb

# 2. Install dependencies & build
npm install
npm run build

# 3. Link executable globally
npm link

# 4. Run setup wizard
omnikb setup
```

---

## 🔌 AI Agent & MCP Configuration

If you prefer manual configuration, add the following to your editor's MCP config file (`mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "omnikb": {
      "command": "node",
      "args": [
        "C:/Users/user/AppData/Roaming/npm/node_modules/omnikb/dist/cli.js",
        "serve",
        "--mcp"
      ]
    }
  }
}
```

### Available MCP Tools

| MCP Tool | Description |
| :--- | :--- |
| `kb_explore(query, maxDepth, workspace)` | 1-step symbol context exploration: signatures, call hierarchy, and source code. |
| `kb_impact(target, maxDepth, workspace)` | Blast radius calculation and refactoring risk analysis (`LOW` to `CRITICAL`). |
| `kb_search(query, limit, workspace)` | Composite relevance search across symbols, sub-tokens, and file paths. |
| `kb_god_nodes(limit, workspace)` | Identifies high-coupling architectural bottlenecks ranked by PageRank centrality. |
| `kb_architecture(workspace)` | Repository summary: file counts, total symbols, top central hubs, and routes. |
| `kb_workspaces()` | Lists all registered codebases and shows the active workspace context. |
| `kb_register(path, name)` | Registers and indexes a new workspace into the global catalog. |
| `kb_unregister(target)` | Removes a workspace from the global registry. |
| `kb_switch(target)` | Switches active workspace context on the fly. |
| `kb_status(workspace)` | Real-time file watcher status, queue size, and freshness metrics. |
| `kb_sync(force, workspace)` | Forces atomic workspace graph reconciliation. |

---

## 💻 CLI Commands Reference

```powershell
# Initialize current workspace knowledge graph
omnikb init

# Run Universal Server (MCP stdio + REST API + Live Web Visualizer)
omnikb serve --port 7890

# Interactive Setup Wizard (Configure Memory path & AI Agent MCP wiring)
omnikb setup

# List and manage multi-workspace catalog
omnikb workspaces
omnikb register C:\Projects\MyNewApp "MyNewApp"
omnikb switch MyNewApp
omnikb unregister MyNewApp

# Explore symbol call graph and verbatim source code
omnikb explore CodeParser

# Inspect blast radius before refactoring
omnikb impact calculateImpact

# Run automated CI/CD blast radius gatekeeper
omnikb audit-impact src/core/graph.ts --max-risk HIGH

# Search symbols, tokens, and filenames
omnikb search "storage impact"

# Re-generate markdown knowledge base and HTML visualizer
omnikb report
omnikb visual
```

---

## 🌐 Local REST API & Web Dashboard

Run the server on your desired port:

```powershell
omnikb serve --port 7890
```

- **Interactive Web Dashboard 2.0**: `http://127.0.0.1:7890/visual`
- **Graph Data API**: `GET http://127.0.0.1:7890/v1/graph/data`
- **Live Blast Radius API**: `GET http://127.0.0.1:7890/v1/graph/impact?target=CodeParser&depth=3`
- **Surgical Context API**: `POST http://127.0.0.1:7890/v1/explore`
- **Workspace Catalog API**: `GET http://127.0.0.1:7890/v1/workspaces`

---

## 🛡️ Pre-commit & CI/CD Gatekeeper

Run automated blast radius checks on git diffs before merging or committing:

```powershell
# Check changed files with risk threshold
npm run impact-check -- --max-risk HIGH
```

---

## 🧪 Testing & Verification

Run the full 11-suite automated test harness and diagnostic checks:

```powershell
# Compile TypeScript
npm run build

# Run 11 test suites
npm test

# Run graph health & edge integrity check
npm run diagnose

# Run pre-commit gatekeeper
npm run precommit

# Run token savings benchmark
npm run benchmark-tokens
```

---

## 📄 License

MIT License © 2026 Ashabi Hastra (Ash).
