import { ILanguageParser, ParserContext } from './types';
export declare class RustParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
