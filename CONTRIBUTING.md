# OmniKB Engineering & Release Standards

Thank you for your interest in developing and maintaining **OmniKB**! 🚀

---

## 🔒 1. Strict Commit Policy

> [!IMPORTANT]
> **Git commits in this repository are strictly and exclusively reserved for the development, maintenance, and enhancement of the OmniKB knowledge engine.**
> - Never commit unrelated files, personal scratchpads, or third-party project files.
> - Never commit secrets, tokens, credentials, private keys, `.env` files, or personal environment configs.
> - Follow Conventional Commits format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

---

## 🎯 2. Release Gate & Zero-Tolerance Stability Criteria

A new release (minor, mayor, or major overhaul) may **ONLY** be published when the following criteria are 100% satisfied:

1. **0 Issues, 0 Bugs, 0 Runtime Errors**:
   - Zero compilation errors (`npm run build`).
   - Zero test failures across all 8 verification suites (`npm test`).
   - Zero broken edges or missing file references (`npm run diagnose`).
2. **Seamless Operation**:
   - Flawless background auto-sync without crashes, memory leaks, or file-lock conflicts.
   - 100% Freshness Guarantee verified by content-hashing and atomic reconciliation.
3. **Multi-Agent Protocol Compatibility**:
   - 🤖 **Antigravity**: Seamless MCP stdio protocol & tool invocation (`kb_explore`, `kb_impact`, `kb_god_nodes`, `kb_sync`).
   - 🟣 **Claude / Claude Code**: Full MCP tool schema compliance with rich JSON payload & verbatim lines.
   - 🟢 **ChatGPT / OpenAI Tools / Codex**: High-speed local REST API endpoints (`/v1/explore`, `/v1/impact`, `/v1/god-nodes`).
   - 📄 **File-Based Agents (Aider / Chat LLMs)**: Auto-updating real-time `KNOWLEDGE_BASE.md`.

---

## 🛠️ Verification & Quality Command

Before any commit or release, execute the automated pre-commit gate:

```bash
npm run precommit
```

To release a new version through the automated GitHub CLI pipeline:
```bash
# Minor update (bugfix / perbaikan kecil -> angka belakang)
npm run release -- minor

# Mayor update (fitur baru / update penting -> angka tengah)
npm run release -- mayor

# Major overhaul (update besar-besaran -> angka depan)
npm run release -- besar
```

---

## 📜 License
Licensed under the [MIT License](LICENSE).
