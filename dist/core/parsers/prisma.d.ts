import { ILanguageParser, ParserContext } from './types';
export declare class PrismaParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
}
