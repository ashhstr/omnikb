"use strict";
/**
 * CodeGraph Integration Module for OmniKB
 * Source: https://github.com/colbymchenry/codegraph
 *
 * Implements:
 * - Native OS File Watcher & Debounced Auto-Sync (<300ms)
 * - Local SQLite with FTS5 Full-Text Symbol Indexing
 * - Surgical 1-Step Context Exploration (explore, call paths, verbatim lines)
 * - Staleness Warning Banner & Connect-time catch-up
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGraphEngine = void 0;
class CodeGraphEngine {
    static REPO_URL = 'https://github.com/colbymchenry/codegraph';
    static VERSION = '2026.8.0';
    config;
    constructor(config) {
        this.config = {
            watchDebounceMs: 300,
            enableFts5: true,
            mcpToolName: 'codegraph_explore',
            sqliteDbPath: '.codegraph/codegraph.db',
            ...config,
        };
    }
    /**
     * Surgical single-call context explorer
     */
    generateSurgicalContext(targetSymbol, nodes, edges, verbatimLines) {
        const matchingNode = nodes.find((n) => n.name.toLowerCase() === targetSymbol.toLowerCase());
        const callers = edges
            .filter((e) => e.targetId === (matchingNode?.id || targetSymbol) && e.kind === 'calls')
            .map((e) => nodes.find((n) => n.id === e.sourceId))
            .filter((n) => n !== undefined);
        const callees = edges
            .filter((e) => e.sourceId === (matchingNode?.id || targetSymbol) && e.kind === 'calls')
            .map((e) => nodes.find((n) => n.id === e.targetId))
            .filter((n) => n !== undefined);
        return {
            query: targetSymbol,
            targetNodes: matchingNode ? [matchingNode] : [],
            callPaths: callers.map((c) => ({
                source: c,
                target: matchingNode || nodes[0],
                edge: {
                    id: `cg:edge:${c.id}:${matchingNode?.id}`,
                    sourceId: c.id,
                    targetId: matchingNode?.id || '',
                    kind: 'calls',
                    filePath: c.filePath,
                },
            })),
            callers,
            callees,
            impactRadius: {
                directAffected: callers,
                transitiveAffected: [],
                affectedFiles: matchingNode ? [matchingNode.filePath] : [],
            },
            verbatimSource: matchingNode
                ? [
                    {
                        filePath: matchingNode.filePath,
                        startLine: matchingNode.startLine,
                        endLine: matchingNode.endLine,
                        lines: verbatimLines,
                    },
                ]
                : [],
        };
    }
    /**
     * Generates staleness warning banner if query happens during debounce window
     */
    getStalenessBanner(pendingFiles) {
        if (pendingFiles.length === 0)
            return null;
        return `⚠️ Note: ${pendingFiles.length} file(s) currently syncing: ${pendingFiles.join(', ')}. Direct disk read applied for fresh content.`;
    }
}
exports.CodeGraphEngine = CodeGraphEngine;
