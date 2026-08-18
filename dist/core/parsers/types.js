"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserUtils = void 0;
class ParserUtils {
    static getLineNumber(content, charIndex) {
        return content.slice(0, charIndex).split('\n').length;
    }
    static findMatchingBracketEndLine(lines, startLine) {
        let depth = 0;
        let foundOpen = false;
        for (let i = startLine - 1; i < lines.length; i++) {
            const line = lines[i];
            for (const ch of line) {
                if (ch === '{') {
                    depth++;
                    foundOpen = true;
                }
                else if (ch === '}') {
                    depth--;
                    if (foundOpen && depth === 0) {
                        return i + 1;
                    }
                }
            }
        }
        return Math.min(startLine + 20, lines.length);
    }
    static extractCallsFromBody(body, callerId, filePath, startLine, edges) {
        const callRegex = /(?:(?:\.|\b)([A-Za-z0-9_$]+))\s*\(/g;
        let match;
        const seen = new Set();
        const callerName = callerId.split('#')[1] || callerId;
        while ((match = callRegex.exec(body)) !== null) {
            const callee = match[1];
            if ([
                'if', 'for', 'while', 'switch', 'catch', 'require', 'import', 'return',
                'console', 'log', 'error', 'warn', 'info', 'typeof', 'sizeof', 'new',
                'def', 'class', 'func', 'fn', 'lambda', 'struct'
            ].includes(callee)) {
                continue;
            }
            const callLine = startLine + this.getLineNumber(body, match.index) - 1;
            if (callee === callerName && callLine === startLine) {
                continue;
            }
            if (!seen.has(callee)) {
                seen.add(callee);
                edges.push({
                    id: `edge:calls:${callerId}:${callee}:${callLine}`,
                    sourceId: callerId,
                    targetId: `sym:${callee}`,
                    targetName: callee,
                    kind: 'calls',
                    filePath,
                    line: callLine,
                    confidence: 'inferred',
                });
            }
        }
    }
}
exports.ParserUtils = ParserUtils;
