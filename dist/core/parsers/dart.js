"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DartParser = void 0;
const types_1 = require("./types");
class DartParser {
    supports(language) {
        return language === 'dart';
    }
    parse(ctx) {
        const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;
        // 1. Imports and Part statements
        const importRegex = /(?:import|export|part)\s+['"]([^'"]+)['"](?:\s+as\s+([A-Za-z0-9_$]+))?(?:\s+show\s+([A-Za-z0-9_$,\s]+))?;/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const lineNum = types_1.ParserUtils.getLineNumber(content, match.index);
            const rawUri = match[1];
            const alias = match[2];
            const shownSymbols = match[3] ? match[3].split(',').map((s) => s.trim()) : [];
            edges.push({
                id: `edge:import:${filePath}:${lineNum}:${rawUri}`,
                sourceId: fileNodeId,
                targetId: rawUri.startsWith('package:') ? `pkg:${rawUri}` : `file:${rawUri}`,
                targetName: rawUri,
                kind: 'imports',
                filePath,
                line: lineNum,
                metadata: {
                    rawUri,
                    alias,
                    shownSymbols,
                    isPackage: rawUri.startsWith('package:'),
                },
            });
        }
        // 2. Class, Enum, Mixin, and Top-level Provider Declarations
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const lineNum = i + 1;
            // Class / Abstract Class / Mixin definition:
            // class MyWidget extends StatelessWidget with DiagnosticableTreeMixin implements IWidget
            const classMatch = line.match(/^(?:\s*)(?:abstract\s+)?(?:class|mixin|enum|extension)\s+([A-Za-z0-9_$]+)(?:<[^>]+>)?(?:\s+extends\s+([A-Za-z0-9_$<>,\s]+))?(?:\s+with\s+([A-Za-z0-9_$<>,\s]+))?(?:\s+implements\s+([A-Za-z0-9_$<>,\s]+))?/);
            if (classMatch && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                const className = classMatch[1];
                const extendsClause = classMatch[2] ? classMatch[2].trim().split('<')[0] : '';
                const withClause = classMatch[3] ? classMatch[3].split(',').map((s) => s.trim().split('<')[0]) : [];
                const implementsClause = classMatch[4]
                    ? classMatch[4].split(',').map((s) => s.trim().split('<')[0])
                    : [];
                const isWidget = extendsClause === 'StatelessWidget' ||
                    extendsClause === 'StatefulWidget' ||
                    extendsClause.startsWith('State');
                const classId = `${filePath}#${className}`;
                const endLine = types_1.ParserUtils.findMatchingBracketEndLine(lines, lineNum);
                nodes.push({
                    id: classId,
                    name: className,
                    kind: 'class',
                    filePath,
                    startLine: lineNum,
                    endLine,
                    contentSnippet: lines.slice(i, Math.min(i + 6, lines.length)).join('\n'),
                    signature: trimmed,
                    metadata: {
                        isWidget,
                        baseClass: extendsClause || undefined,
                        mixins: withClause.length ? withClause : undefined,
                        implements: implementsClause.length ? implementsClause : undefined,
                    },
                });
                edges.push({
                    id: `edge:contains:${fileNodeId}:${classId}`,
                    sourceId: fileNodeId,
                    targetId: classId,
                    kind: 'contains',
                    filePath,
                    line: lineNum,
                });
                if (extendsClause) {
                    edges.push({
                        id: `edge:extends:${classId}:${extendsClause}`,
                        sourceId: classId,
                        targetId: `sym:${extendsClause}`,
                        targetName: extendsClause,
                        kind: 'extends',
                        filePath,
                        line: lineNum,
                    });
                }
                for (const impl of implementsClause) {
                    if (impl) {
                        edges.push({
                            id: `edge:implements:${classId}:${impl}`,
                            sourceId: classId,
                            targetId: `sym:${impl}`,
                            targetName: impl,
                            kind: 'implements',
                            filePath,
                            line: lineNum,
                        });
                    }
                }
                continue;
            }
            // Methods and functions in Dart:
            // Widget build(BuildContext context) { / Future<void> fetchData() async { / void doSomething() {
            const methodMatch = line.match(/^(?:\s*)(?:@override\s+)?(?:(?:Future|Stream|Widget|void|int|double|String|bool|[A-Za-z0-9_$<>]+)\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)(?:\s+async\*?|\s+sync\*?)?\s*(?:=>|\{)/);
            if (methodMatch &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('*') &&
                !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(methodMatch[1])) {
                const methodName = methodMatch[1];
                const funcId = `${filePath}#${methodName}`;
                const endLine = types_1.ParserUtils.findMatchingBracketEndLine(lines, lineNum);
                nodes.push({
                    id: funcId,
                    name: methodName,
                    kind: 'function',
                    filePath,
                    startLine: lineNum,
                    endLine,
                    contentSnippet: lines.slice(i, Math.min(i + 5, lines.length)).join('\n'),
                    signature: trimmed,
                });
                edges.push({
                    id: `edge:contains:${fileNodeId}:${funcId}`,
                    sourceId: fileNodeId,
                    targetId: funcId,
                    kind: 'contains',
                    filePath,
                    line: lineNum,
                });
                const body = lines.slice(i, endLine).join('\n');
                types_1.ParserUtils.extractCallsFromBody(body, funcId, filePath, lineNum, edges);
            }
            // Route Registration (GoRoute style or Route mapping)
            // GoRoute(path: '/profile', builder: ...)
            const routeMatch = line.match(/GoRoute\s*\(\s*path:\s*['"]([^'"]+)['"]/);
            if (routeMatch) {
                const routePath = routeMatch[1];
                const routeId = `route:NAV:${routePath}`;
                nodes.push({
                    id: routeId,
                    name: `NAV ${routePath}`,
                    kind: 'route',
                    filePath,
                    startLine: lineNum,
                    endLine: lineNum,
                    signature: `GoRoute(path: '${routePath}')`,
                    metadata: { type: 'flutter_navigation', routePath },
                });
            }
            // Riverpod / Provider declarations
            // final counterProvider = StateNotifierProvider<...>((ref) => ...);
            const providerMatch = line.match(/^(?:\s*)final\s+([A-Za-z0-9_$]+Provider)\s*=\s*([A-Za-z0-9_$]+)/);
            if (providerMatch) {
                const providerName = providerMatch[1];
                const providerType = providerMatch[2];
                const providerId = `${filePath}#${providerName}`;
                nodes.push({
                    id: providerId,
                    name: providerName,
                    kind: 'variable',
                    filePath,
                    startLine: lineNum,
                    endLine: lineNum,
                    signature: trimmed,
                    metadata: { isProvider: true, providerType },
                });
                edges.push({
                    id: `edge:contains:${fileNodeId}:${providerId}`,
                    sourceId: fileNodeId,
                    targetId: providerId,
                    kind: 'contains',
                    filePath,
                    line: lineNum,
                });
            }
        }
    }
}
exports.DartParser = DartParser;
