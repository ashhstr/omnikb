# 🏛️ OmniKB — Four Pillars Architecture & Inspiration Matrix
*Standard Operating Procedure • Version 1.0 • Architectural Heritage*

---

## 1. Executive Summary

OmniKB is engineered as the unified synthesis of 4 landmark open-source developer tools:
1. **`codegraph`** (`colbymchenry/codegraph`): High-speed AST parsing, debounced file watcher, and SQLite FTS5 indexing.
2. **`GitNexus`** (`abhigyanpatwari/GitNexus`): Zero-server local Graph RAG, blast radius risk calculation, and D3 browser visualizer.
3. **`graphify`** (`Graphify-Labs/graphify`): PageRank graph centrality metrics, God Node / bottleneck detection, and persistent memory.
4. **`context7`** (`upstash/context7`): Dynamic context injection protocol via MCP and live documentation syncing.

---

## 2. Comparative Matrix & Heritage Mapping

| Pillar / Repository | Primary Engineering Superpower | Problem Solved | OmniKB Module / Implementation |
| :--- | :--- | :--- | :--- |
| **`codegraph`**<br>`colbymchenry/codegraph` | OS-native file watcher + debounced AST delta parsing + SQLite FTS5 inverted search. | Kills the slow, token-heavy "grep-glob-read" loop of AI coding agents. | `src/core/watcher.ts`<br>`src/core/parser-ts-ast.ts`<br>`src/core/storage.ts` |
| **`GitNexus`**<br>`abhigyanpatwari/GitNexus` | Zero-server client-side Graph RAG, cross-file reference resolution, and blast radius risk scores. | Agents break dependent modules because they lack architectural call-chain awareness. | `src/core/graph.ts` (`calculateImpact`)<br>`src/core/reporter.ts` (D3 visualizer)<br>`kb_impact` MCP tool |
| **`graphify`**<br>`Graphify-Labs/graphify` | PageRank graph centrality hub metrics, God Node / high-coupling detection, persistent memory. | Complex legacy codebases have hidden coupling traps that confuse LLMs. | `src/core/graph.ts` (`calculatePageRank`, `findGodNodes`)<br>`kb_god_nodes` MCP tool<br>`docs/work-log.md` |
| **`context7`**<br>`upstash/context7` | Dynamic context injection via Model Context Protocol (MCP) & live doc syncing. | AI models hallucinate outdated or incorrect APIs and lack version-specific context. | `src/server/mcp-server.ts`<br>`src/server/http-server.ts`<br>`KNOWLEDGE_BASE.md` auto-sync |

---

## 3. OmniKB's Unified Competitive Moat

While the 4 inspiration projects specialize in individual segments:
- **`codegraph`** focuses primarily on local indexing.
- **`GitNexus`** focuses on client-side visualization and blast radius.
- **`graphify`** focuses on Python-based graph intelligence.
- **`context7`** focuses on remote documentation fetching.

**OmniKB unifies all four capabilities into a single, high-performance TypeScript engine** with unique additions:
1. **Universal Multi-Workspace Catalog**: Seamlessly manages multiple concurrent codebases with LRU memory caching.
2. **Global Auto-Discovery Daemon**: Transparents background indexing across all drives (including root `C:\`, `D:\`) with 0 manual commands.
3. **Interactive 1-Click Setup Wizard**: Direct auto-injection of MCP configurations into Antigravity, Claude Code, Cursor, and Windsurf.
4. **Empirical Token Savings (>85% to >95%)**: Compact, surgical AST context payloads replacing massive context dumps.
