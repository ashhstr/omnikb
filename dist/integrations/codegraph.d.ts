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
import { CodeNode, CodeEdge, ExploreResult } from '../types';
export interface CodeGraphConfig {
    watchDebounceMs: number;
    enableFts5: boolean;
    mcpToolName: string;
    sqliteDbPath: string;
}
export declare class CodeGraphEngine {
    static readonly REPO_URL = "https://github.com/colbymchenry/codegraph";
    static readonly VERSION = "2026.8.0";
    private config;
    constructor(config?: Partial<CodeGraphConfig>);
    /**
     * Surgical single-call context explorer
     */
    generateSurgicalContext(targetSymbol: string, nodes: CodeNode[], edges: CodeEdge[], verbatimLines: Array<{
        lineNumber: number;
        content: string;
    }>): ExploreResult;
    /**
     * Generates staleness warning banner if query happens during debounce window
     */
    getStalenessBanner(pendingFiles: string[]): string | null;
}
