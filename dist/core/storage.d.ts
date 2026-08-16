import { CodeNode, CodeEdge, FileMetadata, SearchResult } from '../types';
import { IKnowledgeStorage, IKnowledgeIndexReader } from './storage-types';
export interface StorageDump {
    version: number;
    lastUpdated: number;
    files: Record<string, FileMetadata>;
    nodes: CodeNode[];
    edges: CodeEdge[];
}
export declare class KnowledgeStorage implements IKnowledgeStorage, IKnowledgeIndexReader {
    private dbDir;
    private dbFilePath;
    readonly nodes: Map<string, CodeNode>;
    readonly edges: Map<string, CodeEdge>;
    readonly files: Map<string, FileMetadata>;
    private symbolIndex;
    private fileNodesIndex;
    private fileEdgesIndex;
    private tokenIndex;
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
    /**
     * Number of code nodes contained within a file (read-only view)
     */
    getFileNodeCount(filePath: string): number;
    private insertNodeInMemory;
    private insertEdgeInMemory;
    private indexNodeTokens;
    private removeNodeTokens;
    private tokenize;
    private clearInMemory;
}
