# OmniKB Master Engineering, Commit & Release Standards

Dokumen standar operasional dan aturan mutlak untuk pengembangan, pemeliharaan, dan rilis versi repositori **OmniKB**.

---

## 🔒 1. Rules Commit (Aturan Mutlak Commit — Zero Tolerance)

Commit dilakukan selama proses pengembangan dan pemeliharaan internal.

| Rule | Deskripsi & Batasan |
| :--- | :--- |
| **1. OmniKB Scope Only** | Commit HANYA boleh berisi kode, konfigurasi, skrip, dan dokumentasi yang berkaitan langsung dengan engine OmniKB. Dilarang commit file proyek lain atau file pribadi di luar scope. |
| **2. Zero Leakage** | Dilarang keras melakukan commit atau staging terhadap API keys, password, tokens, `.env`, sertifikat/kunci privat (`.pem`, `.key`, `id_rsa`), database lokal (`.omnikb/`), atau data pribadi Ash. |
| **3. Clean & Compilable** | Kode wajib lolos kompilasi (`npm run build` / `tsc` 0 error) sebelum di-commit. Tidak boleh ada broken build di riwayat git. |
| **4. Atomic & Focused** | Satu commit untuk satu tujuan yang jelas. Pisahkan antara fitur, perbaikan bug, refactoring, dan dokumentasi. |
| **5. Conventional Messages** | Format pesan wajib baku: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`. Dilarang memakai pesan asal-asalan. |
| **6. Automated Pre-Commit** | Wajib lolos verifikasi gerbang lokal `npm run precommit` sebelum commit dibuat. |

---

## 📦 2. Rules Releases (Gerbang Mutlak Peluncuran Versi)

Rilis versi resmi (`v1.x.x`) **HANYA** boleh dilakukan jika aplikasi sudah benar-benar matang dan memenuhi 5 kriteria mutlak:

1. **0 Issue, 0 Bug, 0 Error**:
   - `npm run build` ➔ 0 error TypeScript.
   - `npm test` ➔ Lolos 100% (8/8 skenario verifikasi engine, parser, graph, REST, MCP).
   - `npm run diagnose` ➔ 0 internal broken edges (100% Graph Integrity).
2. **Berjalan Lancar Tanpa Celah**:
   - Auto-sync real-time lancar (<500ms debounce), tanpa memory leak, tanpa konflik file lock.
   - 100% Freshness Guarantee aktif via SHA-256 content hashing & deteksi disk staleness.
3. **Kompatibilitas Penuh Multi-Agent**:
   - 🤖 **Antigravity**: Protokol MCP stdio & semua tools (`kb_explore`, `kb_impact`, `kb_god_nodes`, `kb_sync`).
   - 🟣 **Claude / Claude Code**: Validasi schema JSON MCP payload & baris kode verbatim.
   - 🟢 **ChatGPT / Codex**: Endpoints REST API lokal berkecepatan tinggi (`/v1/explore`, `/v1/impact`, `/v1/god-nodes`).
   - 📄 **File-Based LLM (Aider / Manual Chat)**: Live `KNOWLEDGE_BASE.md` auto-update real-time.

---

## 🏷️ 3. Standar Penomoran Versi OmniKB

Sistem penomoran versi mengikuti aturan spesifik Ash yang telah dikunci di [`scripts/release.js`](file:///c:/Ash-Workspace/Knowledge-Base/scripts/release.js):

| Kategori Update | Posisi Angka yang Berubah | Contoh Kasus | Perintah Rilis CLI |
| :--- | :--- | :--- | :--- |
| **Minor** *(Perbaikan kecil / bugfix)* | **Paling Belakang** | `v1.3.1` ➔ **`v1.3.2`** | `npm run release -- minor`<br>*(atau `npm run release`)* |
| **Mayor** *(Fitur baru / update penting)* | **Bagian Tengah** | `v1.3.1` ➔ **`v1.4.0`** | `npm run release -- mayor` |
| **Besar-besaran** *(Overhaul arsitektur)* | **Paling Depan (Kiri)** | `v1.3.1` ➔ **`v2.0.0`** | `npm run release -- besar` |

---

## 🛡️ 4. Pengaman & Simulasi Rilis (`--dry-run`)

Sebelum benar-benar mempublikasikan rilis ke GitHub, selalu lakukan simulasi dengan flag `--dry-run`:

```bash
# Simulasi perbaikan kecil (angka belakang)
npm run release -- minor --dry-run

# Simulasi update fitur baru (angka tengah)
npm run release -- mayor --dry-run

# Simulasi overhaul arsitektur (angka depan)
npm run release -- besar --dry-run
```

Alur eksekusi saat rilis dijalankan:
1. Menjalankan test suite otomatis (`npm test`).
2. Menghitung kenaikan nomor versi di `package.json`.
3. Menulis ringkasan commit ke `CHANGELOG.md`.
4. Melakukan git commit dan git tag resmi (`vX.Y.Z`).
5. Melakukan push ke branch `main` beserta tags (`git push origin main --tags`).
6. Menerbitkan Release resmi di GitHub menggunakan **GitHub CLI (`gh release create`)**.
