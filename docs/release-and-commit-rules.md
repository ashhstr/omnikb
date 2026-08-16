# 📜 OmniKB Standing Operating Rules: Commit & Release Standards

> **ZERO-TOLERANCE OPERATING CONTRACT**  
> Dokumen ini adalah aturan baku dan permanen untuk pengembangan, pemeliharaan, commit, dan peluncuran rilis repositori **OmniKB**.  
> Tidak ada toleransi untuk kelalaian atau pelanggaran terhadap aturan di bawah ini.

---

## 🔒 BAGIAN 1: ATURAN MUTLAK COMMIT (COMMIT RULES)

Commit adalah pencatatan perubahan bertahap untuk pengembangan dan pemeliharaan internal OmniKB.

1. **Eksklusivitas Ruang Lingkup (OmniKB Scope Only)**
   * Commit **HANYA** boleh memuat kode, dokumentasi, skrip, dan konfigurasi yang berkaitan langsung dengan OmniKB.
   * Dilarang keras memasukkan file proyek lain, catatan pribadi, file download, atau file sampah sistem.

2. **Nol Toleransi Kebocoran Data Pribadi (Zero Secret Leak)**
   * Dilarang keras men-stage atau meng-commit file sensitif:
     - File konfigurasi rahasia: `.env`, `.env.*`.
     - Kredensial, Private Keys, SSH Keys, SSL Certs (`.pem`, `.key`, `id_rsa`).
     - Token otentikasi, API Keys, dan personal access tokens.
     - Database lokal dan direktori cache internal (`.omnikb/`, `.cache/`).
   * Scanner keamanan lokal wajib dijalankan dan 100% bersih sebelum commit.

3. **Kode Wajib Lolos Kompilasi (No Broken Build)**
   * Dilarang melakukan commit pada kode yang memicu error kompilasi TypeScript (`npm run build`).
   * Kode harus selalu dalam keadaan stabil dan dapat di-build kapan saja.

4. **Atomic & Focused Changes**
   * Satu commit harus memiliki satu fokus tugas yang jelas. Pisahkan perbaikan bug, penambahan fitur, dan dokumentasi ke dalam commit terpisah.

5. **Format Pesan Standar (Conventional Commits)**
   * Wajib menggunakan format: `<type>: <deskripsi singkat>`
     - `feat:` Penambahan parser, algoritma, atau fitur baru.
     - `fix:` Perbaikan bug atau penanganan edge-case.
     - `refactor:` Restrukturisasi kode tanpa mengubah fungsionalitas.
     - `docs:` Pembaruan README, panduan, atau dokumentasi.
     - `chore:` Pemeliharaan tooling, konfigurasi, atau script pembantu.
   * Dilarang menggunakan pesan tidak informatif seperti: *"update"*, *"fix"*, *"wip"*, *"coba"*.

---

## 📦 BAGIAN 2: ATURAN MUTLAK RILIS (RELEASE RULES)

Rilis adalah publikasi versi resmi siap pakai ke GitHub yang menandai paket produksi yang stabil.

### 1. Kriteria Wajib Stabilitas (Release Gatekeeper)
Rilis **HANYA** boleh dilakukan jika sistem telah memenuhi 5 syarat mutlak:
* ✅ **0 Issue, 0 Bug, 0 Error**: Build bersih (`tsc`), 100% lulus 8 suite pengujian (`npm test`), dan 0 internal broken edges (`npm run diagnose`).
* ✅ **Berjalan Lancar Tanpa Celah**: Auto-sync berjalan mulus (<500ms debounce), tanpa memory leak, dan bebas konflik lock file.
* ✅ **100% Freshness Guarantee**: Verifikasi integritas disk hash aktif.
* ✅ **Kompatibel Penuh Multi-Agent**:
  - 🤖 **Antigravity**: Protokol MCP stdio & seluruh tools (`kb_explore`, `kb_impact`, `kb_god_nodes`, `kb_sync`).
  - 🟣 **Claude / Claude Code**: Validasi schema JSON MCP & penarikan kode verbatim.
  - 🟢 **ChatGPT & Codex**: Endpoint REST API berkecepatan tinggi (`/v1/explore`, `/v1/impact`, `/v1/god-nodes`).
  - 📄 **File-Based Agents**: Live `KNOWLEDGE_BASE.md` auto-update real-time.

---

### 2. Standar Penomoran Versi OmniKB

Penomoran versi mengikuti aturan khusus yang telah dikunci di [`scripts/release.js`](file:///c:/Ash-Workspace/Knowledge-Base/scripts/release.js):

| Kategori Update | Posisi Angka yang Berubah | Contoh Perubahan | Perintah CLI |
| :--- | :--- | :--- | :--- |
| **Minor (Perbaikan kecil / bugfix)** | **Paling Belakang (Kanan)** | `v1.3.1` ➔ **`v1.3.2`** | `npm run release -- minor`<br>*(atau `npm run release`)* |
| **Mayor (Fitur baru / update penting)** | **Bagian Tengah** | `v1.3.1` ➔ **`v1.4.0`** | `npm run release -- mayor` |
| **Besar-besaran (Overhaul arsitektur)** | **Paling Depan (Kiri)** | `v1.3.1` ➔ **`v2.0.0`** | `npm run release -- besar` |

---

### 3. Fitur Pengaman & Simulasi Rilis (`--dry-run`)
Sebelum benar-benar melakukan rilis, wajib atau disarankan untuk melakukan uji coba simulasi tanpa mengubah file apa pun:

```bash
# Simulasi perbaikan kecil (angka belakang)
npm run release -- minor --dry-run

# Simulasi update fitur penting (angka tengah)
npm run release -- mayor --dry-run

# Simulasi update besar-besaran (angka depan)
npm run release -- besar --dry-run
```

---

## 🚀 BAGIAN 3: PIPELINE EKSEKUSI RILIS OTOMATIS

Ketika `npm run release -- <minor|mayor|besar>` dijalankan, script rilis akan secara otomatis:
1. Menjalankan test suite komprehensif (`npm test`).
2. Menghitung SemVer baru dan memperbarui `package.json`.
3. Mengumpulkan commit riwayat dan menulis catatan ke `CHANGELOG.md`.
4. Melakukan `git commit` dan `git tag`.
5. Melakukan `git push origin main --tags`.
6. Mempublikasikan rilis resmi di GitHub menggunakan **GitHub CLI (`gh release create`)** beserta changelog markdown.
