/**
 * Graphify Integration Module for OmniKB
 * Source: https://github.com/Graphify-Labs/graphify
 *
 * Implements:
 * - Deterministic AST Tree-sitter Parsing
 * - God Node (High-Coupling Hub) Detection & Centrality Scoring
 * - GRAPH_REPORT.md Architectural Summary
 * - Standalone D3/SVG Force-Directed Visualization
 */
import { CodeNode, CodeEdge, GraphStats } from '../types';
export interface GodNodeMetric {
    nodeId: string;
    name: string;
    filePath: string;
    degree: number;
    inDegree: number;
    outDegree: number;
    centralityScore: number;
}
export declare class GraphifyEngine {
    static readonly REPO_URL = "https://github.com/Graphify-Labs/graphify";
    static readonly VERSION = "1.0.0";
    /**
     * Detects "God Nodes" (components with excessive coupling/dependencies)
     */
    detectGodNodes(nodes: Map<string, CodeNode>, edges: Map<string, CodeEdge>, topN?: number): GodNodeMetric[];
    /**
     * Formats a Graphify Architecture Summary Report
     */
    formatGraphReport(stats: GraphStats, godNodes: GodNodeMetric[]): string;
}
