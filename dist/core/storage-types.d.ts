import { CodeNode, CodeEdge, FileMetadata, SearchResult } from '../types';
/**
 * Read-only view of the knowledge graph exposed to consumers.
 * Decouples query/read logic from the concrete storage implementation so
 * callers never depend on internal index structures or persistence details.
 */
export interface IKnowledgeGraphReader {
    readonly nodes: ReadonlyMap<string, CodeNode>;
    readonly edges: ReadonlyMap<string, CodeEdge>;
    readonly files: ReadonlyMap<string, FileMetadata>;
    /**
     * Fast full-text & symbol token search
     */
    search(query: string, limit?: number): SearchResult[];
    /**
     * Find nodes matching symbol name
     */
    findNodesByName(name: string): CodeNode[];
}
/**
 * Read-write contract for the storage engine.
 * Persistence + delta-update operations used by the watcher & CLI.
 */
export interface IKnowledgeStorage extends IKnowledgeGraphReader {
    init(): Promise<void>;
    loadFromDisk(): boolean;
    saveToDisk(): Promise<void>;
    updateFileGraph(filePath: string, meta: FileMetadata, newNodes: CodeNode[], newEdges: CodeEdge[]): void;
    removeFileFromGraph(filePath: string): void;
    buildInvertedIndex?(): void;
}
/**
 * Extended read access for analytics/reporting consumers (GraphEngine,
 * Reporter) that need per-file node counts. Kept separate so generic
 * consumers don't depend on internal indexing details.
 */
export interface IKnowledgeIndexReader extends IKnowledgeGraphReader {
    /**
     * Number of code nodes contained within a file (read-only view)
     */
    getFileNodeCount(filePath: string): number;
}
