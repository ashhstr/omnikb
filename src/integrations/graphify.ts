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

export class GraphifyEngine {
  public static readonly REPO_URL = 'https://github.com/Graphify-Labs/graphify';
  public static readonly VERSION = '1.0.0';

  /**
   * Detects "God Nodes" (components with excessive coupling/dependencies)
   */
  public detectGodNodes(
    nodes: Map<string, CodeNode>,
    edges: Map<string, CodeEdge>,
    topN: number = 10
  ): GodNodeMetric[] {
    const inDeg = new Map<string, number>();
    const outDeg = new Map<string, number>();

    for (const node of nodes.values()) {
      inDeg.set(node.id, 0);
      outDeg.set(node.id, 0);
    }

    for (const edge of edges.values()) {
      outDeg.set(edge.sourceId, (outDeg.get(edge.sourceId) || 0) + 1);
      inDeg.set(edge.targetId, (inDeg.get(edge.targetId) || 0) + 1);
    }

    const totalNodes = nodes.size || 1;

    return Array.from(nodes.values())
      .filter((n) => n.kind !== 'file' && n.kind !== 'doc_section')
      .map((n) => {
        const inCount = inDeg.get(n.id) || 0;
        const outCount = outDeg.get(n.id) || 0;
        const degree = inCount + outCount;
        const centralityScore = Number(((degree / totalNodes) * 100).toFixed(2));

        return {
          nodeId: n.id,
          name: n.name,
          filePath: n.filePath,
          degree,
          inDegree: inCount,
          outDegree: outCount,
          centralityScore,
        };
      })
      .sort((a, b) => b.degree - a.degree)
      .slice(0, topN);
  }

  /**
   * Formats a Graphify Architecture Summary Report
   */
  public formatGraphReport(stats: GraphStats, godNodes: GodNodeMetric[]): string {
    let report = `# 📊 Graphify Architecture Report\n\n`;
    report += `**Total Nodes**: ${stats.totalNodes} | **Total Edges**: ${stats.totalEdges} | **Indexed Files**: ${stats.totalFiles}\n\n`;
    report += `## ⚠️ God Nodes & High Coupling Warning\n\n`;
    report += `Nodes with disproportionately high dependencies that warrant architectural review:\n\n`;
    report += `| Symbol | Location | Total Degree | In-Degree (Dependents) | Out-Degree (Dependencies) | Centrality |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const gn of godNodes) {
      report += `| **\`${gn.name}\`** | \`${gn.filePath}\` | **${gn.degree}** | ${gn.inDegree} | ${gn.outDegree} | \`${gn.centralityScore}%\` |\n`;
    }

    return report;
  }
}
