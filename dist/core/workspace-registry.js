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
exports.WorkspaceRegistry = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const config_1 = require("./config");
class WorkspaceRegistry {
    registryDir;
    registryFilePath;
    data = {
        version: 1,
        activeWorkspaceId: null,
        workspaces: [],
    };
    constructor(customRegistryDir) {
        this.registryDir = customRegistryDir || config_1.GlobalConfig.getMemoryPath();
        this.registryFilePath = path.join(this.registryDir, 'registry.json');
        this.load();
    }
    getRegistryFilePath() {
        return this.registryFilePath;
    }
    static generateId(rootPath) {
        const normalized = path.resolve(rootPath).toLowerCase().replace(/\\/g, '/');
        return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
    }
    load() {
        try {
            if (!fs.existsSync(this.registryFilePath)) {
                return;
            }
            const raw = fs.readFileSync(this.registryFilePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.workspaces)) {
                this.data = {
                    version: parsed.version || 1,
                    activeWorkspaceId: parsed.activeWorkspaceId || null,
                    workspaces: parsed.workspaces.map((w) => ({
                        ...w,
                        rootPath: path.resolve(w.rootPath),
                    })),
                };
            }
        }
        catch (err) {
            console.error(`[OmniKB Registry] Failed to load registry: ${err?.message || err}`);
        }
    }
    save() {
        try {
            if (!fs.existsSync(this.registryDir)) {
                fs.mkdirSync(this.registryDir, { recursive: true });
            }
            const jsonStr = JSON.stringify(this.data, null, 2);
            try {
                const tmpPath = `${this.registryFilePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
                fs.writeFileSync(tmpPath, jsonStr, 'utf8');
                try {
                    if (fs.existsSync(this.registryFilePath)) {
                        fs.unlinkSync(this.registryFilePath);
                    }
                }
                catch { }
                fs.renameSync(tmpPath, this.registryFilePath);
            }
            catch {
                // Safe direct fallback on Windows file-lock contention
                fs.writeFileSync(this.registryFilePath, jsonStr, 'utf8');
            }
        }
        catch (err) {
            console.error(`[OmniKB Registry] Failed to save registry: ${err?.message || err}`);
        }
    }
    register(rootPath, customName, stats) {
        this.load();
        const resolvedPath = path.resolve(rootPath);
        const id = WorkspaceRegistry.generateId(resolvedPath);
        const name = customName || path.basename(resolvedPath) || 'workspace';
        const existingIndex = this.data.workspaces.findIndex((w) => w.id === id || path.resolve(w.rootPath).toLowerCase() === resolvedPath.toLowerCase());
        const now = Date.now();
        const entry = {
            id,
            name,
            rootPath: resolvedPath,
            lastAccessed: now,
            totalNodes: stats?.totalNodes || 0,
            totalEdges: stats?.totalEdges || 0,
            totalFiles: stats?.totalFiles || 0,
        };
        if (existingIndex !== -1) {
            // Update existing entry while preserving stats if not provided
            const prev = this.data.workspaces[existingIndex];
            this.data.workspaces[existingIndex] = {
                ...prev,
                ...entry,
                name: customName || prev.name,
                totalNodes: stats?.totalNodes !== undefined ? stats.totalNodes : prev.totalNodes,
                totalEdges: stats?.totalEdges !== undefined ? stats.totalEdges : prev.totalEdges,
                totalFiles: stats?.totalFiles !== undefined ? stats.totalFiles : prev.totalFiles,
            };
        }
        else {
            this.data.workspaces.push(entry);
        }
        if (!this.data.activeWorkspaceId) {
            this.data.activeWorkspaceId = id;
        }
        this.save();
        return this.find(id);
    }
    unregister(idOrPathOrName) {
        this.load();
        const entry = this.find(idOrPathOrName);
        if (!entry)
            return false;
        this.data.workspaces = this.data.workspaces.filter((w) => w.id !== entry.id);
        if (this.data.activeWorkspaceId === entry.id) {
            this.data.activeWorkspaceId = this.data.workspaces.length > 0 ? this.data.workspaces[0].id : null;
        }
        this.save();
        return true;
    }
    setActive(idOrPathOrName) {
        this.load();
        const entry = this.find(idOrPathOrName);
        if (!entry)
            return null;
        entry.lastAccessed = Date.now();
        this.data.activeWorkspaceId = entry.id;
        this.save();
        return entry;
    }
    getActive() {
        this.load();
        if (!this.data.activeWorkspaceId) {
            if (this.data.workspaces.length > 0) {
                this.data.activeWorkspaceId = this.data.workspaces[0].id;
                this.save();
            }
            else {
                return null;
            }
        }
        const entry = this.data.workspaces.find((w) => w.id === this.data.activeWorkspaceId);
        if (!entry && this.data.workspaces.length > 0) {
            this.data.activeWorkspaceId = this.data.workspaces[0].id;
            this.save();
            return this.data.workspaces[0];
        }
        return entry || null;
    }
    find(idOrPathOrName) {
        if (!idOrPathOrName)
            return null;
        this.load();
        const trimmed = idOrPathOrName.trim();
        // 1. Match by ID
        const byId = this.data.workspaces.find((w) => w.id === trimmed);
        if (byId)
            return byId;
        // 2. Match by exact normalized path
        const resolved = path.resolve(trimmed).toLowerCase();
        const byPath = this.data.workspaces.find((w) => path.resolve(w.rootPath).toLowerCase() === resolved);
        if (byPath)
            return byPath;
        // 3. Match by name (case-insensitive)
        const byName = this.data.workspaces.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
        if (byName)
            return byName;
        // 4. Match closest ancestor workspace path
        if (trimmed.includes('/') || trimmed.includes('\\') || path.isAbsolute(trimmed) || fs.existsSync(path.resolve(trimmed))) {
            return this.findByPath(trimmed);
        }
        return null;
    }
    findByPath(targetPath) {
        if (!targetPath)
            return null;
        this.load();
        const resolvedTarget = path.resolve(targetPath).toLowerCase().replace(/\\/g, '/');
        // Sort by longest rootPath to find most specific nested workspace
        const sorted = [...this.data.workspaces].sort((a, b) => b.rootPath.length - a.rootPath.length);
        for (const ws of sorted) {
            const wsRoot = path.resolve(ws.rootPath).toLowerCase().replace(/\\/g, '/');
            if (resolvedTarget === wsRoot || resolvedTarget.startsWith(wsRoot + '/')) {
                return ws;
            }
        }
        return null;
    }
    list() {
        this.load();
        const activeId = this.getActive()?.id;
        return this.data.workspaces.map((w) => ({
            ...w,
            isCurrent: w.id === activeId,
        }));
    }
    updateStats(id, stats) {
        const entry = this.data.workspaces.find((w) => w.id === id);
        if (entry) {
            if (stats.totalNodes !== undefined)
                entry.totalNodes = stats.totalNodes;
            if (stats.totalEdges !== undefined)
                entry.totalEdges = stats.totalEdges;
            if (stats.totalFiles !== undefined)
                entry.totalFiles = stats.totalFiles;
            entry.lastAccessed = Date.now();
            this.save();
        }
    }
    /**
     * Prunes workspace entries whose root directories no longer exist on disk.
     * Returns list of pruned workspace identifiers.
     */
    pruneNonExistent() {
        this.load();
        const removed = [];
        const kept = [];
        for (const ws of this.data.workspaces) {
            if (fs.existsSync(ws.rootPath)) {
                kept.push(ws);
            }
            else {
                removed.push(ws.name || ws.id);
            }
        }
        if (removed.length > 0) {
            this.data.workspaces = kept;
            if (this.data.activeWorkspaceId && !kept.some((w) => w.id === this.data.activeWorkspaceId)) {
                this.data.activeWorkspaceId = kept.length > 0 ? kept[0].id : null;
            }
            this.save();
            console.log(`[OmniKB Registry] Auto-pruned ${removed.length} non-existent workspace(s): ${removed.join(', ')}`);
        }
        return removed;
    }
    /**
     * Discovers the project root directory from any file path by looking for project root markers
     */
    static detectProjectRoot(startPath) {
        if (!startPath)
            return null;
        const resolved = path.resolve(startPath);
        if (!fs.existsSync(resolved)) {
            return null;
        }
        let current = resolved;
        try {
            if (fs.statSync(current).isFile()) {
                current = path.dirname(current);
            }
        }
        catch {
            return null;
        }
        const markers = [
            'package.json',
            '.git',
            'pubspec.yaml',
            'Cargo.toml',
            'go.mod',
            'pom.xml',
            'build.gradle',
            'composer.json',
            'requirements.txt',
            'pyproject.toml',
            '.omnikb',
        ];
        let dir = current;
        while (dir && dir !== path.dirname(dir)) {
            for (const m of markers) {
                if (fs.existsSync(path.join(dir, m))) {
                    return dir;
                }
            }
            dir = path.dirname(dir);
        }
        return current;
    }
}
exports.WorkspaceRegistry = WorkspaceRegistry;
