# docs/ — Knowledge Hub

Semua file di folder ini otomatis ter-index oleh OmniKB (sebagai `doc_section`), jadi bisa di-recall kapan pun via `kb_search` / `kb_explore` di sesi mana pun.

## Struktur

| File | Isi |
|---|---|
| `installation-and-setup-guide.md` | Panduan lengkap instalasi, MCP wiring (Antigravity, Cursor, Claude, Windsurf), REST API & troubleshooting |
| `work-log.md` | Riwayat kerja kronologis: keputusan, fix, integrasi, verifikasi |
| `roadmap.md` | Rencana jangka pendek/menengah: OmniKB, opencode, skill development |
| `sop-opencode-provider.md` | SOP pasang/ubah provider AI di opencode (contoh: HCN Sec) |
| `release-and-commit-rules.md` | Kontrak Git conventional commit, SemVer automation, dan GitHub release pipeline |

## Aturan Pakai

1. **Setiap kerjaan penting** → tambah entri baru di `work-log.md` (format: `## YYYY-MM-DD — <judul>`).
2. **Roadmap berubah** → update `roadmap.md`, tandai yang sudah selesai.
3. **SOP ditemukan berulang** → simpan sebagai SOP baru di `docs/`, bukan di work-log.