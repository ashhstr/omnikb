import { CodeNode, CodeEdge } from '../types';
export interface ParseResult {
    filePath: string;
    language: string;
    nodes: CodeNode[];
    edges: CodeEdge[];
    contentHash: string;
}
export declare class CodeParser {
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
    /**
     * TypeScript & JavaScript AST & structural extraction
     */
    private parseTypeScriptOrJavaScript;
    /**
     * Python structural extraction
     */
    private parsePython;
    /**
     * Go structural extraction
     */
    private parseGo;
    /**
     * Rust structural extraction
     */
    private parseRust;
    /**
     * Markdown documentation indexing (connecting docs with code entities)
     */
    private parseMarkdown;
    /**
     * Generic C-Style language parser (Java, C#, C++)
     */
    private parseCStyleGeneric;
    private parseGenericText;
    /**
     * Helper: Extracts function calls from a function's code body
     */
    private extractCallsFromBody;
    private getLineNumber;
    private findMatchingBracketEndLine;
    private findPythonBlockEndLine;
}
