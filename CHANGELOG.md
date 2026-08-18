# OmniKB Changelog

## [v1.5.0] - 2026-08-18

### Features & Architectural Highlights
- **Interactive Setup Wizard (`omnikb setup`)**: Zero-config onboarding CLI wizard for custom Second Brain memory path selection and automatic MCP injection into AI Agents (Antigravity, Claude Code/Desktop, Cursor, Windsurf).
- **Universal Multi-Workspace Engine**: Seamless multi-project cataloging with LRU eviction cache, active workspace switching, and dynamic resolution across MCP tools (`kb_workspaces`, `kb_register`, `kb_unregister`, `kb_switch`).
- **Global Auto-Discovery Daemon**: Background watcher that automatically monitors parent directories (including root drives `C:\`, `D:\`) and transparently indexes new projects upon creation without manual commands.
- **Zero-Data-Loss Hardening**: Multi-process live registry re-syncing, recursive subdirectory scanning, and atomic `.tmp` swap file persistence.
- **Dedicated Multi-Language Parsers**: Added deep AST support for Dart/Flutter, Vue/Svelte SFC, Prisma ORM, SQL DDL, JVM (Java/Kotlin), and PHP.
- **Seamless NPM Git Distribution**: Pre-compiled `dist/` distribution artifacts and zero-dependency global installation via `npm install -g github:ashhstr/omnikb`.

## [v1.4.0] - 2026-08-16

### Changes
- 7e8696a feat(core): harden workspace scope resolution and sync zero-defect runtime state
- 5dc4f7b chore: remove redundant engineering standards file in favor of release-and-commit-rules.md
- 1505066 docs: codify strict commit and release rules into permanent repository standards
- a1f05b7 docs: codify master engineering standards, commit rules, and release gates
- d4649da docs: establish strict commit policy and zero-tolerance release criteria with multi-agent test suite
- ac7a823 chore(ci): disable GitHub Actions workflow in favor of local precommit suite
- ed0aff6 feat(release): integrate GitHub CLI (gh) for automated release publishing
- 02b41a5 fix(ci): update workflow to use npm install and add index-workspace step
- 678b420 feat: add CI/CD workflows, modular parsers (Go, Rust), PageRank graph metrics, diagnostic & release tools
- e85ad54 chore: bump version to v1.3.1
- 53d843f fix(stability): handle EADDRINUSE gracefully, sanitize MCP stdio output, remove duplicate watcher
- a131428 feat: add supervisor script for zero-downtime background daemon
- 1cde884 docs: translate README to professional English for open-source standard
- a02c6d4 docs: add benchmark token savings table to README
- 303af3b feat: add automated token savings benchmark script
- dabb63f docs: highlight 90% token savings & surgical context retrieval in README
- d977fcd feat: 100% Freshness Guarantee - kb_sync, Git HEAD watcher, atomic staleness detection\n\n- Add FreshnessMetadata type and integrate into ExploreResult/ImpactAnalysis\n- Implement checkFreshness() for atomic file hash verification\n- Add forceReconcile() and .git/HEAD watcher for branch-switch detection\n- Add kb_sync MCP tool and POST /v1/sync REST endpoint\n- Add comprehensive test suite (7 scenarios)\n- Update README with freshness documentation
- d0cfa7a docs: display reproducible benchmark audit openly in README
- 218c0b3 docs: add reproducible empirical token reduction benchmark script and live audit results

All notable changes to this project will be documented in this file.
