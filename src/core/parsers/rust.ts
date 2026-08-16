import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class RustParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'rust';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    // 1. Uses & Modules: use std::sync::Arc; mod utils;
    const useRegex = /(?:pub\s+)?use\s+([A-Za-z0-9_:]+(?:\{[^}]+\})?);/g;
    let match: RegExpExecArray | null;
    while ((match = useRegex.exec(content)) !== null) {
      const usePath = match[1];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      edges.push({
        id: `edge:import:${filePath}:${lineNum}:${usePath}`,
        sourceId: fileNodeId,
        targetId: `crate:${usePath}`,
        targetName: usePath,
        kind: 'imports',
        filePath,
        line: lineNum,
      });
    }

    // 2. Structs, Enums, Traits
    const typeRegex = /(?:pub(?:\([^)]*\))?\s+)?(struct|enum|trait|union)\s+([A-Za-z0-9_]+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeKind = match[1];
      const typeName = match[2];
      const kindType = typeKind === 'trait' ? 'interface' : 'class';
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const typeId = `${filePath}#${typeName}`;

      nodes.push({
        id: typeId,
        name: typeName,
        kind: kindType,
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 5, lines.length)).join('\n'),
        signature: `${typeKind} ${typeName}`,
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${typeId}`,
        sourceId: fileNodeId,
        targetId: typeId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });
    }

    // 3. Impl blocks: impl Foo, impl Bar for Foo
    const implRegex = /impl(?:<[^>]+>)?\s+(?:([A-Za-z0-9_:]+)\s+for\s+)?([A-Za-z0-9_]+)/g;
    while ((match = implRegex.exec(content)) !== null) {
      const traitName = match[1];
      const targetStruct = match[2];
      const lineNum = ParserUtils.getLineNumber(content, match.index);

      if (traitName && targetStruct) {
        edges.push({
          id: `edge:implements:${filePath}#${targetStruct}:${traitName}`,
          sourceId: `${filePath}#${targetStruct}`,
          targetId: `sym:${traitName}`,
          targetName: traitName,
          kind: 'implements',
          filePath,
          line: lineNum,
        });
      }
    }

    // 4. Functions & Methods: pub fn foo(...) -> ... / fn bar(...)
    const fnRegex = /(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:const\s+)?(?:extern(?:\s+"[a-zA-Z]+")?\s+)?fn\s+([A-Za-z0-9_]+)\s*(?:<[^>]+>)?\s*\([^)]*\)/g;
    while ((match = fnRegex.exec(content)) !== null) {
      const funcName = match[1];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const funcId = `${filePath}#${funcName}`;

      nodes.push({
        id: funcId,
        name: funcName,
        kind: 'function',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n'),
        signature: lines[lineNum - 1]?.trim() || funcName,
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${funcId}`,
        sourceId: fileNodeId,
        targetId: funcId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });

      const body = lines.slice(lineNum - 1, endLine).join('\n');
      ParserUtils.extractCallsFromBody(body, funcId, filePath, lineNum, edges);
    }
  }
}
