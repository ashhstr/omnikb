# 🌐 OmniKB: Universal Real-Time Code Knowledge Base & Graph Intelligence Engine

**OmniKB** adalah sistem Knowledge Base dan Code Graph lokal berkecepatan tinggi yang dirancang untuk memberikan pemahaman arsitektur instan ke **AI Agent apapun** (Antigravity, Cursor, Claude Code, Windsurf, Codex, Gemini CLI, Aider, Copilot, Python scripts/LangChain, maupun REST/cURL).

Sistem ini menggabungkan keunggulan 4 ekosistem ternama:
- ⚡ **`codegraph`**: File watcher tingkat OS dengan debounced auto-sync (<500ms) dan local SQLite/inverted index.
- 🕸️ **`GitNexus`**: Zero-server Graph RAG, cross-file reference resolution, dan kalkulasi *blast radius*.
- 📊 **`graphify`**: Deteksi arsitektur (*God Nodes* / *high coupling*), dokumentasi multimodal, dan visualizer interaktif D3/SVG standalone.
- 🎯 **`context7`**: Protokol injeksi context dinamis melalui MCP, REST API lokal, CLI, dan markdown auto-save.

---

## 🚀 Fitur Utama

1. **Auto-Save & Auto-Update Real-Time**:
   - Memantau setiap perubahan file (create, edit, delete) menggunakan native OS file watcher.
   - Debounce buffer cerdas (400ms) dan incremental delta hashing: hanya me-reparse file yang benar-benar berubah tanpa me-reindex seluruh project.
2. **Universal Multi-Agent Access**:
   - **MCP Protocol (`stdio` & SSE)**: Terintegrasi dengan Antigravity, Claude Code, Cursor, Windsurf, Codex, Gemini.
   - **Local REST API (`http://127.0.0.1:7890`)**: Dapat dipanggil oleh script Python, LangChain, cURL, Ollama, OpenAI-compatible functions, atau browser.
   - **Direct Markdown Auto-Sync**: Menghasilkan `KNOWLEDGE_BASE.md` yang selalu *fresh* di root project untuk AI agent berbasis pembacaan file biasa.
3. **Surgical Context Retrieval (`kb_explore`)**:
   - Mengambil definisi simbol, relasi caller/callee, blast radius, dan kode baris bernomor persis dalam 1 langkah panggilan tanpa menghabiskan token window.
4. **Impact & Blast Radius Analysis (`kb_impact`)**:
   - Menghitung risiko regresi (*risk score*: LOW/MEDIUM/HIGH/CRITICAL) dan daftar file serta HTTP routes yang terdampak sebelum melakukan refactoring.
5. **Interactive D3 Visualizer**:
   - Menghasilkan `.omnikb/graph.html` interaktif untuk mengeksplorasi graph, cluster dependensi, dan mencari simbol secara visual di browser.

---

## 📦 Cara Menjalankan

### 1. Inisialisasi Proyek
```bash
node dist/cli.js init
```
Perintah ini akan memindai workspace, membangun index awal, membuat file `.omnikb/knowledge-graph.json`, `.omnikb/graph.html`, dan `KNOWLEDGE_BASE.md`.

### 2. Menjalankan Server Universal (MCP + REST API + Auto-Watcher)
```bash
node dist/cli.js serve --port 7890
```
- **REST API**: `http://127.0.0.1:7890`
- **Interactive Visualizer**: `http://127.0.0.1:7890/visual`
- **Live Markdown**: `KNOWLEDGE_BASE.md`

### 3. Perintah CLI Tambahan
```bash
# Eksplorasi simbol kode (caller, callee, verbatim code)
node dist/cli.js explore calculateImpact

# Periksa blast radius sebelum refactor
node dist/cli.js impact storage.ts

# Cari simbol / teks dengan index FTS
node dist/cli.js search "parser"

# Mode watcher saja di terminal
node dist/cli.js watch
```

---

## 🔌 Panduan Integrasi ke Berbagai AI Agent

### 1. Integrasi MCP (Antigravity, Cursor, Claude Code, Windsurf)
Tambahkan ke konfigurasi MCP Anda (`mcp.json` / `settings.json`):

```json
{
  "mcpServers": {
    "omnikb": {
      "command": "node",
      "args": ["C:/Users/user/.gemini/antigravity/scratch/omnikb/dist/cli.js", "serve", "--mcp"]
    }
  }
}
```

**Daftar Tool MCP yang Tersedia:**
- `kb_explore(query, maxDepth)`: Mengambil konteks bedah simbol dan alur kode dalam 1 kali call (dilengkapi `freshness` metadata & hash verifikasi).
- `kb_impact(target, maxDepth)`: Menganalisis risiko perubahan dan file/route yang terdampak.
- `kb_search(query, limit)`: Pencarian token simbol dan teks super cepat.
- `kb_architecture()`: Mendapatkan metrik arsitektur, God Nodes, dan route map.
- `kb_status()`: Memeriksa status real-time file watcher dan antrean sinkronisasi.
- `kb_sync(force)`: Memaksa rekonsiliasi atomik seluruh workspace untuk garansi 100% *freshness*.

---

### 2. Integrasi Local REST API (Python, LangChain, cURL, AI Custom)

**Endpoint yang Tersedia di `http://127.0.0.1:7890`:**

#### A. Explore Symbol (`POST /v1/explore`)
```bash
curl -X POST http://127.0.0.1:7890/v1/explore \
  -H "Content-Type: application/json" \
  -d '{"query": "CodeParser", "maxDepth": 3}'
```

#### B. Calculate Impact / Blast Radius (`POST /v1/impact`)
```bash
curl -X POST http://127.0.0.1:7890/v1/impact \
  -H "Content-Type: application/json" \
  -d '{"target": "UserService"}'
```

#### C. Force Reconcile / Sync (`POST /v1/sync`)
```bash
curl -X POST http://127.0.0.1:7890/v1/sync
```

#### D. Ambil Prompt Context Siap Pakai (`GET /v1/context`)
```bash
curl http://127.0.0.1:7890/v1/context
```

#### D. Python Example (RAG / Agent Hook)
```python
import requests

def get_code_context(symbol_name: str):
    res = requests.post("http://127.0.0.1:7890/v1/explore", json={"query": symbol_name})
    return res.json()

context = get_code_context("calculateImpact")
print("Target Node:", context["targetNodes"])
print("Blast Radius:", context["impactRadius"])
```

---

### 3. Integrasi Agen Berbasis File (Aider / Chat LLM Standar)
Setiap kali Anda atau AI mengedit kode, file `KNOWLEDGE_BASE.md` di root direktori akan **langsung terupdate otomatis** oleh watcher. Agen yang hanya membaca file dapat langsung membaca `KNOWLEDGE_BASE.md` untuk memahami struktur seluruh repositori tanpa perlu tool khusus.

---

## 🧪 Verifikasi & Testing
Jalankan unit test suite mandiri:
```bash
node test/run-tests.js
```
