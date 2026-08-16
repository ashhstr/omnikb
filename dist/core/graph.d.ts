import { ExploreResult, ExploreOptions, ImpactAnalysis, GraphStats } from '../types';
import { KnowledgeStorage } from './storage';
export declare class GraphEngine {
    private storage;
    private workspaceRoot;
    constructor(workspaceRoot: string, storage: KnowledgeStorage);
    /**
     * Resolves raw symbolic edges (e.g. sym:myFunc) to concrete node IDs.
     * Utilizes AST import mapping and file definitions for 100% exact precision (zero heuristic ambiguity).
     */
    resolveCrossFileReferences(): void;
    private getCommonPathPrefix;
    /**
     * Explores code symbol, flow, and verbatim code in a single call (inspired by CodeGraph).
     * Supports dynamic full-file drilldown and import inspection.
     */
    explore(query: string, maxDepth?: number, options?: ExploreOptions): ExploreResult;
    /**
     * Calculates Blast Radius and Change Impact for a symbol or file (inspired by GitNexus)
     */
    calculateImpact(target: string, maxDepth?: number): ImpactAnalysis;
    /**
     * God Node & Architecture Bottleneck Detection (inspired by Graphify)
     */
    getStats(): GraphStats;
    private extractVerbatimSource;
}
