# Contributing to OmniKB

Thank you for your interest in contributing to **OmniKB**! 🚀

OmniKB is an open-source, high-speed local code knowledge base and Graph RAG engine designed to unify multi-agent intelligence.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ashhstr/omnikb.git
   cd omnikb
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build TypeScript**:
   ```bash
   npm run build
   ```

4. **Run Verification Test Suite**:
   ```bash
   npm test
   ```

---

## 🧪 Guidelines

- **Zero External Runtime Dependencies**: OmniKB is designed to be ultra-lightweight and run anywhere with pure Node.js standard libraries.
- **Language Support**: When extending the AST parser (`src/core/parser.ts`), ensure new regex or syntax rules are backed by unit tests in `test/run-tests.js`.
- **Debounced Watcher**: Changes to the file watcher (`src/core/watcher.ts`) must maintain the `<500ms` debounce threshold and support native OS events with graceful directory-walk fallbacks.

---

## 📝 Pull Request Process

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. Commit your changes with clear commit messages.
3. Ensure all tests pass (`npm test`).
4. Push to your branch and open a Pull Request.

---

## 📜 License

By contributing to OmniKB, you agree that your contributions will be licensed under its [MIT License](LICENSE).
