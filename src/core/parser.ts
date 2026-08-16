import * as crypto from 'crypto';
import * as path from 'path';
import { CodeNode, CodeEdge } from '../types';
import { ILanguageParser, ParserContext } from './parsers/types';
import { TypeScriptParser } from './parsers/typescript';
import { PythonParser } from './parsers/python';
import { GoParser } from './parsers/go';
import { RustParser } from './parsers/rust';
import { MarkdownParser, CStyleGenericParser } from './parsers/generic';

export interface ParseResult {
  filePath: string;
  language: string;
  nodes: CodeNode[];
  edges: CodeEdge[];
  contentHash: string;
}

export class CodeParser {
  private parsers: ILanguageParser[];

  constructor() {
    this.parsers = [
      new TypeScriptParser(),
      new PythonParser(),
      new GoParser(),
      new RustParser(),
      new MarkdownParser(),
      new CStyleGenericParser(),
    ];
  }

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
    const lines = content.split('\n');
    const lineCount = lines.length;

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

    const ctx: ParserContext = {
      filePath: normPath,
      content,
      lines,
      nodes,
      edges,
      fileNodeId,
      language,
    };

    try {
      const parser = this.parsers.find((p) => p.supports(language));
      if (parser) {
        parser.parse(ctx);
      }
    } catch (err: any) {
      console.error(`[OmniKB Parser] Error parsing ${normPath}: ${err?.message || err}`);
    }

    return { filePath: normPath, language, nodes, edges, contentHash };
  }
}
