import { ILanguageParser, ParserContext } from './types';
export declare class PhpParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
