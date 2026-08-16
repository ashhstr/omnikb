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

export class ParserUtils {
  public static getLineNumber(content: string, charIndex: number): number {
    return content.slice(0, charIndex).split('\n').length;
  }

  public static findMatchingBracketEndLine(lines: string[], startLine: number): number {
    let depth = 0;
    let foundOpen = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === '{') {
          depth++;
          foundOpen = true;
        } else if (ch === '}') {
          depth--;
          if (foundOpen && depth === 0) {
            return i + 1;
          }
        }
      }
    }
    return Math.min(startLine + 20, lines.length);
  }

  public static extractCallsFromBody(
    body: string,
    callerId: string,
    filePath: string,
    startLine: number,
    edges: CodeEdge[]
  ): void {
    const callRegex = /(?:(?:\.|\b)([A-Za-z0-9_$]+))\s*\(/g;
    let match: RegExpExecArray | null;
    const seen = new Set<string>();

    while ((match = callRegex.exec(body)) !== null) {
      const callee = match[1];
      if (
        [
          'if', 'for', 'while', 'switch', 'catch', 'require', 'import', 'return',
          'console', 'log', 'error', 'warn', 'info', 'typeof', 'sizeof', 'new'
        ].includes(callee)
      ) {
        continue;
      }

      if (!seen.has(callee)) {
        seen.add(callee);
        const callLine = startLine + this.getLineNumber(body, match.index) - 1;

        edges.push({
          id: `edge:calls:${callerId}:${callee}:${callLine}`,
          sourceId: callerId,
          targetId: `sym:${callee}`,
          targetName: callee,
          kind: 'calls',
          filePath,
          line: callLine,
          confidence: 'inferred',
        });
      }
    }
  }
}
