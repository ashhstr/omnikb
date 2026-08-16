# Work Log

Riwayat kerja kronologis. Tambahkan entri baru di atas entri lama (format: `## YYYY-MM-DD — <judul>`). Jangan hapus entri lama tanpa alasan.

---

## 2026-08-16 — Adaptasi 55 agent ke format opencode native

- **Masalah**: sebagian agent error — model `haiku`/`sonnet` (Claude-only, nggak ada di HCN Sec), `tools: {...}` deprecated, format frontmatter gaya Claude Code yang invalid YAML (description pakai literal `\n` + baris contoh tanpa indent — Claude Code lenient, opencode ketat).
- **Fix**:
  - Model: `haiku` → `hcnsec/glm-5.2`, `sonnet` → `hcnsec/kat-coder-pro-v2.5`, sisanya `inherit`.
  - `mode: subagent` untuk semua 55 agent → primary tetap agent bawaan opencode (build/plan).
  - `tools: {...}` deprecated → `permission:` (read/edit/bash/grep/glob/websearch/webfetch/task/todowrite).
  - Rebuild frontmatter dengan parser lenient + block scalar `|-` → semua 55 valid YAML.
  - Hapus ref `mcp__meigen__*` (server nggak ada) dari gallery-researcher & image-generator.
- **Hasil**: 55/55 valid, 39 inherit + 12 glm-5.2 + 4 kat-coder-pro-v2.5. Restart opencode untuk apply.

## 2026-08-16 — Instalasi Skill Library (25 repo)

- **Clone 25 repo** → `C:\Ash-Workspace\Skills\` (shallow, --depth 1). Masalah: repo besar (agentic-awesome-skills, ECC, dll) sempat gagal karena timeout & error network (early EOF) — di-retry berurutan sampai berhasil.
- **71 skill terpasang** → `C:\Users\user\.config\opencode\skills\` (stop-slop, last30days, Humanizer, impeccable, karpathy-guidelines, gsap-skills 8, taste-skill 13, ui-ux-pro-max 7, superpowers 14, agent-skills 24). Semua frontmatter divalidasi: `name` match folder + `description` ada.
  - Fix: 10 skill taste-skill di-rename folder-nya mengikuti frontmatter `name` (aturan opencode).
- **55 agent terpasang** → `C:\Users\user\.config\opencode\agent\` (wshobson 28 kurasi dari 738, contains-studio 32). Semua punya `description`.
- **Katalog dibuat** → `docs/skill-library.md` (status per repo: terpasang / library / pending).
- **Library (tidak diaktifkan penuh)**: agentic-awesome-skills (2.009 SKILL), Anthropic-Cybersecurity (817), ECC (378), agency-agents (316 agent), gstack (59), mattpocock (40), shadcn/ui, motion, awesome-mcp-servers, ruflo, Understand-Anything → kurasi manual bila perlu.
- **Pending**: browser-use & autoresearch butuh **Python** (belum terpasang di mesin). Langkah: `winget install Python.Python.3.12` → `uvx browser-use` → daftar MCP.
- Setelah ini: **restart opencode** agar 71 skill + 55 agent ter-load.

## 2026-08-16 — Integrasi GitHub MCP Server

- Dipasang **github-mcp-server v1.9.0 (official GitHub)** via binary Windows x86_64 → `C:\Ash-Workspace\Tools\github-mcp-server\github-mcp-server.exe` (25 MB, verified `--version` OK).
- Alasan pilih binary: `@github/mcp-server` **tidak ada di npm registry** (E404, banyak tutorial yang salah), Docker tidak terpasang di mesin → binary release adalah rute resmi tanpa Docker.
- Config global `opencode.jsonc` → blok `mcp.github`: `type: local`, command `[exe, "stdio"]`, env `GITHUB_PERSONAL_ACCESS_TOKEN: {env:GITHUB_PERSONAL_ACCESS_TOKEN}`.
- Token dipasang sendiri oleh user via env var `GITHUB_PERSONAL_ACCESS_TOKEN` (User scope). Tidak ditulis literal di config.
- Pending: user set env var + restart opencode → verifikasi tools MCP github muncul.
- **DONE**: setelah user set `GITHUB_PERSONAL_ACCESS_TOKEN` & restart, MCP github terhubung — `get_me` OK: login `ashhstr` (4 repo total, 3 public).

## 2026-08-16 — Catatan Operasional HCN Sec (timeout saat ramai)

- User mengonfirmasi: tidak perlu test `/model` lagi, model sudah bisa dipilih via `/model`.
- Namun ada catatan: di waktu tertentu, model `glm-5.2` & `DeepSeek-V4-Pro` dari `https://api.hcnsec.cn/` bisa **time out karena banyak pengguna** (load tinggi). Bukan masalah config/key.
- Kalau timeout terjadi → retry / pindah ke model lain (`Qwen3.6-27B`, `MiniMax-M3`, `kat-coder-pro-v2.5`, `Qwen3.8-27B`).

## 2026-08-16 — Verifikasi Model ID HCN Sec via API

- `GET https://api.hcnsec.cn/v1beta/models` (Bearer `HCN_SEC_API_KEY`) → 200 OK, 6 model terverifikasi:
  `glm-5.2`, `kat-coder-pro-v2.5`, `Qwen3.8-27B`, `MiniMax-M3`, `Qwen3.6-27B`, `DeepSeek-V4-Pro`.
- Semua ID di config `provider.hcnsec` valid — termasuk `kat-coder-pro-v2.5` & `Qwen3.8-27B` yang sebelumnya belum ada di docs V2.0.
- Tidak perlu koreksi config.

## 2026-08-16 — Docs Hub & Work Log dibuat

- Membuat `docs/` sebagai knowledge hub di dalam workspace OmniKB (ter-index otomatis).
- Alasan: OmniKB hanya meng-index file dalam folder workspace; chat/AGENTS.md/config di luar workspace tidak tersimpan. Work log ini adalah jejak kerja yang bisa di-recall via `kb_search`.

## 2026-08-16 — AGENTS.md Global Custom Instructions

- Disimpan sistem custom instruction ASH (21 section) di `C:\Users\user\.config\opencode\AGENTS.md`.
- Didaftarkan di config global via `"instructions": ["AGENTS.md"]`.
- Berlaku di semua project setelah restart opencode.
- Catatan: file ini di luar workspace OmniKB → tidak ter-index (sengaja, lihat work-log di atas).

## 2026-08-16 — Verifikasi Auto Save/Update OmniKB (post-restart)

- Live probe: file `src/probe-autosave-ok.ts` dibuat → ter-index ~4 detik via MCP; dihapus → hilang dari index & `knowledge-graph.json` di-rewrite.
- Stats sehat: 38 files / 226 nodes / 1048 edges, `pendingQueue: []`.

## 2026-08-16 — Integrasi Provider HCN Sec ke opencode

- Config global `C:\Users\user\.config\opencode\opencode.jsonc`: blok `provider.hcnsec`.
  - `npm: @ai-sdk/openai-compatible`, `baseURL: https://api.hcnsec.cn/v1`
  - 6 model: `glm-5.2`, `kat-coder-pro-v2.5`, `Qwen3.6-27B`, `Qwen3.8-27B`, `MiniMax-M3`, `DeepSeek-V4-Pro` (semua `tool_call: true`)
- API key disimpan di env var `HCN_SEC_API_KEY` (registry `HKCU:\Environment`), config memakai `{env:HCN_SEC_API_KEY}` — key tidak ditulis literal di file.
- Default model tidak diset → pilih manual via `/model`.
- Pending: verifikasi ID model `kat-coder-pro-v2.5` & `Qwen3.8-27B` (belum ada di docs platform V2.0) via `GET /v1beta/models`.

## 2026-08-16 — Fix Bug Loop Watcher OmniKB

- Gejala: watcher loop tanpa henti karena `KNOWLEDGE_BASE.md` (berisi timestamp) di-generate sendiri → hash berubah → re-parse → loop.
- Fix: tambah `'KNOWLEDGE_BASE.md'` ke `ignorePatterns` di `src/core/watcher.ts`.
- Verifikasi: build PASS + `test/loop-test.js` (8 sample queue `[]`) + live probe.

## 2026-08-16 — Refactor OmniKB 3 Fase (sebelumnya)

- Fase 1: AST parser (`parser-ts-ast.ts`), Fase 2: decompose reporter/cli, Fase 3: storage interface.
- Build & `npm test` PASS; index 38 files / 226+ nodes / 1048 edges.