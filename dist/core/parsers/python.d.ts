import { ILanguageParser, ParserContext } from './types';
export declare class PythonParser implements ILanguageParser {
    supports(language: string): boolean;
    parse(ctx: ParserContext): void;
    private findPythonBlockEndLine;
}
