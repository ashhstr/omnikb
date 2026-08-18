import { CodeNode, CodeEdge } from '../../types';
export interface ParserContext {
    filePath: string;
    content: string;
    lines: string[];
    nodes: CodeNode[];
    edges: CodeEdge[];
    fileNodeId: string;
    language: string;
}
export interface ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
export declare class ParserUtils {
    static getLineNumber(content: string, charIndex: number): number;
    static findMatchingBracketEndLine(lines: string[], startLine: number): number;
    static extractCallsFromBody(body: string, callerId: string, filePath: string, startLine: number, edges: CodeEdge[]): void;
}
