# Roadmap

Prioritas kerja terkait OmniKB, opencode, dan skill development. Centang `[x]` saat selesai.

## OmniKB

- [x] Refactor 3 fase (AST parser, decompose reporter/cli, storage interface)
- [x] Fix loop watcher (`KNOWLEDGE_BASE.md` ke ignorePatterns)
- [x] Verifikasi auto-save/auto-update (live probe)
- [x] Docs hub `docs/` + work-log
- [x] Workspace scope hardening & Multi-Agent MCP verification
- [x] Dedicated Multi-Language Parsers (Dart/Flutter, Vue/Svelte SFC, Prisma, SQL DDL, Java/Kotlin Spring, PHP Laravel)
- [x] Universal Multi-Workspace Engine (Global Registry `~/.omnikb/registry.json`, Lazy-Load LRU, Cross-Project MCP)
- [x] Verifikasi ID model HCN Sec: `kat-coder-pro-v2.5`, `Qwen3.8-27B` via `GET https://api.hcnsec.cn/v1beta/models`
- [ ] Coba pilih model via `/model` (hcnsec/glm-5.2 dsb) & test tool_call

## opencode Setup

- [x] Provider HCN Sec terpasang (6 model, apiKey via `{env:HCN_SEC_API_KEY}`)
- [x] AGENTS.md global custom instructions
- [ ] Eksplorasi: agent kustom, commands, skills (project/global)

## Skill Development

- [ ] AI Agent & Automation: design + deploy agent pertama yang solve masalah nyata
- [ ] Frontend: bangun website/app pertama pakai AI-assisted development
- [ ] Prompt Engineering: bikin prompt library + framework yang bisa dijual (e-book/digital product)