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
exports.WorkspaceManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workspace_registry_1 = require("./workspace-registry");
const parser_1 = require("./parser");
const storage_1 = require("./storage");
const graph_1 = require("./graph");
const reporter_1 = require("./reporter");
const watcher_1 = require("./watcher");
class WorkspaceManager {
    registry;
    instances = new Map();
    maxLoadedWorkspaces;
    parser;
    discoveryWatcher;
    constructor(registry, maxLoadedWorkspaces = 20) {
        this.registry = registry || new workspace_registry_1.WorkspaceRegistry();
        this.maxLoadedWorkspaces = Math.max(1, maxLoadedWorkspaces);
        this.parser = new parser_1.CodeParser();
        this.discoveryWatcher = new GlobalDiscoveryWatcher(this);
        this.discoveryWatcher.start();
    }
    getRegistry() {
        return this.registry;
    }
    getLoadedInstances() {
        return Array.from(this.instances.values());
    }
    /**
     * Starts universal real-time watchers for ALL valid registered workspaces.
     * Automatically prunes non-existent paths and keeps all workspaces in 100% sync.
     */
    async startUniversalWatch(autoScan = false) {
        this.registry.pruneNonExistent();
        const workspaces = this.registry.list();
        const loaded = [];
        for (const ws of workspaces) {
            try {
                if (!fs.existsSync(ws.rootPath))
                    continue;
                const inst = await this.getOrLoad(ws.id, autoScan);
                loaded.push(inst);
            }
            catch (err) {
                console.warn(`[OmniKB Universal Watcher] Could not load workspace '${ws.name}': ${err?.message || err}`);
            }
        }
        console.log(`[OmniKB Universal Watcher] Active monitoring across ${loaded.length} workspace(s) simultaneously.`);
        return loaded;
    }
    /**
     * Triggers atomic full reconciliation across all loaded workspaces concurrently.
     */
    async reconcileAll() {
        const instances = Array.from(this.instances.values());
        const results = await Promise.all(instances.map(async (inst) => {
            const stats = await inst.watcher.forceReconcile();
            return { workspace: inst.entry.rootPath, stats };
        }));
        return results;
    }
    /**
     * Resolves a workspace instance by identifier or falls back to active/cwd
     */
    async resolveInstance(workspaceIdOrPath) {
        if (workspaceIdOrPath && workspaceIdOrPath.trim()) {
            const trimmed = workspaceIdOrPath.trim();
            const existing = this.registry.find(trimmed);
            if (existing) {
                return this.getOrLoad(existing.id);
            }
            const resolved = path.resolve(trimmed);
            if (!fs.existsSync(resolved)) {
                throw new Error(`Workspace not found: '${workspaceIdOrPath}'`);
            }
            // Check if workspaceIdOrPath is a path or file on disk and auto-detect project root
            const detectedRoot = workspace_registry_1.WorkspaceRegistry.detectProjectRoot(resolved);
            if (detectedRoot && fs.existsSync(detectedRoot)) {
                const stats = fs.statSync(detectedRoot);
                if (stats.isDirectory()) {
                    return this.registerAndLoad(detectedRoot, undefined, true);
                }
            }
            throw new Error(`Workspace not found: '${workspaceIdOrPath}'`);
        }
        // No param: return active workspace
        const active = this.registry.getActive();
        if (active) {
            return this.getOrLoad(active.id);
        }
        // If registry is completely empty, auto-register process.cwd()
        const cwd = process.cwd();
        return this.registerAndLoad(cwd);
    }
    /**
     * Loads an existing registered workspace into memory (with LRU eviction if full)
     */
    async getOrLoad(idOrPathOrName, autoScan = false) {
        let entry = this.registry.find(idOrPathOrName);
        if (!entry) {
            // Check if it's a directory on disk that can be auto-registered
            if (fs.existsSync(idOrPathOrName)) {
                return this.registerAndLoad(idOrPathOrName, undefined, true);
            }
            throw new Error(`Workspace '${idOrPathOrName}' is not registered in OmniKB.`);
        }
        // If already loaded in memory
        const existingInstance = this.instances.get(entry.id);
        if (existingInstance) {
            existingInstance.lastUsedAt = Date.now();
            return existingInstance;
        }
        // Evict least recently used instance if capacity reached
        if (this.instances.size >= this.maxLoadedWorkspaces) {
            this.evictLRU();
        }
        // Instantiate triad for this workspace root
        const rootPath = entry.rootPath;
        const storage = new storage_1.KnowledgeStorage(rootPath);
        await storage.init();
        const graph = new graph_1.GraphEngine(rootPath, storage);
        const reporter = new reporter_1.KnowledgeReporter(rootPath, storage, graph);
        const watcher = new watcher_1.WorkspaceWatcher({
            rootPath,
            debounceMs: 400,
            autoGenerateReport: true,
            autoGenerateVisual: true,
        }, this.parser, storage, graph, reporter);
        // If no nodes in storage or explicitly requested, run initial scan
        if (storage.nodes.size === 0 || autoScan) {
            const stats = await watcher.initialScan();
            this.registry.updateStats(entry.id, {
                totalNodes: stats.totalNodes,
                totalEdges: stats.totalEdges,
                totalFiles: stats.totalFiles,
            });
        }
        else {
            graph.resolveCrossFileReferences();
        }
        watcher.startWatching();
        const now = Date.now();
        const instance = {
            entry,
            storage,
            graph,
            watcher,
            reporter,
            loadedAt: now,
            lastUsedAt: now,
        };
        this.instances.set(entry.id, instance);
        this.registry.setActive(entry.id);
        return instance;
    }
    /**
     * Registers a new workspace and loads it immediately
     */
    async registerAndLoad(rootPath, customName, autoScan = true) {
        const resolvedPath = path.resolve(rootPath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Directory does not exist: ${resolvedPath}`);
        }
        const entry = this.registry.register(resolvedPath, customName);
        return this.getOrLoad(entry.id, autoScan);
    }
    /**
     * Switches the active workspace
     */
    async switchTo(idOrPathOrName) {
        let entry = this.registry.find(idOrPathOrName);
        if (!entry) {
            const resolved = path.resolve(idOrPathOrName);
            if (fs.existsSync(resolved)) {
                const detectedRoot = workspace_registry_1.WorkspaceRegistry.detectProjectRoot(resolved);
                if (detectedRoot && fs.existsSync(detectedRoot) && fs.statSync(detectedRoot).isDirectory()) {
                    return this.registerAndLoad(detectedRoot, undefined, true);
                }
            }
            throw new Error(`Cannot switch: workspace '${idOrPathOrName}' not found on disk or in registry.`);
        }
        this.registry.setActive(entry.id);
        return this.getOrLoad(entry.id);
    }
    /**
     * Unregisters a workspace and unloads it if in memory
     */
    async unregister(idOrPathOrName) {
        const entry = this.registry.find(idOrPathOrName);
        if (!entry)
            return false;
        const loaded = this.instances.get(entry.id);
        if (loaded) {
            loaded.watcher.stopWatching();
            this.instances.delete(entry.id);
        }
        return this.registry.unregister(entry.id);
    }
    /**
     * Evicts the least recently used workspace instance from memory
     */
    evictLRU() {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, inst] of this.instances.entries()) {
            if (inst.lastUsedAt < oldestTime) {
                oldestTime = inst.lastUsedAt;
                oldestId = id;
            }
        }
        if (oldestId) {
            const inst = this.instances.get(oldestId);
            if (inst) {
                inst.watcher.stopWatching();
                this.instances.delete(oldestId);
            }
        }
    }
    /**
     * Disposes all loaded watchers and resources on shutdown
     */
    dispose() {
        if (this.discoveryWatcher) {
            this.discoveryWatcher.dispose();
        }
        for (const inst of this.instances.values()) {
            inst.watcher.stopWatching();
        }
        this.instances.clear();
    }
}
exports.WorkspaceManager = WorkspaceManager;
class GlobalDiscoveryWatcher {
    manager;
    basePaths = new Set();
    watchers = new Map();
    pendingChecks = new Map();
    constructor(manager) {
        this.manager = manager;
    }
    start() {
        this.refreshBasePaths();
        // Re-check periodically in case new base paths emerge
        setInterval(() => this.refreshBasePaths(), 15000).unref();
    }
    refreshBasePaths() {
        const workspaces = this.manager.getRegistry().list();
        const newBasePaths = new Set();
        for (const ws of workspaces) {
            try {
                if (!fs.existsSync(ws.rootPath))
                    continue;
                const parentDir = path.dirname(ws.rootPath);
                if (parentDir) {
                    newBasePaths.add(parentDir);
                }
            }
            catch (e) {
                // Ignore errors accessing root paths
            }
        }
        // Start watching new base paths
        for (const base of newBasePaths) {
            if (!this.basePaths.has(base)) {
                this.basePaths.add(base);
                this.watchBase(base);
            }
        }
    }
    watchBase(basePath) {
        try {
            const watcher = fs.watch(basePath, (eventType, filename) => {
                if (!filename)
                    return;
                const fullPath = path.join(basePath, filename);
                // Debounce checks for newly created directories
                if (this.pendingChecks.has(fullPath)) {
                    clearTimeout(this.pendingChecks.get(fullPath));
                }
                const timer = setTimeout(() => {
                    this.pendingChecks.delete(fullPath);
                    this.checkAndAutoRegister(fullPath);
                }, 3000); // Wait 3 seconds to allow user to run `npm init` or `git init`
                this.pendingChecks.set(fullPath, timer);
            });
            this.watchers.set(basePath, watcher);
            console.log(`[OmniKB Global Auto-Discovery] Now monitoring base directory: ${basePath}`);
        }
        catch (err) {
            console.warn(`[OmniKB] Could not watch base directory ${basePath}: ${err.message}`);
        }
    }
    async checkAndAutoRegister(dirPath) {
        try {
            if (!fs.existsSync(dirPath))
                return;
            const stats = fs.statSync(dirPath);
            if (!stats.isDirectory())
                return;
            // Check if it's already registered
            if (this.manager.getRegistry().findByPath(dirPath)) {
                return;
            }
            const markers = [
                'package.json', '.git', 'pubspec.yaml', 'Cargo.toml', 'go.mod',
                'pom.xml', 'build.gradle', 'composer.json', 'requirements.txt', 'pyproject.toml'
            ];
            let isProject = false;
            for (const m of markers) {
                if (fs.existsSync(path.join(dirPath, m))) {
                    isProject = true;
                    break;
                }
            }
            if (isProject) {
                console.log(`[OmniKB Global Auto-Discovery] Detected new project at: ${dirPath}`);
                await this.manager.registerAndLoad(dirPath, undefined, true);
                console.log(`[OmniKB Global Auto-Discovery] Auto-registered & indexed: ${dirPath}`);
            }
        }
        catch { }
    }
    dispose() {
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
        for (const timer of this.pendingChecks.values()) {
            clearTimeout(timer);
        }
        this.pendingChecks.clear();
    }
}
