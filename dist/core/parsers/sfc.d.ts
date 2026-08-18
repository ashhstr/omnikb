import { ILanguageParser, ParserContext } from './types';
export declare class SFCParser implements ILanguageParser {
    private tsExtractor;
    constructor();
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
