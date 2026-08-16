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
    nodes: Map<string, CodeNode>;
    edges: Map<string, CodeEdge>;
    files: Map<string, FileMetadata>;
    symbolIndex: Map<string, Set<string>>;
    fileNodesIndex: Map<string, Set<string>>;
    fileEdgesIndex: Map<string, Set<string>>;
    tokenIndex: Map<string, Set<string>>;
    constructor(workspaceRoot: string);
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
     * Fast full-text & symbol token search
     */
    search(query: string, limit?: number): SearchResult[];
    /**
     * Find nodes matching symbol name
     */
    findNodesByName(name: string): CodeNode[];
    private insertNodeInMemory;
    private insertEdgeInMemory;
    private indexNodeTokens;
    private removeNodeTokens;
    private tokenize;
    private clearInMemory;
}
