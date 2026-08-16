/**
 * OmniKB Core Type Definitions
 * Unified Knowledge Base & Code Graph Engine
 */

export type NodeKind =
  | 'file'
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'route'
  | 'doc_section'
  | 'doc_document';

export type EdgeKind =
  | 'contains'
  | 'imports'
  | 'exports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'references'
  | 'documents';

export interface CodeNode {
  id: string; // Unique identifier: e.g. "src/core/graph.ts#GraphEngine.resolve"
  name: string; // Symbol name: e.g. "resolve"
  kind: NodeKind;
  filePath: string;
  startLine: number;
  endLine: number;
  contentSnippet?: string;
  signature?: string;
  docstring?: string;
  metadata?: Record<string, any>;
}

export interface CodeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  targetName?: string;
  kind: EdgeKind;
  filePath: string;
  line?: number;
  confidence?: 'exact' | 'heuristic' | 'inferred';
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  path: string;
  hash: string;
  size: number;
  lastModified: number;
  language: string;
  nodeCount: number;
  edgeCount: number;
}

export interface GraphStats {
  totalFiles: number;
  totalNodes: number;
  totalEdges: number;
  nodesByKind: Record<NodeKind, number>;
  edgesByKind: Record<EdgeKind, number>;
  languages: Record<string, number>;
  godNodes: Array<{ id: string; name: string; filePath: string; degree: number; inDegree: number; outDegree: number }>;
  lastSyncTime: number;
}

export interface ExploreResult {
  query: string;
  targetNodes: CodeNode[];
  callPaths: Array<{
    source: CodeNode;
    target: CodeNode;
    edge: CodeEdge;
  }>;
  callers: CodeNode[];
  callees: CodeNode[];
  impactRadius: {
    directAffected: CodeNode[];
    transitiveAffected: CodeNode[];
    affectedFiles: string[];
  };
  verbatimSource: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    lines: Array<{ lineNumber: number; content: string }>;
  }>;
  relatedDocs?: CodeNode[];
  stalenessWarning?: string;
}

export interface ImpactAnalysis {
  target: string;
  targetNode?: CodeNode;
  directCallers: CodeNode[];
  transitiveCallers: CodeNode[];
  affectedFiles: string[];
  affectedRoutes: CodeNode[];
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
}

export interface SearchResult {
  nodes: CodeNode[];
  score: number;
  matchType: 'exact_name' | 'partial_name' | 'fts_content' | 'doc';
  highlight?: string;
}

export interface WatcherConfig {
  rootPath: string;
  debounceMs?: number;
  ignorePatterns?: string[];
  autoGenerateReport?: boolean;
  autoGenerateVisual?: boolean;
  onSyncComplete?: (stats: GraphStats) => void;
}
