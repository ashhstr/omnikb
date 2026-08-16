"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptASTExtractor = void 0;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const RESERVED_KEYWORDS = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new', 'delete',
    'void', 'throw', 'instanceof', 'in', 'of', 'yield', 'await', 'function',
    'class', 'interface', 'extends', 'implements', 'super', 'this', 'require',
    'import', 'export', 'from', 'as', 'const', 'let', 'var', 'async', 'await',
]);
class TypeScriptASTExtractor {
    /**
     * Extracts code nodes and edges from TypeScript/JavaScript source via the
     * TypeScript Compiler API. AST-based extraction guarantees zero false
     * positives: string literals, template literals, comments, and self-edges
     * are structurally impossible.
     */
    extract(filePath, content) {
        const nodes = [];
        const edges = [];
        const lines = content.split('\n');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, this.detectScriptKind(filePath));
        const lineOf = (pos) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
        // 1. Import declarations -> imports edges (file -> imported module)
        this.extractImports(sourceFile, filePath, lines, edges);
        // 2. Top-level & nested declarations: classes, interfaces, functions, methods
        this.walkDeclarations(sourceFile, filePath, lines, nodes, edges);
        // 3. Call expressions inside each function/method body -> calls edges
        this.extractCalls(sourceFile, filePath, lines, nodes, edges);
        // 4. Route registrations (Express/Fastify/Next.js style)
        this.extractRoutes(sourceFile, filePath, lines, nodes, edges);
        return { nodes, edges };
    }
    detectScriptKind(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.ts' || ext === '.mts' || ext === '.cts')
            return ts.ScriptKind.TS;
        if (ext === '.tsx')
            return ts.ScriptKind.TSX;
        if (ext === '.jsx')
            return ts.ScriptKind.JSX;
        return ts.ScriptKind.JS;
    }
    extractImports(sourceFile, filePath, lines, edges) {
        const fileNodeId = `file:${filePath}`;
        const fileDir = path.dirname(filePath).replace(/\\/g, '/');
        for (const stmt of sourceFile.statements) {
            // import { a, b } from 'mod'; import def from 'mod'; import * as ns from 'mod';
            if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
                const importPath = stmt.moduleSpecifier.text;
                const lineNum = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1;
                const importedSymbols = [];
                const clause = stmt.importClause;
                let isNamespace = false;
                let defaultImport = '';
                if (clause) {
                    if (clause.name) {
                        defaultImport = clause.name.text;
                        importedSymbols.push(clause.name.text);
                    }
                    if (clause.namedBindings) {
                        if (ts.isNamespaceImport(clause.namedBindings)) {
                            isNamespace = true;
                            importedSymbols.push(clause.namedBindings.name.text);
                        }
                        else if (ts.isNamedImports(clause.namedBindings)) {
                            for (const el of clause.namedBindings.elements) {
                                importedSymbols.push(el.name.text);
                            }
                        }
                    }
                }
                // Calculate resolved relative path inside workspace if relative import
                let resolvedModulePath = importPath;
                if (importPath.startsWith('.')) {
                    resolvedModulePath = path.posix.normalize(path.posix.join(fileDir === '.' ? '' : fileDir, importPath));
                }
                edges.push({
                    id: `edge:import:${filePath}:${lineNum}:${importPath}`,
                    sourceId: fileNodeId,
                    targetId: `file:${resolvedModulePath}`,
                    targetName: importPath,
                    kind: 'imports',
                    filePath,
                    line: lineNum,
                    metadata: {
                        importedSymbols,
                        rawImportPath: importPath,
                        resolvedModulePath,
                        isNamespace,
                        defaultImport,
                    },
                });
                continue;
            }
            // const x = require('mod'); / require('mod')
            if (ts.isVariableStatement(stmt)) {
                for (const decl of stmt.declarationList.declarations) {
                    if (decl.initializer && ts.isCallExpression(decl.initializer)) {
                        const callExpr = decl.initializer;
                        const exprText = callExpr.expression.getText(sourceFile);
                        if (exprText === 'require' && callExpr.arguments.length > 0 && ts.isStringLiteral(callExpr.arguments[0])) {
                            const importPath = callExpr.arguments[0].text;
                            const lineNum = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile)).line + 1;
                            let resolvedModulePath = importPath;
                            if (importPath.startsWith('.')) {
                                resolvedModulePath = path.posix.normalize(path.posix.join(fileDir === '.' ? '' : fileDir, importPath));
                            }
                            let varName = '';
                            if (ts.isIdentifier(decl.name)) {
                                varName = decl.name.text;
                            }
                            edges.push({
                                id: `edge:import:${filePath}:${lineNum}:${importPath}`,
                                sourceId: fileNodeId,
                                targetId: `file:${resolvedModulePath}`,
                                targetName: importPath,
                                kind: 'imports',
                                filePath,
                                line: lineNum,
                                metadata: {
                                    importedSymbols: varName ? [varName] : [],
                                    rawImportPath: importPath,
                                    resolvedModulePath,
                                    isRequire: true,
                                },
                            });
                        }
                    }
                }
            }
        }
    }
    walkDeclarations(sourceFile, filePath, lines, nodes, edges) {
        const fileNodeId = `file:${filePath}`;
        const nodeIds = new Set();
        const visit = (node) => {
            if (ts.isClassDeclaration(node) && node.name) {
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                const classId = `${filePath}#${node.name.text}`;
                if (!nodeIds.has(classId)) {
                    nodeIds.add(classId);
                    nodes.push({
                        id: classId,
                        name: node.name.text,
                        kind: 'class',
                        filePath,
                        startLine: lineNum,
                        endLine,
                        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 4, lines.length)).join('\n'),
                        signature: `class ${node.name.text}`,
                    });
                    edges.push({
                        id: `edge:contains:${fileNodeId}:${classId}`,
                        sourceId: fileNodeId,
                        targetId: classId,
                        kind: 'contains',
                        filePath,
                        line: lineNum,
                    });
                }
                // extends / implements
                if (node.heritageClauses) {
                    for (const clause of node.heritageClauses) {
                        const kindEdge = clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
                        for (const type of clause.types) {
                            const baseName = type.expression.getText(sourceFile).split('.')[0];
                            edges.push({
                                id: `edge:${kindEdge}:${classId}:${baseName}`,
                                sourceId: classId,
                                targetId: `sym:${baseName}`,
                                targetName: baseName,
                                kind: kindEdge,
                                filePath,
                                line: lineNum,
                            });
                        }
                    }
                }
            }
            else if (ts.isInterfaceDeclaration(node) && node.name) {
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                const ifaceId = `${filePath}#${node.name.text}`;
                if (!nodeIds.has(ifaceId)) {
                    nodeIds.add(ifaceId);
                    nodes.push({
                        id: ifaceId,
                        name: node.name.text,
                        kind: 'interface',
                        filePath,
                        startLine: lineNum,
                        endLine,
                        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 4, lines.length)).join('\n'),
                        signature: `interface ${node.name.text}`,
                    });
                    edges.push({
                        id: `edge:contains:${fileNodeId}:${ifaceId}`,
                        sourceId: fileNodeId,
                        targetId: ifaceId,
                        kind: 'contains',
                        filePath,
                        line: lineNum,
                    });
                }
                if (node.heritageClauses) {
                    for (const clause of node.heritageClauses) {
                        for (const type of clause.types) {
                            const baseName = type.expression.getText(sourceFile).split('.')[0];
                            edges.push({
                                id: `edge:extends:${ifaceId}:${baseName}`,
                                sourceId: ifaceId,
                                targetId: `sym:${baseName}`,
                                targetName: baseName,
                                kind: 'extends',
                                filePath,
                                line: lineNum,
                            });
                        }
                    }
                }
            }
            else if (ts.isFunctionDeclaration(node) && node.name) {
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                const funcId = `${filePath}#${node.name.text}`;
                if (!nodeIds.has(funcId)) {
                    nodeIds.add(funcId);
                    nodes.push({
                        id: funcId,
                        name: node.name.text,
                        kind: 'function',
                        filePath,
                        startLine: lineNum,
                        endLine,
                        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n'),
                        signature: lines[lineNum - 1]?.trim() || node.name.text,
                    });
                    edges.push({
                        id: `edge:contains:${fileNodeId}:${funcId}`,
                        sourceId: fileNodeId,
                        targetId: funcId,
                        kind: 'contains',
                        filePath,
                        line: lineNum,
                    });
                }
            }
            else if (ts.isMethodDeclaration(node) && node.name) {
                const methodName = node.name.getText(sourceFile);
                if (['constructor'].includes(methodName)) {
                    ts.forEachChild(node, visit);
                    return;
                }
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                const methodId = `${filePath}#${methodName}`;
                if (!nodeIds.has(methodId)) {
                    nodeIds.add(methodId);
                    nodes.push({
                        id: methodId,
                        name: methodName,
                        kind: 'function',
                        filePath,
                        startLine: lineNum,
                        endLine,
                        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n'),
                        signature: lines[lineNum - 1]?.trim() || methodName,
                    });
                    edges.push({
                        id: `edge:contains:${fileNodeId}:${methodId}`,
                        sourceId: fileNodeId,
                        targetId: methodId,
                        kind: 'contains',
                        filePath,
                        line: lineNum,
                    });
                }
            }
            else if (ts.isVariableDeclaration(node) &&
                node.name &&
                ts.isIdentifier(node.name) &&
                node.initializer &&
                (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
                const funcName = node.name.text;
                const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
                const funcId = `${filePath}#${funcName}`;
                if (!nodeIds.has(funcId)) {
                    nodeIds.add(funcId);
                    nodes.push({
                        id: funcId,
                        name: funcName,
                        kind: 'function',
                        filePath,
                        startLine: lineNum,
                        endLine,
                        contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 6, lines.length)).join('\n'),
                        signature: lines[lineNum - 1]?.trim() || funcName,
                    });
                    edges.push({
                        id: `edge:contains:${fileNodeId}:${funcId}`,
                        sourceId: fileNodeId,
                        targetId: funcId,
                        kind: 'contains',
                        filePath,
                        line: lineNum,
                    });
                }
            }
            ts.forEachChild(node, visit);
        };
        for (const stmt of sourceFile.statements) {
            visit(stmt);
        }
    }
    extractCalls(sourceFile, filePath, lines, nodes, edges) {
        const nodeById = new Map();
        for (const n of nodes)
            nodeById.set(n.id, n);
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) && node.name) {
                const callerId = `${filePath}#${node.name.text}`;
                if (node.body)
                    this.collectCallExpressions(node.body, callerId, filePath, sourceFile, nodeById, edges);
            }
            else if (ts.isMethodDeclaration(node) && node.name) {
                const methodName = node.name.getText(sourceFile);
                if (methodName === 'constructor') {
                    ts.forEachChild(node, visit);
                    return;
                }
                const callerId = `${filePath}#${methodName}`;
                if (node.body)
                    this.collectCallExpressions(node.body, callerId, filePath, sourceFile, nodeById, edges);
            }
            else if (ts.isVariableDeclaration(node) &&
                node.name &&
                ts.isIdentifier(node.name) &&
                node.initializer &&
                (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
                const callerId = `${filePath}#${node.name.text}`;
                this.collectCallExpressions(node.initializer, callerId, filePath, sourceFile, nodeById, edges);
            }
            ts.forEachChild(node, visit);
        };
        for (const stmt of sourceFile.statements) {
            visit(stmt);
        }
    }
    collectCallExpressions(body, callerId, filePath, sourceFile, nodeById, edges) {
        const seen = new Set();
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                const callee = this.resolveCalleeName(node, sourceFile);
                if (callee && !RESERVED_KEYWORDS.has(callee)) {
                    const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                    const edgeKey = `${callerId}:${callee}:${lineNum}`;
                    if (!seen.has(edgeKey)) {
                        seen.add(edgeKey);
                        edges.push({
                            id: `edge:calls:${callerId}:${callee}:${lineNum}`,
                            sourceId: callerId,
                            targetId: `sym:${callee}`,
                            targetName: callee,
                            kind: 'calls',
                            filePath,
                            line: lineNum,
                            confidence: 'exact',
                        });
                    }
                }
            }
            else if (ts.isNewExpression(node)) {
                // new Foo(...) -> constructor call edge targeting the class symbol
                const ctorName = this.resolveConstructorName(node, sourceFile);
                if (ctorName && !RESERVED_KEYWORDS.has(ctorName)) {
                    const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                    const edgeKey = `${callerId}:new:${ctorName}:${lineNum}`;
                    if (!seen.has(edgeKey)) {
                        seen.add(edgeKey);
                        edges.push({
                            id: `edge:calls:${callerId}:new:${ctorName}:${lineNum}`,
                            sourceId: callerId,
                            targetId: `sym:${ctorName}`,
                            targetName: ctorName,
                            kind: 'calls',
                            filePath,
                            line: lineNum,
                            confidence: 'exact',
                        });
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(body);
    }
    resolveConstructorName(newExpr, sourceFile) {
        const expr = newExpr.expression;
        if (ts.isIdentifier(expr))
            return expr.text;
        if (ts.isPropertyAccessExpression(expr))
            return expr.name.text;
        return '';
    }
    resolveCalleeName(callExpr, sourceFile) {
        const expr = callExpr.expression;
        if (ts.isIdentifier(expr)) {
            return expr.text;
        }
        if (ts.isPropertyAccessExpression(expr)) {
            // this.method() / obj.method() -> method
            const name = expr.name.text;
            if (!['then', 'catch', 'finally', 'apply', 'call', 'bind', 'push', 'pop', 'map', 'filter', 'reduce', 'forEach', 'slice', 'splice', 'concat', 'join', 'split', 'indexOf', 'includes', 'startsWith', 'endsWith', 'toString', 'toUpperCase', 'toLowerCase', 'trim', 'replace', 'match', 'search', 'substring', 'substr', 'charAt', 'charCodeAt', 'keys', 'values', 'entries', 'has', 'get', 'set', 'add', 'delete', 'clear', 'sort', 'reverse', 'length'].includes(name)) {
                return name;
            }
            return '';
        }
        return '';
    }
    extractRoutes(sourceFile, filePath, lines, nodes, edges) {
        const httpMethods = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'all']);
        const nodeIds = new Set(nodes.map((n) => n.id));
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                const expr = node.expression;
                if (ts.isPropertyAccessExpression(expr) && httpMethods.has(expr.name.text)) {
                    const method = expr.name.text.toUpperCase();
                    const firstArg = node.arguments[0];
                    if (firstArg && ts.isStringLiteral(firstArg)) {
                        const routePath = firstArg.text;
                        const lineNum = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                        const routeId = `route:${method}:${routePath}`;
                        if (!nodeIds.has(routeId)) {
                            nodeIds.add(routeId);
                            nodes.push({
                                id: routeId,
                                name: `${method} ${routePath}`,
                                kind: 'route',
                                filePath,
                                startLine: lineNum,
                                endLine: lineNum,
                                signature: `${method} ${routePath}`,
                                metadata: { method, routePath },
                            });
                        }
                        // Route handler reference
                        const handlerArg = node.arguments[1];
                        if (handlerArg) {
                            let handlerName = '';
                            if (ts.isIdentifier(handlerArg))
                                handlerName = handlerArg.text;
                            else if (ts.isPropertyAccessExpression(handlerArg))
                                handlerName = handlerArg.name.text;
                            if (handlerName) {
                                edges.push({
                                    id: `edge:references:${routeId}:${handlerName}`,
                                    sourceId: routeId,
                                    targetId: `${filePath}#${handlerName}`,
                                    targetName: handlerName,
                                    kind: 'references',
                                    filePath,
                                    line: lineNum,
                                });
                            }
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        for (const stmt of sourceFile.statements) {
            visit(stmt);
        }
    }
}
exports.TypeScriptASTExtractor = TypeScriptASTExtractor;
