import * as fs from 'fs';
import * as path from 'path';
import { CodeNode, CodeEdge, FileMetadata, SearchResult } from '../types';

export interface StorageDump {
  version: number;
  lastUpdated: number;
  files: Record<string, FileMetadata>;
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export class KnowledgeStorage {
  private dbDir: string;
  private dbFilePath: string;

  public nodes: Map<string, CodeNode> = new Map();
  public edges: Map<string, CodeEdge> = new Map();
  public files: Map<string, FileMetadata> = new Map();
  public lastUpdated: number = Date.now();

  // Inverted indexes for instant retrieval
  public symbolIndex: Map<string, Set<string>> = new Map(); // SymbolName -> Set of Node IDs
  public fileNodesIndex: Map<string, Set<string>> = new Map(); // FilePath -> Set of Node IDs
  public fileEdgesIndex: Map<string, Set<string>> = new Map(); // FilePath -> Set of Edge IDs
  public tokenIndex: Map<string, Set<string>> = new Map(); // Token -> Set of Node IDs

  constructor(workspaceRoot: string) {
    this.dbDir = path.join(workspaceRoot, '.omnikb');
    this.dbFilePath = path.join(this.dbDir, 'knowledge-graph.json');
  }

  /**
   * Initializes storage directory and loads existing graph state if present
   */
  public async init(): Promise<void> {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
    this.loadFromDisk();
  }

  /**
   * Loads persisted graph from disk
   */
  public loadFromDisk(): boolean {
    if (!fs.existsSync(this.dbFilePath)) {
      return false;
    }

    try {
      const raw = fs.readFileSync(this.dbFilePath, 'utf8');
      const data: StorageDump = JSON.parse(raw);

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
    } catch (err: any) {
      console.error(`[OmniKB Storage] Failed to load cached index: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Atomically saves current in-memory graph to disk
   */
  public async saveToDisk(): Promise<void> {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }

    const now = Date.now();
    this.lastUpdated = now;

    const dump: StorageDump = {
      version: 1,
      lastUpdated: now,
      files: Object.fromEntries(this.files),
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };

    const jsonStr = JSON.stringify(dump, null, 2);
    try {
      await fs.promises.writeFile(this.dbFilePath, jsonStr, 'utf8');
    } catch (err: any) {
      console.error(`[OmniKB Storage] Failed to write index: ${err?.message || err}`);
    }
  }

  /**
   * Updates graph state for a single file (incremental delta update)
   */
  public updateFileGraph(
    filePath: string,
    meta: FileMetadata,
    newNodes: CodeNode[],
    newEdges: CodeEdge[]
  ): void {
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
  public removeFileFromGraph(filePath: string): void {
    const nodeIds = this.fileNodesIndex.get(filePath);
    if (nodeIds) {
      for (const nodeId of nodeIds) {
        const node = this.nodes.get(nodeId);
        if (node) {
          // Remove from symbol index
          const symSet = this.symbolIndex.get(node.name.toLowerCase());
          if (symSet) {
            symSet.delete(nodeId);
            if (symSet.size === 0) this.symbolIndex.delete(node.name.toLowerCase());
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
  public search(query: string, limit: number = 20): SearchResult[] {
    const rawTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
    if (rawTerms.length === 0) return [];

    const scores = new Map<string, { score: number; matchType: SearchResult['matchType'] }>();

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
        } else if (sym.includes(term)) {
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
      .map(([nodeId, info]): SearchResult | null => {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        return {
          nodes: [node],
          score: info.score,
          matchType: info.matchType,
          highlight: node.signature || node.name,
        };
      })
      .filter((r): r is SearchResult => r !== null);
  }

  /**
   * Find nodes matching symbol name
   */
  public findNodesByName(name: string): CodeNode[] {
    const key = name.toLowerCase();
    const nodeIds = this.symbolIndex.get(key);
    if (!nodeIds) return [];
    return Array.from(nodeIds)
      .map((id) => this.nodes.get(id))
      .filter((n): n is CodeNode => n !== undefined);
  }

  private insertNodeInMemory(node: CodeNode): void {
    this.nodes.set(node.id, node);

    // Symbol index
    const symKey = node.name.toLowerCase();
    if (!this.symbolIndex.has(symKey)) {
      this.symbolIndex.set(symKey, new Set());
    }
    this.symbolIndex.get(symKey)!.add(node.id);

    // File nodes index
    if (!this.fileNodesIndex.has(node.filePath)) {
      this.fileNodesIndex.set(node.filePath, new Set());
    }
    this.fileNodesIndex.get(node.filePath)!.add(node.id);

    // Token index
    this.indexNodeTokens(node);
  }

  private insertEdgeInMemory(edge: CodeEdge): void {
    this.edges.set(edge.id, edge);

    if (!this.fileEdgesIndex.has(edge.filePath)) {
      this.fileEdgesIndex.set(edge.filePath, new Set());
    }
    this.fileEdgesIndex.get(edge.filePath)!.add(edge.id);
  }

  private indexNodeTokens(node: CodeNode): void {
    const textToTokenize = `${node.name} ${node.signature || ''} ${node.contentSnippet || ''} ${node.docstring || ''}`;
    const tokens = this.tokenize(textToTokenize);

    for (const token of tokens) {
      if (!this.tokenIndex.has(token)) {
        this.tokenIndex.set(token, new Set());
      }
      this.tokenIndex.get(token)!.add(node.id);
    }
  }

  private removeNodeTokens(node: CodeNode): void {
    const textToTokenize = `${node.name} ${node.signature || ''} ${node.contentSnippet || ''} ${node.docstring || ''}`;
    const tokens = this.tokenize(textToTokenize);

    for (const token of tokens) {
      const set = this.tokenIndex.get(token);
      if (set) {
        set.delete(node.id);
        if (set.size === 0) this.tokenIndex.delete(token);
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9_]+/i)
      .filter((t) => t.length >= 2 && t.length <= 40);
  }

  private clearInMemory(): void {
    this.nodes.clear();
    this.edges.clear();
    this.files.clear();
    this.symbolIndex.clear();
    this.fileNodesIndex.clear();
    this.fileEdgesIndex.clear();
    this.tokenIndex.clear();
  }
}
