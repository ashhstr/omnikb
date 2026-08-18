"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceWatcher = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
class WorkspaceWatcher {
    config;
    parser;
    storage;
    graph;
    reporter;
    isRunning = false;
    debounceTimer = null;
    pendingFiles = new Set();
    fsWatchers = [];
    constructor(config, parser, storage, graph, reporter) {
        this.config = {
            debounceMs: 500,
            autoGenerateReport: true,
            autoGenerateVisual: true,
            ignorePatterns: [
                'node_modules',
                '.git',
                '.omnikb',
                'dist',
                'build',
                'out',
                '.next',
                '.nuxt',
                '.output',
                '.turbo',
                '.svelte-kit',
                '.dart_tool',
                'coverage',
                '.cache',
                '__pycache__',
                'venv',
                '.venv',
                'vendor',
                'target',
                '.gradle',
                'obj',
                'bin',
                '*.tmp',
                '*.log',
                'KNOWLEDGE_BASE.md',
            ],
            ...config,
        };
        this.parser = parser;
        this.storage = storage;
        this.graph = graph;
        this.reporter = reporter;
    }
    /**
     * Scans and indexes the entire workspace for the initial baseline
     */
    async initialScan() {
        console.log(`[OmniKB] Starting initial workspace scan at: ${this.config.rootPath}`);
        const startTime = Date.now();
        const allFiles = this.collectFiles(this.config.rootPath);
        console.log(`[OmniKB] Found ${allFiles.length} candidate files to index.`);
        let indexedCount = 0;
        for (const fullPath of allFiles) {
            const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const parseRes = this.parser.parseFile(relPath, content);
                const stats = fs.statSync(fullPath);
                const meta = {
                    path: relPath,
                    hash: parseRes.contentHash,
                    size: stats.size,
                    lastModified: stats.mtimeMs,
                    language: parseRes.language,
                    nodeCount: parseRes.nodes.length,
                    edgeCount: parseRes.edges.length,
                };
                this.storage.updateFileGraph(relPath, meta, parseRes.nodes, parseRes.edges);
                indexedCount++;
            }
            catch (err) {
                console.error(`[OmniKB] Failed to index ${relPath}: ${err?.message || err}`);
            }
        }
        // Remove stale files no longer present on disk
        const diskRelPathSet = new Set(allFiles.map((f) => path.relative(this.config.rootPath, f).replace(/\\/g, '/')));
        for (const storedRelPath of Array.from(this.storage.files.keys())) {
            if (!diskRelPathSet.has(storedRelPath)) {
                this.storage.removeFileFromGraph(storedRelPath);
            }
        }
        // Resolve cross-file references
        this.graph.resolveCrossFileReferences();
        // Save to disk
        await this.storage.saveToDisk();
        // Generate initial reports
        if (this.config.autoGenerateReport) {
            await this.reporter.generateMarkdownReport();
        }
        if (this.config.autoGenerateVisual) {
            await this.reporter.generateHtmlVisualizer();
        }
        const elapsed = Date.now() - startTime;
        const finalStats = this.graph.getStats();
        console.log(`[OmniKB] Initial indexing completed in ${elapsed}ms: ${finalStats.totalNodes} nodes, ${finalStats.totalEdges} edges.`);
        if (this.config.onSyncComplete) {
            this.config.onSyncComplete(finalStats);
        }
        return finalStats;
    }
    /**
     * Starts real-time file watcher with debounced auto-sync
     */
    startWatching() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        try {
            // Use recursive watch if supported by platform (Windows & macOS)
            const watcher = fs.watch(this.config.rootPath, { recursive: true }, (eventType, filename) => {
                if (!filename)
                    return;
                const normFile = filename.replace(/\\/g, '/');
                if (this.shouldIgnore(normFile))
                    return;
                this.onFileChanged(normFile);
            });
            this.fsWatchers.push(watcher);
            console.log(`[OmniKB Watcher] Active and monitoring for changes (debounce: ${this.config.debounceMs}ms)...`);
            // Attach Git HEAD / Branch Watcher if .git exists
            const gitDir = path.join(this.config.rootPath, '.git');
            const gitHeadPath = path.join(gitDir, 'HEAD');
            if (fs.existsSync(gitHeadPath)) {
                try {
                    const gitWatcher = fs.watch(gitHeadPath, () => {
                        console.log(`[OmniKB Git Watcher] .git/HEAD changed, triggering atomic branch reconciliation...`);
                        this.forceReconcile().catch((e) => console.error(`[OmniKB Git Watcher] Reconcile error:`, e));
                    });
                    this.fsWatchers.push(gitWatcher);
                    console.log(`[OmniKB Git Watcher] Monitoring .git/HEAD for branch checkouts/merges.`);
                }
                catch (err) {
                    console.warn(`[OmniKB Git Watcher] Could not attach git HEAD watcher: ${err?.message}`);
                }
            }
        }
        catch (err) {
            console.warn(`[OmniKB Watcher] Native recursive watch warning: ${err?.message}. Falling back to directory walk.`);
            this.watchDirectoriesRecursively(this.config.rootPath);
        }
    }
    /**
     * Performs an immediate atomic reconciliation of all files in the workspace,
     * detecting any out-of-sync files, mass deletions, or branch changes.
     */
    async forceReconcile() {
        console.log(`[OmniKB Reconcile] Triggering atomic full workspace reconciliation...`);
        const startTime = Date.now();
        const diskFiles = this.collectFiles(this.config.rootPath);
        const diskRelPathSet = new Set();
        let updatedCount = 0;
        let deletedCount = 0;
        // 1. Process all files on disk
        for (const fullPath of diskFiles) {
            const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
            diskRelPathSet.add(relPath);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory())
                    continue;
                const content = fs.readFileSync(fullPath, 'utf8');
                const hash = parser_1.CodeParser.computeHash(content);
                const existing = this.storage.files.get(relPath);
                if (!existing || existing.hash !== hash) {
                    const parseRes = this.parser.parseFile(relPath, content);
                    const meta = {
                        path: relPath,
                        hash,
                        size: stats.size,
                        lastModified: stats.mtimeMs,
                        language: parseRes.language,
                        nodeCount: parseRes.nodes.length,
                        edgeCount: parseRes.edges.length,
                    };
                    this.storage.updateFileGraph(relPath, meta, parseRes.nodes, parseRes.edges);
                    updatedCount++;
                }
            }
            catch (err) {
                console.error(`[OmniKB Reconcile] Failed to reconcile ${relPath}: ${err?.message || err}`);
            }
        }
        // 2. Remove files deleted on disk
        for (const storedRelPath of Array.from(this.storage.files.keys())) {
            if (!diskRelPathSet.has(storedRelPath)) {
                this.storage.removeFileFromGraph(storedRelPath);
                deletedCount++;
            }
        }
        // 3. Resolve references and persist
        this.graph.resolveCrossFileReferences();
        await this.storage.saveToDisk();
        if (this.config.autoGenerateReport) {
            await this.reporter.generateMarkdownReport();
        }
        if (this.config.autoGenerateVisual) {
            await this.reporter.generateHtmlVisualizer();
        }
        const elapsed = Date.now() - startTime;
        const finalStats = this.graph.getStats();
        console.log(`[OmniKB Reconcile] Reconciliation complete in ${elapsed}ms: ${updatedCount} updated, ${deletedCount} removed. (Total nodes: ${finalStats.totalNodes})`);
        if (this.config.onSyncComplete) {
            this.config.onSyncComplete(finalStats);
        }
        return finalStats;
    }
    /**
     * Stops the active file watchers
     */
    stopWatching() {
        this.isRunning = false;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        for (const watcher of this.fsWatchers) {
            try {
                watcher.close();
            }
            catch { }
        }
        this.fsWatchers = [];
        console.log(`[OmniKB Watcher] Stopped.`);
    }
    getPendingQueue() {
        return Array.from(this.pendingFiles);
    }
    onFileChanged(relativeFilePath) {
        this.pendingFiles.add(relativeFilePath);
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.processPendingChanges();
        }, this.config.debounceMs || 500);
    }
    /**
     * Incremental sync of only the changed files
     */
    async processPendingChanges() {
        const filesToProcess = Array.from(this.pendingFiles);
        this.pendingFiles.clear();
        if (filesToProcess.length === 0)
            return;
        const start = Date.now();
        let updatedCount = 0;
        let deletedCount = 0;
        for (const relPath of filesToProcess) {
            const fullPath = path.join(this.config.rootPath, relPath);
            if (!fs.existsSync(fullPath)) {
                // File was deleted
                this.storage.removeFileFromGraph(relPath);
                deletedCount++;
                continue;
            }
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    // If a new directory was created, collect and index its contained files
                    const nested = this.collectFiles(fullPath);
                    for (const n of nested) {
                        const nRel = path.relative(this.config.rootPath, n).replace(/\\/g, '/');
                        if (!this.shouldIgnore(nRel)) {
                            this.pendingFiles.add(nRel);
                        }
                    }
                    continue;
                }
                const content = fs.readFileSync(fullPath, 'utf8');
                const hash = parser_1.CodeParser.computeHash(content);
                // Check if content hash actually changed
                const existing = this.storage.files.get(relPath);
                if (existing && existing.hash === hash) {
                    continue; // Content identical, skip re-parsing
                }
                const parseRes = this.parser.parseFile(relPath, content);
                const meta = {
                    path: relPath,
                    hash,
                    size: stats.size,
                    lastModified: stats.mtimeMs,
                    language: parseRes.language,
                    nodeCount: parseRes.nodes.length,
                    edgeCount: parseRes.edges.length,
                };
                this.storage.updateFileGraph(relPath, meta, parseRes.nodes, parseRes.edges);
                updatedCount++;
            }
            catch (err) {
                console.error(`[OmniKB Watcher] Failed to re-parse ${relPath}: ${err?.message || err}`);
            }
        }
        if (updatedCount > 0 || deletedCount > 0) {
            // Re-resolve cross-file references
            this.graph.resolveCrossFileReferences();
            // Persist to disk
            await this.storage.saveToDisk();
            // Refresh Markdown report and Visualizer
            if (this.config.autoGenerateReport) {
                await this.reporter.generateMarkdownReport();
            }
            if (this.config.autoGenerateVisual) {
                await this.reporter.generateHtmlVisualizer();
            }
            const elapsed = Date.now() - start;
            const stats = this.graph.getStats();
            console.log(`[OmniKB Auto-Sync] Updated ${updatedCount} file(s), removed ${deletedCount} in ${elapsed}ms. (Total nodes: ${stats.totalNodes})`);
            if (this.config.onSyncComplete) {
                this.config.onSyncComplete(stats);
            }
        }
    }
    collectFiles(dir) {
        const results = [];
        if (!fs.existsSync(dir))
            return results;
        const supportedExts = new Set([
            '.ts', '.tsx', '.mts', '.cts',
            '.js', '.jsx', '.mjs', '.cjs',
            '.py', '.pyw',
            '.go',
            '.rs',
            '.dart',
            '.vue', '.svelte', '.astro',
            '.prisma',
            '.sql',
            '.kt', '.kts', '.java', '.cs',
            '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
            '.php',
            '.rb',
            '.swift',
            '.md', '.mdx', '.markdown',
            '.json',
            '.yaml', '.yml',
        ]);
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
            if (this.shouldIgnore(relPath))
                continue;
            if (entry.isDirectory()) {
                results.push(...this.collectFiles(fullPath));
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (supportedExts.has(ext)) {
                    results.push(fullPath);
                }
            }
        }
        return results;
    }
    watchDirectoriesRecursively(dir) {
        try {
            const watcher = fs.watch(dir, (eventType, filename) => {
                if (!filename)
                    return;
                const fullPath = path.join(dir, filename);
                const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
                if (!this.shouldIgnore(relPath)) {
                    this.onFileChanged(relPath);
                }
            });
            this.fsWatchers.push(watcher);
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = path.join(dir, entry.name);
                    const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
                    if (!this.shouldIgnore(relPath)) {
                        this.watchDirectoriesRecursively(fullPath);
                    }
                }
            }
        }
        catch { }
    }
    shouldIgnore(relPath) {
        const normPath = relPath.replace(/\\/g, '/');
        const parts = normPath.split('/');
        const ignoreList = this.config.ignorePatterns || [];
        if (normPath === 'KNOWLEDGE_BASE.md' || normPath.endsWith('/KNOWLEDGE_BASE.md')) {
            return true;
        }
        for (const pattern of ignoreList) {
            if (pattern.startsWith('*.')) {
                const ext = pattern.slice(1).toLowerCase();
                if (normPath.toLowerCase().endsWith(ext))
                    return true;
            }
            else if (parts.includes(pattern) || normPath === pattern) {
                return true;
            }
        }
        for (const part of parts) {
            if (part.startsWith('.') && (part === '.omnikb' || part === '.git' || part === '.vscode' || part === '.idea' || part === '.cache')) {
                return true;
            }
        }
        return false;
    }
}
exports.WorkspaceWatcher = WorkspaceWatcher;
