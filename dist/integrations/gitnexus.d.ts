/**
 * GitNexus Integration Module for OmniKB
 * Source: https://github.com/abhigyanpatwari/GitNexus
 *
 * Implements:
 * - Zero-Server Client-side / Local Graph RAG Engine
 * - Multi-Hop Dependency & Execution Flow Traversal
 * - Blast Radius & Refactoring Risk Evaluation
 * - Dependency Clustering
 */
import { CodeNode, CodeEdge, ImpactAnalysis } from '../types';
export interface GitNexusCluster {
    clusterId: string;
    name: string;
    nodes: CodeNode[];
    cohesionScore: number;
}
export declare class GitNexusEngine {
    static readonly REPO_URL = "https://github.com/abhigyanpatwari/GitNexus";
    static readonly VERSION = "1.0.0";
    /**
     * Graph RAG Context Retrieval: Computes multi-hop execution flow
     */
    queryGraphRag(entrySymbol: string, nodes: Map<string, CodeNode>, edges: Map<string, CodeEdge>, depth?: number): {
        flowPath: CodeNode[];
        executionGraph: Array<{
            from: string;
            to: string;
            relation: string;
        }>;
    };
    /**
     * Evaluates Blast Radius risk when modifying a node
     */
    evaluateBlastRadius(targetNodeId: string, nodes: Map<string, CodeNode>, edges: Map<string, CodeEdge>): ImpactAnalysis;
}
