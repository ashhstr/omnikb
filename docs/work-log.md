# Work Log

Riwayat kerja kronologis. Tambahkan entri baru di atas entri lama (format: `## YYYY-MM-DD — <judul>`). Jangan hapus entri lama tanpa alasan.

## 2026-08-18 — Inverted Index & Semantic Token Ranking Engine Upgrade

- **Problem**: 
  1. Tokenisasi simbol kode sebelumnya bersifat naif (hanya pemecahan regex dasar), tidak mengekstrak konstituen kata dari camelCase, PascalCase, snake_case, kebab-case, dan akronim (misal `getUserProfile` -> `get`, `user`, `profile`; `parseAST` -> `parse`, `ast`).
  2. Search scoring sebelumnya hanya memberikan flat score tanpa mempertimbangkan composite relevance multi-faktor (exact match vs case-insensitive match vs prefix/substring match, token frequency weighting, kind boost, dan file path boosting) serta dukungan query multi-kata (seperti "storage impact", "parse AST").
- **Fix**:
  - `src/core/storage.ts`:
    - Mengimplementasikan `KnowledgeStorage.tokenizeSymbol(name)` untuk mendekonstruksi simbol menjadi token konstituen kata lengkap untuk camelCase, PascalCase, snake_case, kebab-case, dan akronim.
    - Mengimplementasikan `buildInvertedIndex()` dan `extractNodeTokens(node)` untuk memperkaya pemetaan token-to-symbol in-memory (`tokenIndex`, `symbolIndex`, `fileNodesIndex`, `fileEdgesIndex`).
    - Meng-upgrade `search(query, limit = 10)` dengan multi-factor composite relevance engine:
      - Exact symbol name match: +100 poin.
      - Case-insensitive exact match: +60 poin.
      - Symbol name prefix match: +30 poin.
      - Symbol name substring match: +15 poin.
      - Token matching via inverted index: +5 poin per matching token berbobot frekuensi (`5 * Math.min(freq, 10)`).
      - Kind/Type boost: `class`/`interface` (+15), `function`/`method` (+10), `route` (+12), `type` (+8).
      - File path boost jika term query cocok dengan direktori/nama file (+10).
      - Pengurutan descending berdasarkan composite score dan capping sesuai `limit`.
  - `src/core/storage-types.ts`: Menambahkan method opsional `buildInvertedIndex?(): void` pada interface `IKnowledgeStorage`.
  - `test/run-tests.js`: Memperluas Test Suite 2 untuk menguji tokenisasi konstituen simbol, pencarian multi-kata ("auth manager"), pencarian token konstituen ("format" -> "formatUser"), dan verifikasi rebuild `buildInvertedIndex()`.
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% PASS (0 errors, exit code 0).
  - `npm test`: 11/11 test suites PASS 100% tanpa defect.
  - `npm run diagnose`: 574 unique nodes, 3.174 edges, 115 files, 0 broken edges, 0 missing files (100% Healthy).

- **Problem**: 
  1. CI/CD pipeline membutuhkan mekanisme otomatis untuk mengaudit blast radius dari perubahan kode (simbol / file yang dimodifikasi) terhadap kebijakan risiko maksimum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  2. Ketiadaan CLI command mandiri dan helper script yang dapat mendeteksi perubahan git secara otomatis dan menghentikan build/merge (exit code 1) jika blast radius melampaui toleransi risiko.
- **Fix**:
  - `src/cli.ts`: Menambahkan command `audit-impact <target> [--max-risk <LOW|MEDIUM|HIGH|CRITICAL>] [--depth <number>] [--json]`. Mengevaluasi skor risiko perubahan terhadap ambang batas toleransi (LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4), mengeluarkan exit code 0 untuk passed dan exit code 1 untuk violation, serta menyematkannya ke banner bantuan CLI (`printBanner`/`printHelp`).
  - `scripts/impact-check.js`: Membuat helper script mandiri untuk CI/CD yang secara otomatis mendeteksi file kode yang berubah dari git working tree (`git diff` / `git status`), menjalankan audit blast radius untuk setiap file, dan menghasilkan ringkasan visual dan JSON report.
  - `package.json`: Menambahkan script `"impact-check": "node scripts/impact-check.js"`.
  - `test/run-tests.js`: Menambahkan Suite 11 untuk memverifikasi CLI `audit-impact` dan `impact-check.js` (passing cases, threshold violation failure, and JSON output formatting).
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% PASS (0 errors, exit code 0).
  - `npm test`: 11/11 test suites PASS 100% tanpa defect.
  - `npm run diagnose`: 570 nodes, 3.127 edges, 115 files, 0 broken edges, 0 missing files (100% Healthy).
  - `npm run impact-check`: Berjalan sukses memvalidasi target perubahan kode dengan status PASS/FAIL yang akurat.

---

## 2026-08-18 — Workspace Auto-Discovery Non-Existent Path Guard & Synthesis Report Line Sync

- **Problem**: 
  1. `WorkspaceRegistry.detectProjectRoot(startPath)` melakukan upward crawl bahkan saat `startPath` tidak ada di disk, menyebabkan resolusi workspace ID invalid (seperti `invalid_xyz_123`) salah teresolusi ke direktori parent/cwd alih-alih me-reject error.
  2. `WorkspaceManager.resolveInstance(workspaceIdOrPath)` tidak memvalidasi keberadaan path di disk sebelum auto-detect project root saat query tidak cocok dengan ID/path terdaftar.
  3. Nomor baris pada Seksi 4 `docs/omnikb-4-pillars-synthesis-report.md` perlu disinkronkan dengan panjang baris file terbaru.
- **Fix**:
  - `src/core/workspace-registry.ts`: `detectProjectRoot` sekarang langsung me-return `null` jika `!fs.existsSync(path.resolve(startPath))`. `find()` diperketat agar hanya memanggil `findByPath` jika query memiliki separator path, bersifat absolut, atau ada di disk.
  - `src/core/workspace-manager.ts`: `resolveInstance` memverifikasi `fs.existsSync(resolved)` sebelum auto-detect root dan melempar error deskriptif `Workspace not found: '${workspaceIdOrPath}'` jika tidak ditemukan. `switchTo` juga disesuaikan agar menangani `null` detectedRoot secara aman.
  - `test/run-tests.js`: Menambahkan Suite 10.6 untuk memverifikasi penolakan resolusi workspace ID invalid dan pengecekan return null pada non-existent root path. Menambahkan clean `process.exit(0)` pada penyelesaian test.
  - `docs/omnikb-4-pillars-synthesis-report.md`: Sinkronisasi nomor baris dan rentang baris di Seksi 4 (`workspace-manager.ts: 1-350`, `workspace-registry.ts: 1-265`).
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% PASS (exit code 0).
  - `npm test`: 10/10 test suites PASS 100% tanpa defect.
  - `npm run diagnose`: 522 nodes, 2.960 edges, 105 files, 0 broken edges, 0 missing file references (100% Healthy).
  - Verifikasi live: `m.resolveInstance('invalid_xyz_123')` berhasil menolak dengan `Correctly rejected: Workspace not found: 'invalid_xyz_123'`.

---

## 2026-08-18 — Comprehensive 4-Pillars Architectural Deconstruction, Growth Analysis & Synthesis Master Report

- **Problem**: 
  1. Diperlukan riset mendalam mengenai 4 developer tools AI viral (`upstash/context7`, `abhigyanpatwari/GitNexus`, `colbymchenry/codegraph`, `Graphify-Labs/graphify`) untuk membedah arsitektur teknis, faktor adopsi ekosistem, dan keunggulan AST Knowledge Graph dibanding Vector RAG.
  2. Ketiadaan dokumen sintesis komprehensif yang memetakan korelasi langsung antara inovasi keempat tools tersebut dengan implementasi source code OmniKB serta moats unik kompetitif yang dimilikinya.
- **Fix**:
  - `docs/omnikb-4-pillars-synthesis-report.md`: Menulis master report arsitektur & sintesis 7 seksi mendalam yang membedah dekonstruksi 4 pilar pada 5 dimensi teknis (AST/Parsing, Storage/Indexing, Graph Algorithms/Blast Radius/PageRank, MCP Protocol Layer, Token Mechanics), analisis flywheel adopsi MCP (Claude Code, Cursor, Windsurf, Antigravity, OpenCode), mapping implementasi source code lengkap dengan nomor baris kode (`parser-ts-ast.ts`, `parser.ts`, `graph.ts`, `watcher.ts`, `storage.ts`, `mcp-server.ts`, `http-server.ts`, `workspace-manager.ts`, `setup-wizard.ts`, `integrations/`), 5 moats kompetitif OmniKB, benchmark token empiris, dan roadmap masa depan.
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% PASS (exit code 0).
  - `npm test`: 10/10 test suites PASS (100% zero-defect verification).
  - `npm run diagnose`: 367 unique nodes, 2,548 edges, 76 tracked source files, 0 broken edges, 0 missing files (100% healthy).
  - `npm run benchmark-tokens`: Terverifikasi penghematan token empiris sebesar 81.45% – 91.00% pada pengambilan konteks bedah on-demand (~10.500 token vs ~56.617 token naive dump).

---

## 2026-08-18 — Interactive Setup Wizard, Dynamic Memory Path & Root Drive Auto-Discovery

- **Problem**: 
  1. Pengguna baru harus melakukan konfigurasi manual yang rumit untuk menghubungkan MCP ke berbagai AI Agent (Claude Code, Antigravity, Cursor, Windsurf).
  2. Lokasi penyimpanan master memory/database OmniKB sebelumnya terkunci di direktori default (`~/.omnikb`).
  3. Safety guard pada file watcher sebelumnya mengabaikan root drive (`C:\`) sehingga project yang dibuat langsung di root tidak ter-auto-detect.
  4. Instalasi via `npm install -g github:...` gagal karena ketiadaan `prepare` script untuk build otomatis.
- **Fix**:
  - `src/core/config.ts`: Modul `GlobalConfig` untuk manajemen konfigurasi global dan pemilihan custom memory path (Otak Kedua).
  - `src/setup-wizard.ts`: Interactive Setup Wizard berbasis CLI untuk pemilihan lokasi memory dan auto-injection konfigurasi MCP ke AI Agents (Antigravity, Claude, Cursor, Windsurf).
  - `src/cli.ts`: Menambahkan command `omnikb setup` ke CLI router dan help menu.
  - `src/core/workspace-manager.ts`: Menghapus pembatasan root drive pada `GlobalDiscoveryWatcher` agar direktori root (seperti `C:\`) dapat dimonitor secara real-time.
  - `package.json`: Menambahkan `"prepare": "npm run build"` agar instalasi via Git otomatis mengompilasi TypeScript.
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% PASS.
  - `npm test`: 10/10 test suites PASS.
  - Verifikasi live daemon: Sukses mendeteksi dan mengindeks project di `C:\PembuktianFinal` dalam 15ms.

---

## 2026-08-18 — Full System Audit & Zero-Data-Loss Hardening (6 Critical Gaps Closed)

- **Problem**: Full audit mendalam dilakukan untuk mencari seluruh celah kegagalan yang dapat menyebabkan kode/file tidak terindeks atau hilang dari OmniKB saat membuat project baru atau berpindah direktori.
- **Identified & Fixed Gaps**:
  1. **Extension Gap**: `src/core/watcher.ts` sebelumnya belum mendaftarkan ekstensi `.dart`, `.vue`, `.svelte`, `.astro`, `.prisma`, `.php`, `.kt`, `.kts`, `.rb`, `.swift`, `.mts`, `.cts`, `.pyw` di `collectFiles()` meskipun parser-nya sudah ada. *(Fixed: Ditambahkan Set 35+ ekstensi multi-bahasa lengkap).*
  2. **Ignore Pattern Gap**: Pola direktori build modern (`.nuxt`, `.output`, `.turbo`, `.svelte-kit`, `.dart_tool`, `__pycache__`, `.venv`, `vendor`, `target`, `.gradle`, `obj`, `bin`) belum masuk ignore list default sehingga berisiko membebani watcher dengan ribuan file binary/cache. *(Fixed: 12 ignore patterns modern ditambahkan).*
  3. **Folder Creation Gap**: Saat user membuat folder baru (misal `src/components/`) dan memasukkan file ke dalamnya, `processPendingChanges` sebelumnya langsung `continue` tanpa men-scan isi subfolder tersebut. *(Fixed: Ditambahkan recursive directory scanning pada pending queue handler).*
  4. **Multi-Process Desync Gap**: `WorkspaceRegistry` sebelumnya hanya me-load `registry.json` saat instansiasi constructor sehingga proses MCP server yang sedang berjalan tidak mengetahui jika ada project baru yang di-register via CLI eksternal. *(Fixed: Real-time re-load otomatis pada seluruh operasi query & mutating registry).*
  5. **Crash-Resilient Atomic Storage Gap**: `storage.saveToDisk()` menulis langsung ke file target tanpa temporary swap, berisiko korupsi data jika proses terhenti di tengah write. *(Fixed: Diubah menjadi write ke `.tmp` file lalu di-rename secara atomik).*
  6. **Global Auto-Discovery Daemon**: Dibuat *background daemon* (`GlobalDiscoveryWatcher`) yang otomatis memonitor seluruh parent directory (seperti `C:\Ash-Workspace\`). Begitu user membuat folder baru dan menambahkan file (seperti `package.json`), OmniKB akan otomatis mendeteksi, meregistrasi, dan mengindeks project tersebut *secara real-time dan transparan*, tanpa perlu `omnikb register` atau perintah manual apapun.
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% bersih.
  - `npm test`: 10/10 test suites PASS.
  - `npm run precommit`: Seluruh audit security, build, test, dan graph integrity lolos bersih.

---

## 2026-08-18 — Universal Multi-Workspace Engine & Global Project Catalog

- **Problem**: OmniKB sebelumnya beroperasi secara *single-workspace* terisolasi (1 proses = 1 workspace root statis). Saat user berpindah ke project lain (seperti `C:\Ash-Workspace\Ash-Portofolio-main`), OmniKB tidak mengenali ataupun mengindeks project tersebut sehingga seluruh tool MCP tidak dapat mengakses konteks di luar project Knowledge-Base.
- **Fix**:
  - `src/types/index.ts`: Menambahkan schema `WorkspaceEntry` dan `WorkspaceRegistryData`.
  - `src/core/workspace-registry.ts`: Modul registry global tersimpan di `~/.omnikb/registry.json` untuk tracking seluruh workspace, pencarian path cerdas (`findByPath`), dan active workspace context.
  - `src/core/workspace-manager.ts`: Engine multi-workspace lazy-loaded dengan LRU eviction pool (max 5 workspace concurrent di RAM, data graph tetap persisten per-project di `.omnikb/`).
  - `src/server/mcp-server.ts`: Upgrade McpServer mendukung `WorkspaceManager`, penambahan parameter opsional `workspace` di seluruh query tools (`kb_explore`, `kb_impact`, `kb_search`, `kb_architecture`, `kb_god_nodes`, `kb_status`, `kb_sync`), serta 4 tools baru: `kb_workspaces`, `kb_register`, `kb_unregister`, `kb_switch`.
  - `src/server/http-server.ts`: Penambahan endpoint REST `/v1/workspaces*` dan routing multi-workspace pada seluruh endpoint.
  - `src/cli.ts`: Perluasan CLI dengan command `workspaces`, `register`, `unregister`, `switch`, dan auto-registration pada perintah `init` & `serve`.
  - `test/run-tests.js`: Penambahan Suite 9 & Suite 10 (10/10 test suites lolos 100%).
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% bersih.
  - `npm test`: 10/10 test suites PASS.
  - `npm run diagnose`: 0 broken edges, 0 missing files, 100% healthy.
  - Initial scan berhasil mengindeks `Ash-Portofolio-main`: **151 files, 561 nodes, 3750 edges** dalam 500ms.
  - Global catalog aktif melacak `Knowledge-Base` dan `Ash-Portofolio-main`.

---

## 2026-08-16 — Multi-Language Expansion Engine (6 New Dedicated Parsers)

- **Problem**: OmniKB membutuhkan dedicated parser tingkat lanjut untuk ekosistem Mobile (Dart/Flutter), Modern Frontend SFC (Vue/Svelte), Database Relational Graph (Prisma, SQL DDL), dan Enterprise Backend (Java/Kotlin Spring, PHP Laravel).
- **Fix**:
  - `src/core/parsers/dart.ts`: Dedicated Dart/Flutter parser (StatelessWidget/StatefulWidget, lifecycle `build`, Riverpod/Provider, GoRoute).
  - `src/core/parsers/sfc.ts`: Vue/Svelte Single File Component parser dengan delegasi TypeScript AST extractor pada blok `<script>`.
  - `src/core/parsers/prisma.ts`: Prisma schema parser memetakan `model`, `enum`, dan relasi `@relation` menjadi relational reference graph.
  - `src/core/parsers/sql.ts`: SQL DDL parser memetakan `CREATE TABLE` dan `FOREIGN KEY ... REFERENCES` menjadi graph entity database.
  - `src/core/parsers/jvm.ts`: Dedicated Java & Kotlin parser dengan deteksi annotation Spring Boot HTTP routes (`@RestController`, `@GetMapping`).
  - `src/core/parsers/php.ts`: Dedicated PHP & Laravel parser dengan ekstraksi `Route::get/post` dan relasi Eloquent (`hasMany`, `belongsTo`).
  - `src/core/parser.ts`: Registrasi seluruh parser ke multi-language dispatcher.
  - `test/run-tests.js`: Penambahan 6 skenario test suite untuk seluruh parser baru (10/10 bahasa lulus 100%).
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% bersih.
  - `npm test`: 8/8 suites & 10/10 parser tests PASS.
  - `npm run diagnose`: 0 broken edges, 0 missing files, 249 nodes, 1424 edges (100% healthy).
  - `npm run benchmark-tokens`: Efisiensi penghematan token mencapai **81.64%**.
  - `npm run precommit`: Seluruh audit security, build, test, dan graph integrity lolos bersih.

## 2026-08-16 — Workspace Scope Hardening & Zero-Defect State Verification

- **Problem**: 
  1. Peluncuran OmniKB MCP server dari client eksternal (Antigravity, Claude Desktop) tanpa argumen `--workspace` dapat menyebabkan pembacaan default `process.cwd()` ke folder instalasi client.
  2. CLI parser belum mendukung alias singkat `-w <path>`.
  3. Respon tool MCP `kb_status` dan `initialize` belum mengembalikan informasi path absolut `workspaceRoot` aktif.
- **Fix**:
  - `src/core/graph.ts`: Tambah getter `getWorkspaceRoot()` pada `GraphEngine`.
  - `src/cli.ts`: Dukung flag `-w` dan `--workspace <path>` secara deterministik.
  - `src/server/mcp-server.ts`: Sertakan path `workspaceRoot` pada instruksi `initialize` dan payload JSON respons tool `kb_status`.
- **Result**:
  - `npm run build`: Kompilasi TypeScript 100% bersih.
  - `npm test`: 8/8 test suites lulus.
  - `npm run diagnose`: 0 broken edges, 0 missing files, 100% healthy graph.
  - `npm run precommit`: Seluruh audit security, build, test, dan graph integrity lolos bersih.
  - `npm run release -- mayor`: Sukses rilis resmi **v1.4.0** ke GitHub (`ashhstr/omnikb`), tag & CHANGELOG.md ter-publish.

## 2026-08-16 — Full Repository Audit & Surgical Fixes (OmniKB 100% Zero-Defect)

- **Problem**:
  1. Watcher loop risk: `KNOWLEDGE_BASE.md` tidak ada di default `ignorePatterns` pada `src/core/watcher.ts`.
  2. CLI argument: flag `--workspace <path>` diabaikan oleh `src/cli.ts` sehingga gagal saat dipanggil dari luar cwd.
  3. Self-referencing edges: `TypeScriptParser` berbasis regex mencocokkan signature deklarasi fungsi sendiri sebagai call (`101` self-edges).
  4. Multi-language signature match: `ParserUtils.extractCallsFromBody` di Python, Go, Rust mencocokkan deklarasi fungsi pada start line.
  5. MCP spec compatibility: `mcp-server.ts` belum menangani method `ping` dan `notifications/initialized`.
  6. HTTP REST API ergonomics: Endpoint `/v1/explore`, `/v1/impact`, `/v1/search`, `/v1/god-nodes` hanya menerima POST body, gagal saat dipanggil via GET query string, serta belum memiliki limit ukuran payload.
- **Fix**:
  - `src/core/watcher.ts`: Tambah `'KNOWLEDGE_BASE.md'` ke default `ignorePatterns` dan cek di `shouldIgnore`.
  - `src/cli.ts`: Parse flag `--workspace` secara absolut.
  - `src/core/parsers/typescript.ts`: Delegasikan parsing ke `TypeScriptASTExtractor` (TypeScript Compiler API).
  - `src/core/parsers/types.ts`: Tambah proteksi `callee === callerName && callLine === startLine` pada `extractCallsFromBody`.
  - `src/server/mcp-server.ts`: Tambah handler `ping` dan `notifications/initialized`.
  - `src/server/http-server.ts`: Dukung parameter GET query string di semua action endpoint dan tambahkan limit ukuran payload (5MB).
- **Result**:
  - `npm run build`: Exit code 0 (bersih).
  - `npm test`: 8/8 suite PASS 100%.
  - `npm run diagnose`: 0 broken edges, 0 missing files, self-edges turun dari 101 ke 3 (rekursi murni).
  - `npm run precommit`: PASS 100% (Security, Build, Tests, Diagnosa bersih).

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