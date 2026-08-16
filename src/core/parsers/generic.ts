import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class MarkdownParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'markdown';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, lines, nodes, edges, fileNodeId } = ctx;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const lineNum = i + 1;
        const sectionId = `${filePath}#section:${title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

        let endLine = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          const nextHeading = lines[j].match(/^(#{1,6})\s+/);
          if (nextHeading && nextHeading[1].length <= level) {
            endLine = j;
            break;
          }
        }

        const snippet = lines.slice(i, Math.min(i + 5, endLine)).join('\n');

        nodes.push({
          id: sectionId,
          name: title,
          kind: 'doc_section',
          filePath,
          startLine: lineNum,
          endLine,
          contentSnippet: snippet,
          metadata: { headingLevel: level },
        });

        edges.push({
          id: `edge:contains:${fileNodeId}:${sectionId}`,
          sourceId: fileNodeId,
          targetId: sectionId,
          kind: 'contains',
          filePath,
          line: lineNum,
        });

        const codeRefRegex = /`([A-Za-z0-9_$.]+(?:\(\))?)`/g;
        let refMatch: RegExpExecArray | null;
        const sectionText = lines.slice(i, endLine).join('\n');

        while ((refMatch = codeRefRegex.exec(sectionText)) !== null) {
          const rawSymbol = refMatch[1].replace('()', '');
          if (rawSymbol.length > 2 && !/^(true|false|null|undefined|string|number|boolean)$/.test(rawSymbol)) {
            edges.push({
              id: `edge:documents:${sectionId}:${rawSymbol}`,
              sourceId: sectionId,
              targetId: `sym:${rawSymbol}`,
              targetName: rawSymbol,
              kind: 'documents',
              filePath,
              line: lineNum,
            });
          }
        }
      }
    }
  }
}

export class CStyleGenericParser implements ILanguageParser {
  public supports(language: string): boolean {
    return ['java', 'csharp', 'cpp', 'php', 'ruby'].includes(language);
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    // Classes / Interfaces / Structs
    const classRegex = /(?:public|private|protected|internal|abstract|static|final|\s)*\s+(class|interface|struct|trait)\s+([A-Za-z0-9_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(content)) !== null) {
      const typeName = match[2];
      const kindType = match[1] === 'interface' || match[1] === 'trait' ? 'interface' : 'class';
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const classId = `${filePath}#${typeName}`;

      nodes.push({
        id: classId,
        name: typeName,
        kind: kindType,
        filePath,
        startLine: lineNum,
        endLine,
        signature: `${match[1]} ${typeName}`,
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${classId}`,
        sourceId: fileNodeId,
        targetId: classId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });
    }

    // Methods / Functions
    const methodRegex = /(?:public|private|protected|static|final|native|synchronized|async|function|\s)+\s*(?:[A-Za-z0-9_<>[\]]+\s+)?([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'function'].includes(methodName)) continue;

      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const methodId = `${filePath}#${methodName}`;

      if (nodes.some((n) => n.id === methodId)) continue;

      nodes.push({
        id: methodId,
        name: methodName,
        kind: 'method',
        filePath,
        startLine: lineNum,
        endLine,
        signature: lines[lineNum - 1]?.trim() || methodName,
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${methodId}`,
        sourceId: fileNodeId,
        targetId: methodId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });

      const body = lines.slice(lineNum - 1, endLine).join('\n');
      ParserUtils.extractCallsFromBody(body, methodId, filePath, lineNum, edges);
    }
  }
}
