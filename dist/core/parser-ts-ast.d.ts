import { CodeNode, CodeEdge } from '../types';
export interface ASTExtractResult {
    nodes: CodeNode[];
    edges: CodeEdge[];
}
export declare class TypeScriptASTExtractor {
    /**
     * Extracts code nodes and edges from TypeScript/JavaScript source via the
     * TypeScript Compiler API. AST-based extraction guarantees zero false
     * positives: string literals, template literals, comments, and self-edges
     * are structurally impossible.
     */
    extract(filePath: string, content: string): ASTExtractResult;
    private detectScriptKind;
    private extractImports;
    private walkDeclarations;
    private extractCalls;
    private collectCallExpressions;
    private resolveConstructorName;
    private resolveCalleeName;
    private extractRoutes;
}
