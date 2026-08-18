import { ILanguageParser, ParserContext } from './types';
export declare class JvmParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
