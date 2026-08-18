"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptParser = void 0;
const parser_ts_ast_1 = require("../parser-ts-ast");
class TypeScriptParser {
    extractor = new parser_ts_ast_1.TypeScriptASTExtractor();
    supports(language) {
        return language === 'typescript' || language === 'javascript';
    }
    parse(ctx) {
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
exports.TypeScriptParser = TypeScriptParser;
