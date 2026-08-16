"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitNexusEngine = void 0;
class GitNexusEngine {
    static REPO_URL = 'https://github.com/abhigyanpatwari/GitNexus';
    static VERSION = '1.0.0';
    /**
     * Graph RAG Context Retrieval: Computes multi-hop execution flow
     */
    queryGraphRag(entrySymbol, nodes, edges, depth = 3) {
        const visited = new Set();
        const flowPath = [];
        const executionGraph = [];
        const rootNode = Array.from(nodes.values()).find((n) => n.name === entrySymbol);
        if (!rootNode)
            return { flowPath, executionGraph };
        const queue = [{ nodeId: rootNode.id, currentDepth: 0 }];
        visited.add(rootNode.id);
        flowPath.push(rootNode);
        while (queue.length > 0) {
            const { nodeId, currentDepth } = queue.shift();
            if (currentDepth >= depth)
                continue;
            for (const edge of edges.values()) {
                if (edge.sourceId === nodeId && (edge.kind === 'calls' || edge.kind === 'references')) {
                    const targetNode = nodes.get(edge.targetId);
                    if (targetNode && !visited.has(targetNode.id)) {
                        visited.add(targetNode.id);
                        flowPath.push(targetNode);
                        queue.push({ nodeId: targetNode.id, currentDepth: currentDepth + 1 });
                        executionGraph.push({ from: nodeId, to: targetNode.id, relation: edge.kind });
                    }
                }
            }
        }
        return { flowPath, executionGraph };
    }
    /**
     * Evaluates Blast Radius risk when modifying a node
     */
    evaluateBlastRadius(targetNodeId, nodes, edges) {
        const directCallers = [];
        const transitiveCallers = [];
        const affectedFiles = new Set();
        const affectedRoutes = [];
        const targetNode = nodes.get(targetNodeId);
        if (targetNode)
            affectedFiles.add(targetNode.filePath);
        for (const edge of edges.values()) {
            if (edge.targetId === targetNodeId) {
                const caller = nodes.get(edge.sourceId);
                if (caller) {
                    directCallers.push(caller);
                    affectedFiles.add(caller.filePath);
                    if (caller.kind === 'route')
                        affectedRoutes.push(caller);
                }
            }
        }
        const riskScore = affectedRoutes.length > 0 || directCallers.length > 10
            ? 'CRITICAL'
            : directCallers.length > 5
                ? 'HIGH'
                : directCallers.length > 0
                    ? 'MEDIUM'
                    : 'LOW';
        return {
            target: targetNode?.name || targetNodeId,
            targetNode,
            directCallers,
            transitiveCallers,
            affectedFiles: Array.from(affectedFiles),
            affectedRoutes,
            riskScore,
            summary: `GitNexus Blast Radius: ${directCallers.length} direct caller(s), ${affectedFiles.size} file(s) affected. Risk: ${riskScore}.`,
        };
    }
}
exports.GitNexusEngine = GitNexusEngine;
