import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class TypeScriptParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'typescript' || language === 'javascript';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    // 1. Imports
    const importRegex = /(?:import\s+(?:(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]|['"]([^'"]+)['"])|(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const importPath = match[4] || match[5] || match[7] || '';
      const importedSymbols = (match[2] ? match[2].split(',').map((s) => s.trim().split(' as ')[0]) : [match[1] || match[3] || match[6]]).filter(Boolean);

      edges.push({
        id: `edge:import:${filePath}:${lineNum}:${importPath}`,
        sourceId: fileNodeId,
        targetId: `file:${importPath}`,
        targetName: importPath,
        kind: 'imports',
        filePath,
        line: lineNum,
        metadata: { importedSymbols },
      });
    }

    // 2. Classes & Interfaces
    const classRegex = /(?:export\s+)?(?:abstract\s+)?(class|interface)\s+([A-Za-z0-9_$]+)(?:<[^>]+>)?(?:\s+extends\s+([A-Za-z0-9_$,\s<>]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s<>]+))?/g;
    while ((match = classRegex.exec(content)) !== null) {
      const kindType = match[1] === 'interface' ? 'interface' : 'class';
      const className = match[2];
      const extendsClause = match[3];
      const implementsClause = match[4];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const classId = `${filePath}#${className}`;

      const snippet = lines.slice(lineNum - 1, Math.min(lineNum + 4, lines.length)).join('\n');

      const classNode: CodeNode = {
        id: classId,
        name: className,
        kind: kindType,
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: snippet,
        signature: `${match[1]} ${className}`,
      };
      nodes.push(classNode);

      edges.push({
        id: `edge:contains:${fileNodeId}:${classId}`,
        sourceId: fileNodeId,
        targetId: classId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });

      if (extendsClause) {
        const baseClasses = extendsClause.split(',').map((s) => s.trim().split('<')[0]);
        for (const base of baseClasses) {
          edges.push({
            id: `edge:extends:${classId}:${base}`,
            sourceId: classId,
            targetId: `sym:${base}`,
            targetName: base,
            kind: 'extends',
            filePath,
            line: lineNum,
          });
        }
      }

      if (implementsClause) {
        const interfaces = implementsClause.split(',').map((s) => s.trim().split('<')[0]);
        for (const iface of interfaces) {
          edges.push({
            id: `edge:implements:${classId}:${iface}`,
            sourceId: classId,
            targetId: `sym:${iface}`,
            targetName: iface,
            kind: 'implements',
            filePath,
            line: lineNum,
          });
        }
      }
    }

    // 3. Functions & Methods
    const funcRegex = /(?:(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|(?:public|private|protected|static|async|\s)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[3];
      if (!funcName || ['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(funcName)) {
        continue;
      }

      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);
      const funcId = `${filePath}#${funcName}`;

      if (nodes.some((n) => n.id === funcId)) continue;

      const snippet = lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n');

      nodes.push({
        id: funcId,
        name: funcName,
        kind: 'function',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: snippet,
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

      const funcBody = lines.slice(lineNum - 1, endLine).join('\n');
      ParserUtils.extractCallsFromBody(funcBody, funcId, filePath, lineNum, edges);
    }

    // 4. Web Framework Routes
    const routeRegex = /(?:app|router|server)\.(get|post|put|delete|patch|options|all)\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?(?:(?:\(([^)]*)\))|([A-Za-z0-9_$.]+))/g;
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const handlerName = match[4] || `inline_handler`;
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const routeId = `route:${method}:${routePath}`;

      nodes.push({
        id: routeId,
        name: `${method} ${routePath}`,
        kind: 'route',
        filePath,
        startLine: lineNum,
        endLine: lineNum,
        signature: `${method} ${routePath}`,
        metadata: { method, routePath },
      });

      edges.push({
        id: `edge:references:${routeId}:${handlerName}`,
        sourceId: routeId,
        targetId: `sym:${handlerName}`,
        targetName: handlerName,
        kind: 'references',
        filePath,
        line: lineNum,
      });
    }
  }
}
