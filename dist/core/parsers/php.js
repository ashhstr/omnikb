"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpParser = void 0;
const types_1 = require("./types");
class PhpParser {
    supports(language) {
        return language === 'php';
    }
    parse(ctx) {
        const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;
        // 1. Namespaces and Use Statements
        const useRegex = /use\s+([A-Za-z0-9_\\]+)(?:\s+as\s+([A-Za-z0-9_]+))?;/g;
        let match;
        while ((match = useRegex.exec(content)) !== null) {
            const lineNum = types_1.ParserUtils.getLineNumber(content, match.index);
            const fullClass = match[1];
            const alias = match[2] || fullClass.split('\\').pop() || fullClass;
            edges.push({
                id: `edge:import:${filePath}:${lineNum}:${fullClass}`,
                sourceId: fileNodeId,
                targetId: `pkg:${fullClass}`,
                targetName: alias,
                kind: 'imports',
                filePath,
                line: lineNum,
                metadata: { fullClass, alias },
            });
        }
        // 2. Laravel Route Registrations: Route::get('/users', [UserController::class, 'index'])
        const routeRegex = /Route::(get|post|put|delete|patch|options|any|resource)\(\s*['"]([^'"]+)['"](?:\s*,\s*(?:\[\s*([A-Za-z0-9_]+)::class\s*,\s*['"]([A-Za-z0-9_]+)['"]|['"]([A-Za-z0-9_]+)@([A-Za-z0-9_]+)['"]))?/g;
        while ((match = routeRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const routePath = match[2];
            const controllerClass = match[3] || match[5] || '';
            const controllerMethod = match[4] || match[6] || '';
            const lineNum = types_1.ParserUtils.getLineNumber(content, match.index);
            const routeId = `route:${method}:${routePath}`;
            nodes.push({
                id: routeId,
                name: `${method} ${routePath}`,
                kind: 'route',
                filePath,
                startLine: lineNum,
                endLine: lineNum,
                signature: `Route::${match[1]}('${routePath}')`,
                metadata: {
                    framework: 'laravel',
                    method,
                    routePath,
                    controller: controllerClass || undefined,
                    action: controllerMethod || undefined,
                },
            });
            if (controllerClass) {
                edges.push({
                    id: `edge:references:${routeId}:${controllerClass}:${lineNum}`,
                    sourceId: routeId,
                    targetId: `sym:${controllerClass}`,
                    targetName: controllerClass,
                    kind: 'references',
                    filePath,
                    line: lineNum,
                });
            }
        }
        // 3. Classes, Interfaces, Traits, and Eloquent Relations
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const lineNum = i + 1;
            // Class / Interface / Trait definition
            const classMatch = line.match(/^(?:\s*)(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_\\]+))?(?:\s+implements\s+([A-Za-z0-9_\\,\s]+))?/);
            if (classMatch &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('*')) {
                const className = classMatch[1];
                const extendsClause = classMatch[2] ? classMatch[2].split('\\').pop() || '' : '';
                const implementsClause = classMatch[3]
                    ? classMatch[3].split(',').map((s) => s.trim().split('\\').pop() || '')
                    : [];
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
                        baseClass: extendsClause || undefined,
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
                continue;
            }
            // Methods and Functions: public function getUser(...)
            const methodMatch = line.match(/^(?:\s*)(?:(?:public|protected|private|static|abstract|final)\s+)*function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
            if (methodMatch &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('*')) {
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
                // Eloquent Model Relationships (hasMany, belongsTo, hasOne, belongsToMany)
                const relationMatch = body.match(/\$this->(hasOne|hasMany|belongsTo|belongsToMany|morphTo|morphMany)\(\s*([A-Za-z0-9_]+)::class/);
                if (relationMatch) {
                    const relationType = relationMatch[1];
                    const targetModel = relationMatch[2];
                    edges.push({
                        id: `edge:references:${funcId}:${targetModel}:${lineNum}`,
                        sourceId: funcId,
                        targetId: `sym:${targetModel}`,
                        targetName: targetModel,
                        kind: 'references',
                        filePath,
                        line: lineNum,
                        metadata: {
                            isEloquentRelation: true,
                            relationType,
                            targetModel,
                        },
                    });
                }
                types_1.ParserUtils.extractCallsFromBody(body, funcId, filePath, lineNum, edges);
            }
        }
    }
}
exports.PhpParser = PhpParser;
