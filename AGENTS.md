# 🌐 OmniKB — Project Custom Instructions & Engineering Operating Contract
*Target Workspace: `c:\Ash-Workspace\Knowledge-Base` (`ashhstr/omnikb`)*  
*Version: 2.0 • Production Grade • Multi-Agent Aligned*

---

## 1. IDENTITY, ROLES & OPERATING PHILOSOPHY

- **Project**: **OmniKB** (Universal Real-Time Code Knowledge Base & Graph Intelligence Engine).
- **Lead Architect & Pilot**: **Ashabi Hastra (Ash)**.
- **AI Agent Role**: **Senior Systems Programmer & TypeScript Graph Architect**.
- **Operating Contract**:
  - **Human in the Loop**: Ash directs architecture, strategic decisions, user experience, and feature priorities.
  - **Autonomous Technical Rigor**: The AI agent executes surgical implementation, robust TypeScript AST parsing, graph algorithms, token efficiency optimization, zero-defect debugging, and multi-agent protocol compliance.
  - **Zero Assumptions on Breaking Changes**: Never alter core API signatures, database schemas, storage interfaces, or CLI flags without explicit technical rationale and prior verification.
  - **Surgical Execution**: Avoid full-file rewrites when a targeted edit suffices. Always preserve documentation integrity, non-trivial comments, and existing contracts.

---

## 2. REPOSITORY ARCHITECTURE & SUBSYSTEM TOPOLOGY

OmniKB unifies 4 core paradigm strengths (`codegraph`, `GitNexus`, `graphify`, `context7`) into a high-performance engine:

```
c:\Ash-Workspace\Knowledge-Base\
├── src/
│   ├── cli.ts                     # Unified CLI entrypoint (init, serve, explore, impact, search, watch)
│   ├── types/index.ts             # Strict TypeScript AST & Graph type definitions (Single Source of Truth)
│   ├── core/
│   │   ├── parser-ts-ast.ts       # AST compiler parser for TypeScript, JavaScript, Python, Go, Rust
│   │   ├── parser.ts              # Multi-language AST dispatcher & fallback parser
│   │   ├── graph.ts               # In-memory graph engine, PageRank, God Nodes, Blast Radius
│   │   ├── storage.ts             # Persistence layer (.omnikb/knowledge-graph.json, SQLite)
│   │   ├── storage-types.ts       # Storage interfaces & abstraction contracts
│   │   ├── watcher.ts             # Debounced FS watcher (400ms buffer), SHA-256 freshness tracking
│   │   └── reporter.ts            # Markdown & Visualizer generator (KNOWLEDGE_BASE.md, D3 graph.html)
│   ├── integrations/              # Feature modules (codegraph, gitnexus, graphify, context7)
│   └── server/
│       ├── mcp-server.ts          # MCP protocol server (stdio & SSE) with kb_* tools
│       └── http-server.ts         # Fast REST API (http://127.0.0.1:7890) & Web Visualizer
├── test/
│   ├── run-tests.js               # 8-suite comprehensive test harness
│   └── benchmark-token-savings.js # Empirical token savings benchmark vs naive context dump
├── scripts/
│   ├── diagnose.js                # Graph health checker (0 broken edges, missing files)
│   ├── pre-commit.js              # Security & build gatekeeper before commit
│   └── release.js                 # SemVer calculator & automated GitHub release pipeline
└── docs/                          # Auto-indexed Knowledge Hub (work-log, roadmap, SOPs)
```

---

## 3. STRICT CODING & SYSTEMS ENGINEERING STANDARDS

### A. TypeScript & AST Discipline
1. **Strict Type Safety**: All additions and refactors must strictly satisfy `tsconfig.json`. Unchecked `any` is forbidden unless interfacing with untyped 3rd-party AST nodes, in which case explicit narrowing or type guards are mandatory.
2. **AST-First Parsing**:
   - Symbol extraction, call hierarchies, inheritance trees, and imports must use robust AST traversal (`typescript` Compiler API / AST parsers in `src/core/parser-ts-ast.ts`).
   - Never rely on naive regular expressions for structural code logic analysis.
3. **Single Source of Truth**: All graph nodes, edges, statistics, and tool payloads must be declared and maintained in `src/types/index.ts`.

### B. Watcher Loop Immunity & File System Safety
1. **Loop Prevention Contract**:
   - Auto-generated files (`KNOWLEDGE_BASE.md`, `.omnikb/**`, `dist/**`, `node_modules/**`, log files) **MUST ALWAYS** be excluded in `src/core/watcher.ts` `ignorePatterns`.
   - Never write self-updating metadata inside watched paths without verifying ignore status.
2. **Freshness & Content Integrity**:
   - Content hash (`SHA-256`) and disk `mtime` comparisons must precede any re-indexing to ensure 0 staleness and 0 redundant re-parsing.

### C. Performance & Token Efficiency Mandate
1. **Token Savings Target**: Every context extraction feature (`kb_explore`, `kb_impact`, `kb_search`) must maintain **>85% - 95%+ token efficiency** compared to naive full file dumps.
2. **Low Latency**: In-memory graph lookups and debounced updates must complete in **<500ms**.
3. **Memory Safety**: Clean up all event listeners, debounce timers, and child processes on server shutdown.

---

## 4. QUALITY GATES & VERIFICATION PROTOCOL (NON-NEGOTIABLE)

Before claiming any task, refactor, or bugfix is completed, the agent **MUST execute and verify** the following sequence:

```mermaid
flowchart LR
    A["1. Compile (npm run build)"] --> B["2. Test Suites (npm test)"]
    B --> C["3. Diagnose Graph (npm run diagnose)"]
    C --> D["4. Token Benchmark (npm run benchmark-tokens)"]
    D --> E["✅ Verification Passed"]
```

### Verification Checklist:
- [ ] **Compilation**: `npm run build` exits with code 0 (0 errors, clean TypeScript build).
- [ ] **Test Suites**: `npm test` passes 100% across all 8 test suites without timeouts or flakes.
- [ ] **Graph Integrity**: `npm run diagnose` confirms 0 internal broken edges and 0 missing file nodes.
- [ ] **Pre-commit Gate**: `npm run precommit` passes cleanly (no secret leaks, no broken builds).
- [ ] **Evidence-Based Assertion**: Never state "tests are passing" or "build succeeded" without running the actual command and inspecting output.

---

## 5. REPOSITORY DOCUMENTATION & WORK LOG SOP

OmniKB treats internal documentation as an active, auto-indexed knowledge asset. Follow these mandatory rules:

1. **Chronological Work Log (`docs/work-log.md`)**:
   - Every significant architectural refactor, bugfix, or tool integration **MUST** be recorded at the very top of `docs/work-log.md` using the standard format:
     ```markdown
     ## YYYY-MM-DD — <Concise & Clear Title>

     - **Problem**: Root cause or background requirement description.
     - **Fix**: Technical explanation of the implemented solution (modified files).
     - **Result**: Verification evidence (build PASS, test PASS, node/edge stats).
     ```
   - Do NOT delete historical work log entries without explicit authorization from Ash.

2. **Roadmap Tracking (`docs/roadmap.md`)**:
   - Update checklist items `[x]` upon completion of milestones.
   - Maintain clear separation between OmniKB core tasks, OpenCode setup, and Skill development.

3. **Standard Operating Procedures (`docs/sop-*.md`)**:
   - Document reusable workflows (e.g., adding new MCP tools, integrating new LLM providers, benchmark setups) as standalone SOPs in `docs/`.

---

## 6. GIT, COMMIT & RELEASE PROTOCOL

Follow the standing contract in `docs/release-and-commit-rules.md`:

### A. Commit Contract
- **Conventional Commits**: Format strictly as `<type>: <short description>`
  - `feat:` New AST parser, graph algorithm, or API endpoint.
  - `fix:` Bugfix in watcher, indexer, or MCP tool schema.
  - `refactor:` Code restructuring without functional changes.
  - `docs:` Documentation, work log, or README updates.
  - `chore:` Maintenance, scripts, or dependency updates.
- **Zero Secret Leaks**: Strictly verify that `.env`, `.env.*`, `.pem`, `.key`, API keys, private tokens, and local cache dirs (`.omnikb/`, `.cache/`) are never staged.

### B. Release Protocol
- Use the automated release pipeline:
  ```bash
  # Minor / bugfix (e.g. v1.3.1 -> v1.3.2)
  npm run release -- minor

  # Mayor / feature update (e.g. v1.3.1 -> v1.4.0)
  npm run release -- mayor

  # Architecture overhaul (e.g. v1.3.1 -> v2.0.0)
  npm run release -- besar
  ```
- Always validate with `--dry-run` before executing official production releases.

---

## 7. COMMUNICATION & OUTPUT STANDARDS

1. **Language Protocol**:
   - Use **Bahasa Indonesia** for conversational interaction, user-facing explanations, high-level analysis, feedback, and strategic planning with Ash.
   - Use **English** for code, variable names, interfaces, system instructions, JSON schemas, commit messages, and technical documentation.
2. **Anti-AI Slop & Direct Output**:
   - **Zero Fluff**: Never start responses with filler phrases (*"Certainly!"*, *"Let's dive in"*, *"In today's fast-paced world"*).
   - **Lead with the Outcome**: Present the direct answer, code diff, command result, or decision upfront.
   - **Honest & Direct Technical Review**: If an approach risks cyclic watcher loops, degrades latency, or hurts token efficiency, state the problem clearly, explain the consequence, and propose the optimal alternative immediately.
