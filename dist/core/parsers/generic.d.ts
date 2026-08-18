import { ILanguageParser, ParserContext } from './types';
export declare class MarkdownParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
export declare class CStyleGenericParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
