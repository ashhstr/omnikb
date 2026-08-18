import { ILanguageParser, ParserContext } from './types';
export declare class TypeScriptParser implements ILanguageParser {
    private extractor;
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
