import { CodeNode, CodeEdge } from '../types';
export interface ParseResult {
    filePath: string;
    language: string;
    nodes: CodeNode[];
    edges: CodeEdge[];
    contentHash: string;
}
export declare class CodeParser {
    private parsers;
    constructor();
    /**
     * Detects programming language from file extension
     */
    static detectLanguage(filePath: string): string;
    /**
     * Computes SHA-256 hash of file content
     */
    static computeHash(content: string): string;
    /**
     * Main parsing entrypoint for any supported file
     */
    parseFile(relativeFilePath: string, content: string): ParseResult;
}
