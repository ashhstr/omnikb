import { ILanguageParser, ParserContext } from './types';
export declare class DartParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
