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
exports.KnowledgeStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class KnowledgeStorage {
    dbDir;
    dbFilePath;
    nodes = new Map();
    edges = new Map();
    files = new Map();
    lastUpdated = Date.now();
    // Inverted indexes for instant retrieval
    symbolIndex = new Map(); // SymbolName -> Set of Node IDs
    fileNodesIndex = new Map(); // FilePath -> Set of Node IDs
    fileEdgesIndex = new Map(); // FilePath -> Set of Edge IDs
    tokenIndex = new Map(); // Token -> Set of Node IDs
    constructor(workspaceRoot) {
        this.dbDir = path.join(workspaceRoot, '.omnikb');
        this.dbFilePath = path.join(this.dbDir, 'knowledge-graph.json');
    }
    /**
     * Initializes storage directory and loads existing graph state if present
     */
    async init() {
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
        this.loadFromDisk();
    }
    /**
     * Loads persisted graph from disk
     */
    loadFromDisk() {
        if (!fs.existsSync(this.dbFilePath)) {
            return false;
        }
        try {
            const raw = fs.readFileSync(this.dbFilePath, 'utf8');
            const data = JSON.parse(raw);
            this.clearInMemory();
            this.lastUpdated = data.lastUpdated || Date.now();
            // Restore files
            for (const [filePath, meta] of Object.entries(data.files)) {
                this.files.set(filePath, meta);
            }
            // Restore nodes
            for (const node of data.nodes) {
                this.insertNodeInMemory(node);
            }
            // Restore edges
            for (const edge of data.edges) {
                this.insertEdgeInMemory(edge);
            }
            return true;
        }
        catch (err) {
            console.error(`[OmniKB Storage] Failed to load cached index: ${err?.message || err}`);
            return false;
        }
    }
    /**
     * Atomically saves current in-memory graph to disk
     */
    async saveToDisk() {
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
        const now = Date.now();
        this.lastUpdated = now;
        const dump = {
            version: 1,
            lastUpdated: now,
            files: Object.fromEntries(this.files),
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
        };
        const tempPath = `${this.dbFilePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        const jsonStr = JSON.stringify(dump, null, 2);
        try {
            await fs.promises.writeFile(tempPath, jsonStr, 'utf8');
            try {
                await fs.promises.rename(tempPath, this.dbFilePath);
            }
            catch (renameErr) {
                // Fallback for Windows EPERM/EBUSY
                await fs.promises.copyFile(tempPath, this.dbFilePath);
                await fs.promises.unlink(tempPath).catch(() => { });
            }
        }
        catch (err) {
            console.error(`[OmniKB Storage] Failed to write index: ${err?.message || err}`);
        }
    }
    /**
     * Updates graph state for a single file (incremental delta update)
     */
    updateFileGraph(filePath, meta, newNodes, newEdges) {
        // 1. Remove old nodes and edges belonging to this file
        this.removeFileFromGraph(filePath);
        // 2. Set new file metadata
        this.files.set(filePath, meta);
        // 3. Add new nodes
        for (const node of newNodes) {
            this.insertNodeInMemory(node);
        }
        // 4. Add new edges
        for (const edge of newEdges) {
            this.insertEdgeInMemory(edge);
        }
    }
    /**
     * Removes a file and all its associated nodes & edges
     */
    removeFileFromGraph(filePath) {
        const nodeIds = this.fileNodesIndex.get(filePath);
        if (nodeIds) {
            for (const nodeId of nodeIds) {
                const node = this.nodes.get(nodeId);
                if (node) {
                    // Remove from symbol index
                    const symSet = this.symbolIndex.get(node.name.toLowerCase());
                    if (symSet) {
                        symSet.delete(nodeId);
                        if (symSet.size === 0)
                            this.symbolIndex.delete(node.name.toLowerCase());
                    }
                    // Remove from token index
                    this.removeNodeTokens(node);
                }
                this.nodes.delete(nodeId);
            }
            this.fileNodesIndex.delete(filePath);
        }
        const edgeIds = this.fileEdgesIndex.get(filePath);
        if (edgeIds) {
            for (const edgeId of edgeIds) {
                this.edges.delete(edgeId);
            }
            this.fileEdgesIndex.delete(filePath);
        }
        this.files.delete(filePath);
    }
    /**
     * Fast full-text & symbol token search
     */
    search(query, limit = 20) {
        const rawTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
        if (rawTerms.length === 0)
            return [];
        const scores = new Map();
        for (const term of rawTerms) {
            // 1. Exact & partial symbol matches (High Priority)
            for (const [sym, nodeIds] of this.symbolIndex.entries()) {
                if (sym === term) {
                    for (const id of nodeIds) {
                        const current = scores.get(id) || { score: 0, matchType: 'exact_name' };
                        current.score += 50;
                        current.matchType = 'exact_name';
                        scores.set(id, current);
                    }
                }
                else if (sym.includes(term)) {
                    for (const id of nodeIds) {
                        const current = scores.get(id) || { score: 0, matchType: 'partial_name' };
                        current.score += 20;
                        scores.set(id, current);
                    }
                }
            }
            // 2. Inverted token index (FTS match)
            for (const [token, nodeIds] of this.tokenIndex.entries()) {
                if (token.startsWith(term)) {
                    for (const id of nodeIds) {
                        const current = scores.get(id) || { score: 0, matchType: 'fts_content' };
                        current.score += 5;
                        scores.set(id, current);
                    }
                }
            }
        }
        // Sort by score descending
        const sorted = Array.from(scores.entries())
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, limit);
        return sorted
            .map(([nodeId, info]) => {
            const node = this.nodes.get(nodeId);
            if (!node)
                return null;
            return {
                nodes: [node],
                score: info.score,
                matchType: info.matchType,
                highlight: node.signature || node.name,
            };
        })
            .filter((r) => r !== null);
    }
    /**
     * Find nodes matching symbol name
     */
    findNodesByName(name) {
        const key = name.toLowerCase();
        const nodeIds = this.symbolIndex.get(key);
        if (!nodeIds)
            return [];
        return Array.from(nodeIds)
            .map((id) => this.nodes.get(id))
            .filter((n) => n !== undefined);
    }
    insertNodeInMemory(node) {
        this.nodes.set(node.id, node);
        // Symbol index
        const symKey = node.name.toLowerCase();
        if (!this.symbolIndex.has(symKey)) {
            this.symbolIndex.set(symKey, new Set());
        }
        this.symbolIndex.get(symKey).add(node.id);
        // File nodes index
        if (!this.fileNodesIndex.has(node.filePath)) {
            this.fileNodesIndex.set(node.filePath, new Set());
        }
        this.fileNodesIndex.get(node.filePath).add(node.id);
        // Token index
        this.indexNodeTokens(node);
    }
    insertEdgeInMemory(edge) {
        this.edges.set(edge.id, edge);
        if (!this.fileEdgesIndex.has(edge.filePath)) {
            this.fileEdgesIndex.set(edge.filePath, new Set());
        }
        this.fileEdgesIndex.get(edge.filePath).add(edge.id);
    }
    indexNodeTokens(node) {
        const textToTokenize = `${node.name} ${node.signature || ''} ${node.contentSnippet || ''} ${node.docstring || ''}`;
        const tokens = this.tokenize(textToTokenize);
        for (const token of tokens) {
            if (!this.tokenIndex.has(token)) {
                this.tokenIndex.set(token, new Set());
            }
            this.tokenIndex.get(token).add(node.id);
        }
    }
    removeNodeTokens(node) {
        const textToTokenize = `${node.name} ${node.signature || ''} ${node.contentSnippet || ''} ${node.docstring || ''}`;
        const tokens = this.tokenize(textToTokenize);
        for (const token of tokens) {
            const set = this.tokenIndex.get(token);
            if (set) {
                set.delete(node.id);
                if (set.size === 0)
                    this.tokenIndex.delete(token);
            }
        }
    }
    tokenize(text) {
        return text
            .toLowerCase()
            .split(/[^a-z0-9_]+/i)
            .filter((t) => t.length >= 2 && t.length <= 40);
    }
    clearInMemory() {
        this.nodes.clear();
        this.edges.clear();
        this.files.clear();
        this.symbolIndex.clear();
        this.fileNodesIndex.clear();
        this.fileEdgesIndex.clear();
        this.tokenIndex.clear();
    }
}
exports.KnowledgeStorage = KnowledgeStorage;
