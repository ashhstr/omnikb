import { KnowledgeStorage } from './storage';
import { GraphEngine } from './graph';
import { ReporterOptions } from '../types';
export declare class KnowledgeReporter {
    private workspaceRoot;
    private storage;
    private graph;
    constructor(workspaceRoot: string, storage: KnowledgeStorage, graph: GraphEngine);
    /**
     * Generates live Markdown Knowledge Base (KNOWLEDGE_BASE.md) with configurable depth
     */
    generateMarkdownReport(outputPath?: string, options?: ReporterOptions): Promise<string>;
    /**
     * Generates interactive standalone HTML Graph visualizer (graph.html)
     */
    generateHtmlVisualizer(outputPath?: string): Promise<string>;
    /**
     * Maps storage nodes & edges into lightweight graph payload for the visualizer
     */
    private prepareGraphData;
    /**
     * Builds the full self-contained HTML document (inline CSS + D3 JS)
     */
    private buildHtmlTemplate;
    /**
     * Inline CSS styles for the visualizer
     */
    private htmlStyles;
    /**
     * Inline D3.js visualization script for the visualizer
     */
    private htmlScripts;
}
