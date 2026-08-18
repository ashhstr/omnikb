import { ILanguageParser, ParserContext } from './types';
export declare class SqlDdlParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
