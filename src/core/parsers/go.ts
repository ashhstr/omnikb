import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class GoParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'go';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    // 1. Package & Imports
    const pkgMatch = content.match(/package\s+([A-Za-z0-9_]+)/);
    if (pkgMatch) {
      const pkgName = pkgMatch[1];
      const lineNum = ParserUtils.getLineNumber(content, pkgMatch.index || 0);
      const pkgId = `pkg:${pkgName}`;

      edges.push({
        id: `edge:package:${fileNodeId}:${pkgId}`,
        sourceId: fileNodeId,
        targetId: pkgId,
        targetName: pkgName,
        kind: 'contains',
        filePath,
        line: lineNum,
      });
    }

    // Go Imports: import "fmt" or import ( "net/http" \n "io" )
    const importBlockRegex = /import\s*\(([\s\S]*?)\)/g;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = importBlockRegex.exec(content)) !== null) {
      const lineNum = ParserUtils.getLineNumber(content, blockMatch.index);
      const importLines = blockMatch[1].split('\n');
      for (const impLine of importLines) {
        const singleMatch = impLine.match(/(?:([A-Za-z0-9_]+)\s+)?["']([^"']+)["']/);
        if (singleMatch) {
          const importPath = singleMatch[2];
          edges.push({
            id: `edge:import:${filePath}:${lineNum}:${importPath}`,
            sourceId: fileNodeId,
            targetId: `pkg:${importPath}`,
            targetName: importPath,
            kind: 'imports',
            filePath,
            line: lineNum,
          });
        }
      }
    }

    const singleImportRegex = /import\s+(?:([A-Za-z0-9_]+)\s+)?["']([^"']+)["']/g;
    let singleMatch: RegExpExecArray | null;
    while ((singleMatch = singleImportRegex.exec(content)) !== null) {
      const lineNum = ParserUtils.getLineNumber(content, singleMatch.index);
      const importPath = singleMatch[2];
      edges.push({
        id: `edge:import:${filePath}:${lineNum}:${importPath}`,
        sourceId: fileNodeId,
        targetId: `pkg:${importPath}`,
        targetName: importPath,
        kind: 'imports',
        filePath,
        line: lineNum,
      });
    }

    // 2. Structs & Interfaces: type Server struct { ... }, type Handler interface { ... }
    const typeRegex = /type\s+([A-Za-z0-9_]+)\s+(struct|interface)\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeName = match[1];
      const kindType = match[2] === 'interface' ? 'interface' : 'class';
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
        signature: `type ${typeName} ${match[2]}`,
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

    // 3. Functions & Methods: func (r *Receiver) MethodName(...) or func FunctionName(...)
    const funcRegex = /func\s+(?:\(\s*([A-Za-z0-9_*,\s]+)\s*\)\s+)?([A-Za-z0-9_]+)\s*\([^)]*\)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const receiver = match[1]?.trim();
      const funcName = match[2];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);

      let fullName = funcName;
      let parentStruct = '';
      if (receiver) {
        const parts = receiver.split(/\s+/);
        const typePart = parts[parts.length - 1].replace(/[*&]/g, '');
        parentStruct = typePart;
        fullName = `${typePart}.${funcName}`;
      }

      const funcId = `${filePath}#${fullName}`;

      nodes.push({
        id: funcId,
        name: fullName,
        kind: receiver ? 'method' : 'function',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n'),
        signature: lines[lineNum - 1]?.trim() || fullName,
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${funcId}`,
        sourceId: fileNodeId,
        targetId: funcId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });

      if (parentStruct) {
        edges.push({
          id: `edge:member:${filePath}#${parentStruct}:${funcId}`,
          sourceId: `${filePath}#${parentStruct}`,
          targetId: funcId,
          kind: 'contains',
          filePath,
          line: lineNum,
        });
      }

      const funcBody = lines.slice(lineNum - 1, endLine).join('\n');
      ParserUtils.extractCallsFromBody(funcBody, funcId, filePath, lineNum, edges);
    }
  }
}
