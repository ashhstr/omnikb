import { KnowledgeStorage } from './storage';
import { GraphEngine } from './graph';
export declare class KnowledgeReporter {
    private workspaceRoot;
    private storage;
    private graph;
    constructor(workspaceRoot: string, storage: KnowledgeStorage, graph: GraphEngine);
    /**
     * Generates live Markdown Knowledge Base (KNOWLEDGE_BASE.md)
     */
    generateMarkdownReport(outputPath?: string): Promise<string>;
    /**
     * Generates interactive standalone HTML Graph visualizer (graph.html)
     */
    generateHtmlVisualizer(outputPath?: string): Promise<string>;
}
