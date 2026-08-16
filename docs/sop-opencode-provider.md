# SOP — Pasang/ubah Provider AI di opencode (OpenAI-compatible)

Contoh kasus: HCN Sec. Berlaku untuk provider OpenAI-compatible lain (OpenRouter, Groq, dll).

## Prasyarat

- Config global: `C:\Users\user\.config\opencode\opencode.jsonc`
- opencode tidak hot-reload config → **wajib quit & restart** setelah edit.

## Langkah

1. **Dapatkan baseURL & model IDs** dari docs resmi provider (jangan tebak; verifikasi via `GET {baseURL}/v1beta/models` atau `/v1/models` dengan Bearer key).
2. **Simpan API key di env var** (jangan literal di config):
   ```powershell
   setx NAMA_KEY "sk-xxxx"   # persist ke registry, terbaca setelah restart opencode
   ```
3. **Tambah blok `provider`** di `opencode.jsonc`:
   ```jsonc
   "provider": {
     "nama": {
       "npm": "@ai-sdk/openai-compatible",
       "name": "Nama Tampilan",
       "options": { "baseURL": "https://.../v1", "apiKey": "{env:NAMA_KEY}" },
       "models": {
         "model-id": { "name": "Label", "tool_call": true }
       }
     }
   }
   ```
   Catatan: `tool_call: true` diperlukan agar model bisa pakai tools (file edit, bash, dll).
4. **Validasi JSON** sebelum restart (editor dengan JSONC support / `ConvertFrom-Json`).
5. **Restart opencode**, lalu `/model` untuk pilih model.

## Troubleshooting

- **Model not found** → ID salah; cek `GET /v1beta/models` (docs HCN Sec: `https://api.hcnsec.cn/`).
- **Auth gagal (401)** → pastikan env var terbaca; restart total opencode.
- **Tool call tidak jalan** → cek `tool_call: true` di model config.

## Quality Check

- Setelah restart, `/model` menampilkan provider & model yang didaftarkan.
- Satu test prompt dengan tool usage (mis. minta baca file) berhasil tanpa error.