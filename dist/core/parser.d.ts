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
     * TypeScript & JavaScript AST-based structural extraction.
     * Uses the TypeScript Compiler API for exact extraction (zero false
     * positives on strings/templates/self-edges), falling back to the legacy
     * regex pipeline for malformed files.
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
    /**
     * Removes single/double-quoted strings and template literals (including
     * multi-line ones) from a code body, preserving code structure for regex
     * call extraction.
     */
    private stripStringLiterals;
    private getLineNumber;
    private findMatchingBracketEndLine;
    private findPythonBlockEndLine;
}
