"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JvmParser = void 0;
const types_1 = require("./types");
class JvmParser {
    supports(language) {
        return language === 'java' || language === 'kotlin';
    }
    parse(ctx) {
        const { filePath, content, lines, nodes, edges, fileNodeId, language } = ctx;
        // 1. Package and Imports
        const importRegex = /import\s+(?:static\s+)?([A-Za-z0-9_.*]+);?/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const lineNum = types_1.ParserUtils.getLineNumber(content, match.index);
            const importPath = match[1];
            const symbolName = importPath.split('.').pop() || importPath;
            edges.push({
                id: `edge:import:${filePath}:${lineNum}:${importPath}`,
                sourceId: fileNodeId,
                targetId: `pkg:${importPath}`,
                targetName: symbolName,
                kind: 'imports',
                filePath,
                line: lineNum,
                metadata: { importPath, language },
            });
        }
        // 2. Class-level Route Prefix (Spring @RequestMapping("/api"))
        let classRoutePrefix = '';
        const classRouteMatch = content.match(/@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
        if (classRouteMatch) {
            classRoutePrefix = classRouteMatch[1].replace(/\/$/, '');
        }
        // 3. Classes, Interfaces, Enums, and Route Handlers
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const lineNum = i + 1;
            // Class / Interface / Enum / Data Class / Record definition
            const classMatch = line.match(/^(?:\s*)(?:@\w+(?:\([^)]*\))?\s+)*(?:public|private|protected|internal|abstract|open|final|data|sealed)?\s*(?:class|interface|enum|record|object)\s+([A-Za-z0-9_$]+)(?:<[^>]+>)?(?:\s*:\s*([A-Za-z0-9_$<>,\s()]+)|\s+extends\s+([A-Za-z0-9_$<>,\s]+))?(?:\s+implements\s+([A-Za-z0-9_$<>,\s]+))?/);
            if (classMatch &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('*') &&
                !['import', 'package'].includes(classMatch[1])) {
                const className = classMatch[1];
                const rawHeritage = classMatch[2] || classMatch[3] || '';
                const rawImplements = classMatch[4] || '';
                const baseClasses = rawHeritage
                    .split(',')
                    .map((s) => s.trim().split('<')[0].split('(')[0])
                    .filter(Boolean);
                const implementsList = rawImplements
                    .split(',')
                    .map((s) => s.trim().split('<')[0])
                    .filter(Boolean);
                const classId = `${filePath}#${className}`;
                const endLine = types_1.ParserUtils.findMatchingBracketEndLine(lines, lineNum);
                nodes.push({
                    id: classId,
                    name: className,
                    kind: trimmed.includes('interface') ? 'interface' : 'class',
                    filePath,
                    startLine: lineNum,
                    endLine,
                    contentSnippet: lines.slice(i, Math.min(i + 6, lines.length)).join('\n'),
                    signature: trimmed,
                    metadata: {
                        language,
                        bases: baseClasses,
                        implements: implementsList,
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
                for (const base of baseClasses) {
                    if (base && base !== 'Any' && base !== 'Object') {
                        edges.push({
                            id: `edge:extends:${classId}:${base}`,
                            sourceId: classId,
                            targetId: `sym:${base}`,
                            targetName: base,
                            kind: 'extends',
                            filePath,
                            line: lineNum,
                        });
                    }
                }
                continue;
            }
            // Spring Boot HTTP Route Annotations:
            // @GetMapping("/users"), @PostMapping("/create"), @PutMapping("/{id}"), @DeleteMapping("/{id}")
            const springRouteMatch = line.match(/@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\(\s*(?:value\s*=\s*)?["']([^"']*)["']/);
            if (springRouteMatch) {
                const httpMethod = springRouteMatch[1].replace('Mapping', '').toUpperCase() || 'GET';
                const subPath = springRouteMatch[2].startsWith('/') ? springRouteMatch[2] : `/${springRouteMatch[2]}`;
                const fullPath = (classRoutePrefix ? `${classRoutePrefix}${subPath}` : subPath) || '/';
                const routeId = `route:${httpMethod}:${fullPath}`;
                nodes.push({
                    id: routeId,
                    name: `${httpMethod} ${fullPath}`,
                    kind: 'route',
                    filePath,
                    startLine: lineNum,
                    endLine: lineNum,
                    signature: trimmed,
                    metadata: {
                        framework: 'spring_boot',
                        method: httpMethod,
                        routePath: fullPath,
                    },
                });
            }
            // Method / Function definition in Java & Kotlin:
            // public ResponseEntity<User> getUser(...) { / fun calculateTotal(...): Double {
            const methodMatch = line.match(/^(?:\s*)(?:@\w+(?:\([^)]*\))?\s+)*(?:public|private|protected|internal|override|final|abstract|open|suspend)?\s*(?:fun\s+|void\s+|[A-Za-z0-9_$<>[\],\s]+\s+)([A-Za-z0-9_$]+)\s*\(([^)]*)\)(?:\s*:\s*[A-Za-z0-9_$<>]+)?\s*(?:\{|=)/);
            if (methodMatch &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('*') &&
                !['if', 'for', 'while', 'switch', 'catch', 'return', 'class', 'interface'].includes(methodMatch[1])) {
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
        }
    }
}
exports.JvmParser = JvmParser;
