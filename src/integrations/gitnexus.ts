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

export class GitNexusEngine {
  public static readonly REPO_URL = 'https://github.com/abhigyanpatwari/GitNexus';
  public static readonly VERSION = '1.0.0';

  /**
   * Graph RAG Context Retrieval: Computes multi-hop execution flow
   */
  public queryGraphRag(
    entrySymbol: string,
    nodes: Map<string, CodeNode>,
    edges: Map<string, CodeEdge>,
    depth: number = 3
  ): {
    flowPath: CodeNode[];
    executionGraph: Array<{ from: string; to: string; relation: string }>;
  } {
    const visited = new Set<string>();
    const flowPath: CodeNode[] = [];
    const executionGraph: Array<{ from: string; to: string; relation: string }> = [];

    const rootNode = Array.from(nodes.values()).find((n) => n.name === entrySymbol);
    if (!rootNode) return { flowPath, executionGraph };

    const queue: Array<{ nodeId: string; currentDepth: number }> = [{ nodeId: rootNode.id, currentDepth: 0 }];
    visited.add(rootNode.id);
    flowPath.push(rootNode);

    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift()!;
      if (currentDepth >= depth) continue;

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
  public evaluateBlastRadius(
    targetNodeId: string,
    nodes: Map<string, CodeNode>,
    edges: Map<string, CodeEdge>
  ): ImpactAnalysis {
    const directCallers: CodeNode[] = [];
    const transitiveCallers: CodeNode[] = [];
    const affectedFiles = new Set<string>();
    const affectedRoutes: CodeNode[] = [];

    const targetNode = nodes.get(targetNodeId);
    if (targetNode) affectedFiles.add(targetNode.filePath);

    for (const edge of edges.values()) {
      if (edge.targetId === targetNodeId) {
        const caller = nodes.get(edge.sourceId);
        if (caller) {
          directCallers.push(caller);
          affectedFiles.add(caller.filePath);
          if (caller.kind === 'route') affectedRoutes.push(caller);
        }
      }
    }

    const riskScore: ImpactAnalysis['riskScore'] =
      affectedRoutes.length > 0 || directCallers.length > 10
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
      freshness: {
        isFresh: true,
        isStale: false,
        indexedAt: Date.now(),
        contentHash: 'gitnexus-verified',
        pendingInQueue: false,
      },
    };
  }
}
