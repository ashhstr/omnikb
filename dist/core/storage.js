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
    workspaceRoot;
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
        this.workspaceRoot = workspaceRoot;
        this.dbDir = path.join(workspaceRoot, '.omnikb');
        this.dbFilePath = path.join(this.dbDir, 'knowledge-graph.json');
    }
    getWorkspaceRoot() {
        return this.workspaceRoot;
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
        const jsonStr = JSON.stringify(dump);
        const tmpFilePath = `${this.dbFilePath}.${Date.now()}.tmp`;
        try {
            await fs.promises.writeFile(tmpFilePath, jsonStr, 'utf8');
            await fs.promises.rename(tmpFilePath, this.dbFilePath);
        }
        catch (err) {
            console.error(`[OmniKB Storage] Failed to write index: ${err?.message || err}`);
            try {
                if (fs.existsSync(tmpFilePath)) {
                    fs.unlinkSync(tmpFilePath);
                }
            }
            catch { }
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
     * Rebuilds all inverted indexes (symbolIndex, fileNodesIndex, fileEdgesIndex, tokenIndex)
     * from the current in-memory nodes and edges with enriched tokenization.
     */
    buildInvertedIndex() {
        this.symbolIndex.clear();
        this.fileNodesIndex.clear();
        this.fileEdgesIndex.clear();
        this.tokenIndex.clear();
        for (const node of this.nodes.values()) {
            // Symbol index (lowercase for case-insensitive lookup)
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
        for (const edge of this.edges.values()) {
            if (!this.fileEdgesIndex.has(edge.filePath)) {
                this.fileEdgesIndex.set(edge.filePath, new Set());
            }
            this.fileEdgesIndex.get(edge.filePath).add(edge.id);
        }
    }
    /**
     * Enhanced Multi-Factor Composite Relevance Search.
     * Supports multi-word queries, constituent word tokenization (camelCase, PascalCase, snake_case, kebab-case),
     * exact/case-insensitive/prefix/substring symbol matching, kind-based boosting, and file path boosting.
     *
     * Scoring Engine Rules:
     * - Exact symbol name match: +100 points
     * - Case-insensitive exact name match: +60 points
     * - Symbol name prefix match: +30 points
     * - Symbol name substring match: +15 points
     * - Token matching via inverted index: +5 points per matching token weighted by frequency
     * - Kind/Type boost: class/interface (+15), function/method (+10), route (+12), type (+8)
     * - File path boost if term matches directory/filename (+10)
     *
     * @param query Search string query (multi-word supported)
     * @param limit Maximum number of results to return (default 10)
     */
    search(query, limit = 10) {
        if (!query || typeof query !== 'string')
            return [];
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0)
            return [];
        const effectiveLimit = limit > 0 ? limit : 10;
        const lowerQuery = trimmedQuery.toLowerCase();
        // Parse multi-word terms and constituent tokens
        const queryTerms = trimmedQuery.split(/\s+/).filter((t) => t.length > 0);
        const queryTokens = this.tokenize(trimmedQuery);
        // 1. Gather candidate node IDs from symbolIndex, tokenIndex, and terms
        const candidateIds = new Set();
        // Exact and partial symbol lookups for full query and terms
        for (const [symKey, nodeIds] of this.symbolIndex.entries()) {
            if (symKey === lowerQuery || queryTerms.some((t) => symKey === t.toLowerCase())) {
                for (const id of nodeIds)
                    candidateIds.add(id);
            }
            else if (symKey.includes(lowerQuery) || queryTerms.some((t) => symKey.includes(t.toLowerCase()))) {
                for (const id of nodeIds)
                    candidateIds.add(id);
            }
        }
        // Inverted token lookups
        for (const qToken of queryTokens) {
            const lowerQToken = qToken.toLowerCase();
            // Exact token lookup
            const directMatches = this.tokenIndex.get(lowerQToken);
            if (directMatches) {
                for (const id of directMatches)
                    candidateIds.add(id);
            }
            // Prefix matching on tokens
            for (const [indexedToken, nodeIds] of this.tokenIndex.entries()) {
                if (indexedToken.startsWith(lowerQToken) || lowerQToken.startsWith(indexedToken)) {
                    for (const id of nodeIds)
                        candidateIds.add(id);
                }
            }
        }
        const scored = [];
        for (const id of candidateIds) {
            const node = this.nodes.get(id);
            if (!node)
                continue;
            let score = 0;
            let matchType = 'fts_content';
            let hasSymbolMatch = false;
            const nodeNameLower = node.name.toLowerCase();
            const nodeFilePathLower = node.filePath.toLowerCase();
            // Check Exact Symbol Name Match (case-sensitive: +100) vs Case-Insensitive (+60)
            if (node.name === trimmedQuery || queryTerms.some((t) => node.name === t)) {
                score += 100;
                matchType = 'exact_name';
                hasSymbolMatch = true;
            }
            else if (nodeNameLower === lowerQuery || queryTerms.some((t) => nodeNameLower === t.toLowerCase())) {
                score += 60;
                matchType = 'exact_name';
                hasSymbolMatch = true;
            }
            else if (nodeNameLower.startsWith(lowerQuery) ||
                queryTerms.some((t) => t.length >= 2 && nodeNameLower.startsWith(t.toLowerCase()))) {
                // Symbol name prefix match: +30 points
                score += 30;
                matchType = 'partial_name';
                hasSymbolMatch = true;
            }
            else if (nodeNameLower.includes(lowerQuery) ||
                queryTerms.some((t) => t.length >= 2 && nodeNameLower.includes(t.toLowerCase()))) {
                // Symbol name substring match: +15 points
                score += 15;
                matchType = 'partial_name';
                hasSymbolMatch = true;
            }
            // Token matching via inverted index: +5 points per matching token weighted by frequency
            const nodeTokens = this.extractNodeTokens(node);
            const tokenFreqMap = new Map();
            for (const tok of nodeTokens) {
                tokenFreqMap.set(tok, (tokenFreqMap.get(tok) || 0) + 1);
            }
            let tokenMatchPoints = 0;
            for (const qToken of queryTokens) {
                const lowerQToken = qToken.toLowerCase();
                const freq = tokenFreqMap.get(lowerQToken) || 0;
                if (freq > 0) {
                    // +5 points per matching token weighted by frequency
                    tokenMatchPoints += 5 * Math.min(freq, 10);
                }
            }
            score += tokenMatchPoints;
            // Only apply boosts if there is at least some relevance (symbol match or token match)
            if (score > 0) {
                // Kind / Type boost: class/interface (+15), function/method (+10), route (+12), type (+8)
                switch (node.kind) {
                    case 'class':
                    case 'interface':
                        score += 15;
                        break;
                    case 'route':
                        score += 12;
                        break;
                    case 'function':
                    case 'method':
                        score += 10;
                        break;
                    case 'type':
                        score += 8;
                        break;
                    default:
                        break;
                }
                // File path boost if term matches directory/filename (+10)
                const matchesFilePath = nodeFilePathLower.includes(lowerQuery) ||
                    queryTerms.some((t) => t.length >= 2 && nodeFilePathLower.includes(t.toLowerCase()));
                if (matchesFilePath) {
                    score += 10;
                }
                // If doc section or document
                if (node.kind === 'doc_section' || node.kind === 'doc_document') {
                    if (!hasSymbolMatch)
                        matchType = 'doc';
                }
                scored.push({
                    node,
                    score,
                    matchType,
                });
            }
        }
        // 3. Sort descending by score, tie-break by name
        scored.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.node.name.localeCompare(b.node.name);
        });
        // 4. Return top results capped at limit
        return scored.slice(0, effectiveLimit).map((item) => ({
            nodes: [item.node],
            score: item.score,
            matchType: item.matchType,
            highlight: item.node.signature || item.node.name,
        }));
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
    /**
     * Deconstructs a symbol name into its constituent word tokens.
     * Handles camelCase, PascalCase, snake_case, kebab-case, and acronym boundaries.
     * Example:
     *   "getUserProfile" -> ["get", "user", "profile", "getuserprofile"]
     *   "KnowledgeStorage" -> ["knowledge", "storage", "knowledgestorage"]
     *   "verify_hash_pwd" -> ["verify", "hash", "pwd", "verifyhashpwd"]
     *   "parseAST" -> ["parse", "ast", "parseast"]
     */
    static tokenizeSymbol(name) {
        if (!name || typeof name !== 'string')
            return [];
        const tokens = new Set();
        const clean = name.trim();
        if (!clean)
            return [];
        // Split on punctuation/delimiters like '.', '/', '-', '_', ':', ' ', '$', '@', '#'
        const segments = clean.split(/[^a-zA-Z0-9]+/);
        for (const seg of segments) {
            if (!seg)
                continue;
            const lowerSeg = seg.toLowerCase();
            if (lowerSeg.length >= 2 && lowerSeg.length <= 50) {
                tokens.add(lowerSeg);
            }
            // Split camelCase / PascalCase / Acronym boundaries
            // e.g. "getUserProfile" -> "get User Profile"
            // e.g. "parseAST" -> "parse AST"
            // e.g. "ASTParser" -> "AST Parser"
            const split = seg
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                .split(/\s+/);
            for (const word of split) {
                const lowerWord = word.toLowerCase();
                if (lowerWord.length >= 2 && lowerWord.length <= 50) {
                    tokens.add(lowerWord);
                }
            }
        }
        // Also add full stripped alphanumeric string if multi-segment
        const fullNormalized = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (fullNormalized.length >= 2 && fullNormalized.length <= 50) {
            tokens.add(fullNormalized);
        }
        return Array.from(tokens);
    }
    /**
     * Tokenizes arbitrary text or code snippets into semantic constituent tokens.
     */
    tokenize(text) {
        if (!text || typeof text !== 'string')
            return [];
        const tokens = new Set();
        const rawSegments = text.split(/[\s,.;:()\[\]{}<>"'`\\/|!?*+=~^%#@&$-]+/);
        for (const seg of rawSegments) {
            if (!seg || seg.length < 2)
                continue;
            const subTokens = KnowledgeStorage.tokenizeSymbol(seg);
            for (const t of subTokens) {
                tokens.add(t);
            }
        }
        return Array.from(tokens);
    }
    /**
     * Extracts all constituent tokens for a CodeNode from its name, signature,
     * content snippet, docstring, and file path.
     */
    extractNodeTokens(node) {
        const tokens = [];
        // Symbol name tokens (high relevance)
        tokens.push(...KnowledgeStorage.tokenizeSymbol(node.name));
        // File path tokens
        tokens.push(...KnowledgeStorage.tokenizeSymbol(node.filePath));
        // Signature tokens
        if (node.signature) {
            tokens.push(...this.tokenize(node.signature));
        }
        // Docstring tokens
        if (node.docstring) {
            tokens.push(...this.tokenize(node.docstring));
        }
        // Content snippet tokens
        if (node.contentSnippet) {
            tokens.push(...this.tokenize(node.contentSnippet));
        }
        return tokens;
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
        const tokens = this.extractNodeTokens(node);
        const uniqueTokens = new Set(tokens);
        for (const token of uniqueTokens) {
            if (!this.tokenIndex.has(token)) {
                this.tokenIndex.set(token, new Set());
            }
            this.tokenIndex.get(token).add(node.id);
        }
    }
    removeNodeTokens(node) {
        const tokens = this.extractNodeTokens(node);
        const uniqueTokens = new Set(tokens);
        for (const token of uniqueTokens) {
            const set = this.tokenIndex.get(token);
            if (set) {
                set.delete(node.id);
                if (set.size === 0)
                    this.tokenIndex.delete(token);
            }
        }
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
