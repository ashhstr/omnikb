# 🤝 Contributing to OmniKB

Thank you for your interest in contributing to **OmniKB**! 🚀

---

## 💻 1. Local Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/ashhstr/omnikb.git
cd omnikb

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run build

# 4. Link CLI globally for local testing
npm link
```

---

## 🧪 2. Quality Gates & Verification Commands

All contributions must pass 100% of our local quality gates before creating a Pull Request:

```bash
# 1. Typecheck and build TypeScript
npm run build

# 2. Run all 11 test suites
npm test

# 3. Check graph integrity (0 broken edges, 0 missing files)
npm run diagnose

# 4. Verify token savings benchmark (>80% - 90%+)
npm run benchmark-tokens

# 5. Run automated pre-commit security & quality gate
npm run precommit
```

---

## 🔒 3. Secret Protection & Git Commit Standards

> [!IMPORTANT]
> **Strict Secret Policy**: Never commit `.env`, private keys (`.pem`, `.key`), credentials, or tokens. The pre-commit gatekeeper automatically halts commits containing sensitive patterns.

Follow the **Conventional Commits** standard:
- `feat:` New AST parser, graph algorithm, or API endpoint
- `fix:` Bugfix in watcher, indexer, or MCP tool schema
- `refactor:` Code restructuring without functional changes
- `docs:` Documentation, work log, or README updates
- `chore:` Maintenance, scripts, or dependency updates

---

## 🚀 4. Automated Release Pipeline (Maintainers)

OmniKB uses an automated SemVer release pipeline:

```bash
# Patch / Bugfix (e.g. v1.5.0 -> v1.5.1)
npm run release -- minor

# Minor / Feature release (e.g. v1.5.0 -> v1.6.0)
npm run release -- mayor

# Major overhaul (e.g. v1.5.0 -> v2.0.0)
npm run release -- besar
```

---

## 📄 License
Licensed under the [MIT License](LICENSE).
