import { ILanguageParser, ParserContext } from './types';
import { TypeScriptASTExtractor } from '../parser-ts-ast';

export class TypeScriptParser implements ILanguageParser {
  private extractor = new TypeScriptASTExtractor();

  public supports(language: string): boolean {
    return language === 'typescript' || language === 'javascript';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, nodes, edges } = ctx;
    const result = this.extractor.extract(filePath, content);

    for (const node of result.nodes) {
      nodes.push(node);
    }
    for (const edge of result.edges) {
      edges.push(edge);
    }
  }
}
