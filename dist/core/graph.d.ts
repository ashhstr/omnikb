import { ExploreResult, ImpactAnalysis, GraphStats, FreshnessMetadata } from '../types';
import { KnowledgeStorage } from './storage';
export declare class GraphEngine {
    private storage;
    private workspaceRoot;
    constructor(workspaceRoot: string, storage: KnowledgeStorage);
    getWorkspaceRoot(): string;
    /**
     * Resolves raw symbolic edges (e.g. sym:myFunc) to concrete node IDs
     */
    resolveCrossFileReferences(): void;
    /**
     * Performs atomic verification of graph data freshness against current disk state
     */
    checkFreshness(filePaths: string[]): FreshnessMetadata;
    /**
     * Explores code symbol, flow, and verbatim code in a single call (inspired by CodeGraph)
     */
    explore(query: string, maxDepth?: number): ExploreResult;
    /**
     * Calculates Blast Radius and Change Impact for a symbol or file (inspired by GitNexus)
     */
    calculateImpact(target: string, maxDepth?: number): ImpactAnalysis;
    /**
     * God Node & Architecture Bottleneck Detection (inspired by Graphify)
     */
    getStats(): GraphStats;
    /**
     * Calculates iterative PageRank centrality across all graph nodes
     */
    calculatePageRank(dampingFactor?: number, maxIterations?: number): Map<string, number>;
    private extractVerbatimSource;
}
