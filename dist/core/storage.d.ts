import { CodeNode, CodeEdge, FileMetadata, SearchResult } from '../types';
export interface StorageDump {
    version: number;
    lastUpdated: number;
    files: Record<string, FileMetadata>;
    nodes: CodeNode[];
    edges: CodeEdge[];
}
export declare class KnowledgeStorage {
    private dbDir;
    private dbFilePath;
    private workspaceRoot;
    nodes: Map<string, CodeNode>;
    edges: Map<string, CodeEdge>;
    files: Map<string, FileMetadata>;
    lastUpdated: number;
    symbolIndex: Map<string, Set<string>>;
    fileNodesIndex: Map<string, Set<string>>;
    fileEdgesIndex: Map<string, Set<string>>;
    tokenIndex: Map<string, Set<string>>;
    constructor(workspaceRoot: string);
    getWorkspaceRoot(): string;
    /**
     * Initializes storage directory and loads existing graph state if present
     */
    init(): Promise<void>;
    /**
     * Loads persisted graph from disk
     */
    loadFromDisk(): boolean;
    /**
     * Atomically saves current in-memory graph to disk
     */
    saveToDisk(): Promise<void>;
    /**
     * Updates graph state for a single file (incremental delta update)
     */
    updateFileGraph(filePath: string, meta: FileMetadata, newNodes: CodeNode[], newEdges: CodeEdge[]): void;
    /**
     * Removes a file and all its associated nodes & edges
     */
    removeFileFromGraph(filePath: string): void;
    /**
     * Rebuilds all inverted indexes (symbolIndex, fileNodesIndex, fileEdgesIndex, tokenIndex)
     * from the current in-memory nodes and edges with enriched tokenization.
     */
    buildInvertedIndex(): void;
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
    search(query: string, limit?: number): SearchResult[];
    /**
     * Find nodes matching symbol name
     */
    findNodesByName(name: string): CodeNode[];
    /**
     * Deconstructs a symbol name into its constituent word tokens.
     * Handles camelCase, PascalCase, snake_case, kebab-case, and acronym boundaries.
     * Example:
     *   "getUserProfile" -> ["get", "user", "profile", "getuserprofile"]
     *   "KnowledgeStorage" -> ["knowledge", "storage", "knowledgestorage"]
     *   "verify_hash_pwd" -> ["verify", "hash", "pwd", "verifyhashpwd"]
     *   "parseAST" -> ["parse", "ast", "parseast"]
     */
    static tokenizeSymbol(name: string): string[];
    /**
     * Tokenizes arbitrary text or code snippets into semantic constituent tokens.
     */
    tokenize(text: string): string[];
    /**
     * Extracts all constituent tokens for a CodeNode from its name, signature,
     * content snippet, docstring, and file path.
     */
    extractNodeTokens(node: CodeNode): string[];
    private insertNodeInMemory;
    private insertEdgeInMemory;
    private indexNodeTokens;
    private removeNodeTokens;
    private clearInMemory;
}
