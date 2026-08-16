import { CodeNode, CodeEdge } from '../../types';
import { ILanguageParser, ParserContext, ParserUtils } from './types';

export class PrismaParser implements ILanguageParser {
  public supports(language: string): boolean {
    return language === 'prisma';
  }

  public parse(ctx: ParserContext): void {
    const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;

    const modelRegex = /^(\s*)model\s+([A-Za-z0-9_]+)\s*\{/gm;
    const enumRegex = /^(\s*)enum\s+([A-Za-z0-9_]+)\s*\{/gm;
    let match: RegExpExecArray | null;

    // 1. Extract Models & Fields & Relations
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[2];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const modelId = `${filePath}#${modelName}`;
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);

      const modelBlock = lines.slice(lineNum - 1, endLine);
      const fields: Array<{ name: string; type: string; isRelation?: boolean; relationTarget?: string }> = [];

      for (let i = 1; i < modelBlock.length - 1; i++) {
        const fieldLine = modelBlock[i].trim();
        if (!fieldLine || fieldLine.startsWith('//') || fieldLine.startsWith('@@')) continue;

        const fieldMatch = fieldLine.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_?\[\]]+)(.*)$/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const rawType = fieldMatch[2].replace(/[?\[\]]/g, '');
          const attributes = fieldMatch[3] || '';

          // Check if relation attribute
          const relationMatch = attributes.match(/@relation\([^)]*\)/);
          const isRelation = !!relationMatch || /^[A-Z]/.test(rawType); // In Prisma, capitalized non-primitives are model relations

          fields.push({
            name: fieldName,
            type: rawType,
            isRelation,
            relationTarget: isRelation ? rawType : undefined,
          });

          if (isRelation && rawType !== 'String' && rawType !== 'Int' && rawType !== 'Boolean' && rawType !== 'DateTime' && rawType !== 'Json' && rawType !== 'Float' && rawType !== 'Decimal' && rawType !== 'BigInt' && rawType !== 'Bytes') {
            const relLine = lineNum + i;
            edges.push({
              id: `edge:references:${modelId}:${rawType}:${relLine}`,
              sourceId: modelId,
              targetId: `sym:${rawType}`,
              targetName: rawType,
              kind: 'references',
              filePath,
              line: relLine,
              metadata: {
                relationField: fieldName,
                targetModel: rawType,
                isPrismaRelation: true,
              },
            });
          }
        }
      }

      nodes.push({
        id: modelId,
        name: modelName,
        kind: 'class',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: modelBlock.slice(0, 10).join('\n'),
        signature: `model ${modelName}`,
        metadata: {
          isDatabaseModel: true,
          schemaType: 'prisma',
          fieldsCount: fields.length,
          fields,
        },
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${modelId}`,
        sourceId: fileNodeId,
        targetId: modelId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });
    }

    // 2. Extract Enums
    while ((match = enumRegex.exec(content)) !== null) {
      const enumName = match[2];
      const lineNum = ParserUtils.getLineNumber(content, match.index);
      const enumId = `${filePath}#${enumName}`;
      const endLine = ParserUtils.findMatchingBracketEndLine(lines, lineNum);

      nodes.push({
        id: enumId,
        name: enumName,
        kind: 'type',
        filePath,
        startLine: lineNum,
        endLine,
        contentSnippet: lines.slice(lineNum - 1, endLine).join('\n'),
        signature: `enum ${enumName}`,
        metadata: {
          isDatabaseEnum: true,
          schemaType: 'prisma',
        },
      });

      edges.push({
        id: `edge:contains:${fileNodeId}:${enumId}`,
        sourceId: fileNodeId,
        targetId: enumId,
        kind: 'contains',
        filePath,
        line: lineNum,
      });
    }
  }
}
