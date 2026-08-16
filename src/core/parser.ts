import * as crypto from 'crypto';
import * as path from 'path';
import { CodeNode, CodeEdge, NodeKind } from '../types';

export interface ParseResult {
  filePath: string;
  language: string;
  nodes: CodeNode[];
  edges: CodeEdge[];
  contentHash: string;
}

export class CodeParser {
  /**
   * Detects programming language from file extension
   */
  public static detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
      case '.mts':
      case '.cts':
        return 'typescript';
      case '.js':
      case '.jsx':
      case '.mjs':
      case '.cjs':
        return 'javascript';
      case '.py':
      case '.pyw':
        return 'python';
      case '.go':
        return 'go';
      case '.rs':
        return 'rust';
      case '.java':
        return 'java';
      case '.cs':
        return 'csharp';
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c':
      case '.h':
      case '.hpp':
        return 'cpp';
      case '.rb':
        return 'ruby';
      case '.php':
        return 'php';
      case '.md':
      case '.mdx':
      case '.markdown':
        return 'markdown';
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.sql':
        return 'sql';
      default:
        return 'unknown';
    }
  }

  /**
   * Computes SHA-256 hash of file content
   */
  public static computeHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Main parsing entrypoint for any supported file
   */
  public parseFile(relativeFilePath: string, content: string): ParseResult {
    const normPath = relativeFilePath.replace(/\\/g, '/');
    const language = CodeParser.detectLanguage(normPath);
    const contentHash = CodeParser.computeHash(content);

    const nodes: CodeNode[] = [];
    const edges: CodeEdge[] = [];

    // Always create a File node representing the whole file
    const fileNodeId = `file:${normPath}`;
    const lineCount = content.split('\n').length;

    nodes.push({
      id: fileNodeId,
      name: path.basename(normPath),
      kind: 'file',
      filePath: normPath,
      startLine: 1,
      endLine: lineCount,
      contentSnippet: content.slice(0, 300),
      metadata: { language, sizeBytes: Buffer.byteLength(content, 'utf8') },
    });

    try {
      if (language === 'typescript' || language === 'javascript') {
        this.parseTypeScriptOrJavaScript(normPath, content, nodes, edges, fileNodeId);
      } else if (language === 'python') {
        this.parsePython(normPath, content, nodes, edges, fileNodeId);
      } else if (language === 'go') {
        this.parseGo(normPath, content, nodes, edges, fileNodeId);
      } else if (language === 'rust') {
        this.parseRust(normPath, content, nodes, edges, fileNodeId);
      } else if (language === 'markdown') {
        this.parseMarkdown(normPath, content, nodes, edges, fileNodeId);
      } else if (language === 'java' || language === 'csharp' || language === 'cpp') {
        this.parseCStyleGeneric(normPath, content, nodes, edges, fileNodeId, language);
      } else {
        this.parseGenericText(normPath, content, nodes, edges, fileNodeId);
      }
    } catch (err: any) {
      // Fallback gracefully so indexing never fails on malformed files
      console.error(`[OmniKB Parser] Error parsing ${normPath}: ${err?.message || err}`);
    }

    return { filePath: normPath, language, nodes, edges, contentHash };
  }

  /**
   * TypeScript & JavaScript AST & structural extraction
   */
  private parseTypeScriptOrJavaScript(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    const lines = content.split('\n');

    // 1. Imports
    // e.g. import { a, b } from './utils';
    // const x = require('./x');
    const importRegex = /(?:import\s+(?:(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]|['"]([^'"]+)['"])|(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const lineNum = this.getLineNumber(content, match.index);
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
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
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
    // Matches: function foo(...), async function bar(...), const foo = (...) => ..., export function ...
    // Methods inside class: public async doSomething(...)
    const funcRegex = /(?:(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|(?:public|private|protected|static|async|\s)*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[3];
      if (!funcName || ['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(funcName)) {
        continue;
      }

      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const funcId = `${filePath}#${funcName}`;

      // Avoid duplicating class names as functions
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

      // Extract function calls inside this function body
      const funcBody = lines.slice(lineNum - 1, endLine).join('\n');
      this.extractCallsFromBody(funcBody, funcId, filePath, lineNum, edges);
    }

    // 4. Web Framework Routes (Express, Fastify, Next.js, etc.)
    const routeRegex = /(?:app|router|server)\.(get|post|put|delete|patch|options|all)\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?(?:(?:\(([^)]*)\))|([A-Za-z0-9_$.]+))/g;
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const handlerName = match[4] || `inline_handler`;
      const lineNum = this.getLineNumber(content, match.index);
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
        targetId: `${filePath}#${handlerName}`,
        targetName: handlerName,
        kind: 'references',
        filePath,
        line: lineNum,
      });
    }
  }

  /**
   * Python structural extraction
   */
  private parsePython(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    const lines = content.split('\n');

    // 1. Imports: import foo, from foo import bar
    const importRegex = /(?:from\s+([A-Za-z0-9_.]+)\s+import\s+([A-Za-z0-9_,\s*]+)|import\s+([A-Za-z0-9_.,\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const lineNum = this.getLineNumber(content, match.index);
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

    // 2. Classes & Functions with indentation tracking
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
        this.extractCallsFromBody(funcBody, funcId, filePath, lineNum, edges);
      }

      // FastAPI / Flask Route Decorators: @app.get("/api/v1")
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

  /**
   * Go structural extraction
   */
  private parseGo(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    const lines = content.split('\n');

    // 1. Functions & Methods: func (r *Receiver) Method(...) or func Foo(...)
    const funcRegex = /func\s+(?:\((?:[A-Za-z0-9_*,\s]+)\)\s+)?([A-Za-z0-9_]+)\s*\([^)]*\)/g;
    let match: RegExpExecArray | null;

    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1];
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const funcId = `${filePath}#${funcName}`;

      nodes.push({
        id: funcId,
        name: funcName,
        kind: 'function',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 5, lines.length)).join('\n'),
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
      this.extractCallsFromBody(body, funcId, filePath, lineNum, edges);
    }

    // 2. Structs & Interfaces: type MyStruct struct { ... }
    const typeRegex = /type\s+([A-Za-z0-9_]+)\s+(struct|interface)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeName = match[1];
      const kind = match[2] === 'interface' ? 'interface' : 'class';
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const typeId = `${filePath}#${typeName}`;

      nodes.push({
        id: typeId,
        name: typeName,
        kind,
        filePath,
        startLine: lineNum,
        endLine,
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
  }

  /**
   * Rust structural extraction
   */
  private parseRust(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    const lines = content.split('\n');

    // 1. Structs, Enums, Traits: pub struct Foo, trait Bar
    const typeRegex = /(?:pub\s+)?(struct|enum|trait)\s+([A-Za-z0-9_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = typeRegex.exec(content)) !== null) {
      const kindType = match[1] === 'trait' ? 'interface' : 'class';
      const typeName = match[2];
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const typeId = `${filePath}#${typeName}`;

      nodes.push({
        id: typeId,
        name: typeName,
        kind: kindType,
        filePath,
        startLine: lineNum,
        endLine,
        signature: `${match[1]} ${typeName}`,
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

    // 2. Functions: pub fn foo(...) -> ...
    const fnRegex = /(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)\s*(?:<[^>]+>)?\s*\([^)]*\)/g;
    while ((match = fnRegex.exec(content)) !== null) {
      const funcName = match[1];
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const funcId = `${filePath}#${funcName}`;

      nodes.push({
        id: funcId,
        name: funcName,
        kind: 'function',
        filePath,
        startLine: lineNum,
        endLine,
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
      this.extractCallsFromBody(body, funcId, filePath, lineNum, edges);
    }
  }

  /**
   * Markdown documentation indexing (connecting docs with code entities)
   */
  private parseMarkdown(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const lineNum = i + 1;
        const sectionId = `${filePath}#section:${title.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

        // Find end of section (next heading of equal or higher level, or EOF)
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

        // Search for code references like `MyClass` or `foo()` in the section text
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

  /**
   * Generic C-Style language parser (Java, C#, C++)
   */
  private parseCStyleGeneric(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string,
    language: string
  ): void {
    const lines = content.split('\n');

    // Classes / Interfaces
    const classRegex = /(?:public|private|protected|internal|abstract|static|\s)*\s+(class|interface|struct)\s+([A-Za-z0-9_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(content)) !== null) {
      const typeName = match[2];
      const kindType = match[1] === 'interface' ? 'interface' : 'class';
      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
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

    // Methods
    const methodRegex = /(?:public|private|protected|static|final|native|synchronized|async|\s)+\s+[A-Za-z0-9_<>[\]]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (['if', 'for', 'while', 'switch', 'catch'].includes(methodName)) continue;

      const lineNum = this.getLineNumber(content, match.index);
      const endLine = this.findMatchingBracketEndLine(lines, lineNum);
      const methodId = `${filePath}#${methodName}`;

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
      this.extractCallsFromBody(body, methodId, filePath, lineNum, edges);
    }
  }

  private parseGenericText(
    filePath: string,
    content: string,
    nodes: CodeNode[],
    edges: CodeEdge[],
    fileNodeId: string
  ): void {
    // Keep file node for text files, no specific AST
  }

  /**
   * Helper: Extracts function calls from a function's code body
   */
  private extractCallsFromBody(
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
      // Ignore common keywords and built-in controls
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

  private getLineNumber(content: string, charIndex: number): number {
    return content.slice(0, charIndex).split('\n').length;
  }

  private findMatchingBracketEndLine(lines: string[], startLine: number): number {
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

  private findPythonBlockEndLine(lines: string[], startLineIndex: number, parentIndent: number): number {
    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines
      const currentIndent = line.search(/\S/);
      if (currentIndent !== -1 && currentIndent <= parentIndent) {
        return i;
      }
    }
    return lines.length;
  }
}
