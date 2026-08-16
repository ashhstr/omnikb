# OmniKB System Prompt & Guidelines for OpenAI Codex / Copilot / ChatGPT

When pair programming or auditing this repository, prioritize **OmniKB** tools/endpoints over manual full-file reading to reduce token consumption by up to 90% and prevent context bloat.

---

## Tool Execution Protocol

### 1. Codebase Exploration & Symbol Search
Before reading multiple entire files, query the pre-indexed code graph:
- **MCP Tool**: `kb_explore(query="<symbol_name>", maxDepth=3)`
- **REST API Equivalent**: `POST http://127.0.0.1:7890/v1/explore` with `{"query": "<symbol_name>", "maxDepth": 3}`
- **Output**: Returns the exact verbatim function/class snippet, line numbers, inbound callers, and outbound callees in 1 step.

### 2. Refactoring & Blast Radius Analysis
Before proposing any code change, breaking change, or function signature alteration:
- **MCP Tool**: `kb_impact(target="<symbol_or_file>", maxDepth=5)`
- **REST API Equivalent**: `POST http://127.0.0.1:7890/v1/impact` with `{"target": "<symbol>", "maxDepth": 5}`
- **Output**: Computes numerical risk score (LOW, MEDIUM, HIGH, CRITICAL) and lists all upstream affected files and HTTP routes.

### 3. Fast Inverted Index & Token Search
For keyword lookup or searching across documentation and symbols:
- **MCP Tool**: `kb_search(query="<search_term>", limit=20)`
- **REST API Equivalent**: `POST http://127.0.0.1:7890/v1/search` with `{"query": "<term>", "limit": 20}`

### 4. Repository Topology & Health
- **MCP Tool**: `kb_architecture()` / `kb_status()`
- **REST API Equivalent**: `GET http://127.0.0.1:7890/v1/health` or `GET http://127.0.0.1:7890/v1/stats`
- **Output**: Returns God Nodes (most coupled components), total symbols, edges, and active file watcher state.
