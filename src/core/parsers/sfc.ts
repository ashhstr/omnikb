import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext } from './types';
import { TypeScriptASTExtractor } from '../parser-ts-ast';

export class SFCParser implements ILanguageParser {
  private tsExtractor: TypeScriptASTExtractor;

  constructor() {
    this.tsExtractor = new TypeScriptASTExtractor();
  }

  public supports(language: string): boolean {
    return language === 'vue' || language === 'svelte';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId, language } = ctx;

    // 1. Extract <script> or <script setup> blocks
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(content)) !== null) {
      const attrs = match[1];
      const scriptCode = match[2];
      const startIndex = match.index;
      
      // Calculate start line of the script body
      const beforeScript = content.slice(0, startIndex);
      const openTag = match[0].match(/<script\b[^>]*>/i)?.[0] || '<script>';
      const startLineOffset = (beforeScript + openTag).split('\n').length - 1;

      // Extract via TypeScript AST Extractor
      const astResult = this.tsExtractor.extract(filePath, scriptCode);

      // Adjust line numbers and append nodes & edges
      for (const node of astResult.nodes) {
        if (node.kind !== 'file') {
          nodes.push({
            ...node,
            startLine: node.startLine + startLineOffset,
            endLine: node.endLine + startLineOffset,
          });
        }
      }

      for (const edge of astResult.edges) {
        edges.push({
          ...edge,
          line: edge.line ? edge.line + startLineOffset : undefined,
        });
      }
    }

    // 2. Extract Vue / Svelte Component Name from filename
    const baseName = filePath.split('/').pop()?.split('.')[0] || 'Component';
    const componentNodeId = `${filePath}#${baseName}`;

    // Add component node if not already added by script default export
    if (!nodes.some((n) => n.id === componentNodeId)) {
      nodes.push({
        id: componentNodeId,
        name: baseName,
        kind: 'class',
        filePath,
        startLine: 1,
        endLine: lines.length,
        signature: `<${baseName} ${language.toUpperCase()} Component>`,
        metadata: {
          isSFC: true,
          framework: language,
        },
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${componentNodeId}`,
        sourceId: fileNodeId,
        targetId: componentNodeId,
        kind: 'contains',
        filePath,
        line: 1,
      });
    }
  }
}
