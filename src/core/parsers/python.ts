import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class PythonParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'python';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    // 1. Imports
    const importRegex = /(?:from\s+([A-Za-z0-9_.]+)\s+import\s+([A-Za-z0-9_,\s*]+)|import\s+([A-Za-z0-9_.,\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const fromModule = match[1] || '';
      const directImports = match[3] || '';
      const importedSymbols = match[2] ? match[2].split(',').map((s) => s.trim()) : directImports.split(',').map((s) => s.trim());

      edges.push({
        id: `edge:import:${filePath}:${lineNum}:${fromModule || directImports}`,
        sourceId: fileNodeId,
        targetId: `file:${fromModule || directImports}`,
        targetName: fromModule || directImports,
        kind: 'imports',
        filePath,
        line: lineNum,
        metadata: { importedSymbols },
      });
    }

    // 2. Classes, Functions, and Route Decorators
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      // Class definition: class Foo(Bar, Baz):
      const classMatch = line.match(/^(\s*)class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:/);
      if (classMatch) {
        const indent = classMatch[1].length;
        const className = classMatch[2];
        const bases = classMatch[3] ? classMatch[3].split(',').map((s) => s.trim()) : [];
        const classId = `${filePath}#${className}`;
        const endLine = this.findPythonBlockEndLine(lines, i, indent);

        nodes.push({
          id: classId,
          name: className,
          kind: 'class',
          filePath,
          startLine: lineNum,
          endLine,
          contentSnippet: lines.slice(i, Math.min(i + 5, lines.length)).join('\n'),
          signature: trimmed,
        });

        edges.push({
          id: `edge:contains:${fileNodeId}:${classId}`,
          sourceId: fileNodeId,
          targetId: classId,
          kind: 'contains',
          filePath,
          line: lineNum,
        });

        for (const base of bases) {
          if (base && base !== 'object') {
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
        continue;
      }

      // Function definition: def foo(bar, baz): / async def foo(bar):
      const funcMatch = line.match(/^(\s*)(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const indent = funcMatch[1].length;
        const funcName = funcMatch[2];
        const funcId = `${filePath}#${funcName}`;
        const endLine = this.findPythonBlockEndLine(lines, i, indent);

        nodes.push({
          id: funcId,
          name: funcName,
          kind: 'function',
          filePath,
          startLine: lineNum,
          endLine,
          contentSnippet: lines.slice(i, Math.min(i + 6, lines.length)).join('\n'),
          signature: trimmed,
        });

        edges.push({
          id: `edge:contains:${fileNodeId}:${funcId}`,
          sourceId: fileNodeId,
          targetId: funcId,
          kind: 'contains',
          filePath,
          line: lineNum,
        });

        const funcBody = lines.slice(i, endLine).join('\n');
        ParserUtils.extractCallsFromBody(funcBody, funcId, filePath, lineNum, edges);
      }

      // Route decorators (FastAPI / Flask)
      const routeMatch = line.match(/@(app|router)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const method = routeMatch[2].toUpperCase();
        const routePath = routeMatch[3];
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
      }
    }
  }

  private findPythonBlockEndLine(lines: string[], startLineIndex: number, parentIndent: number): number {
    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const currentIndent = line.search(/\S/);
      if (currentIndent !== -1 && currentIndent <= parentIndent) {
        return i;
      }
    }
    return lines.length;
  }
}
