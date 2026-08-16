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
exports.CodeParser = void 0;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const typescript_1 = require("./parsers/typescript");
const python_1 = require("./parsers/python");
const go_1 = require("./parsers/go");
const rust_1 = require("./parsers/rust");
const generic_1 = require("./parsers/generic");
class CodeParser {
    parsers;
    constructor() {
        this.parsers = [
            new typescript_1.TypeScriptParser(),
            new python_1.PythonParser(),
            new go_1.GoParser(),
            new rust_1.RustParser(),
            new generic_1.MarkdownParser(),
            new generic_1.CStyleGenericParser(),
        ];
    }
    /**
     * Detects programming language from file extension
     */
    static detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.ts':
            case '.tsx':
            case '.mts':
            case '.cts':
                return 'typescript';
            case '.js':
            case '.jsx':
            case '.mjs':
            case '.cjs':
                return 'javascript';
            case '.py':
            case '.pyw':
                return 'python';
            case '.go':
                return 'go';
            case '.rs':
                return 'rust';
            case '.java':
                return 'java';
            case '.cs':
                return 'csharp';
            case '.cpp':
            case '.cc':
            case '.cxx':
            case '.c':
            case '.h':
            case '.hpp':
                return 'cpp';
            case '.rb':
                return 'ruby';
            case '.php':
                return 'php';
            case '.md':
            case '.mdx':
            case '.markdown':
                return 'markdown';
            case '.json':
                return 'json';
            case '.yaml':
            case '.yml':
                return 'yaml';
            case '.sql':
                return 'sql';
            default:
                return 'unknown';
        }
    }
    /**
     * Computes SHA-256 hash of file content
     */
    static computeHash(content) {
        return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }
    /**
     * Main parsing entrypoint for any supported file
     */
    parseFile(relativeFilePath, content) {
        const normPath = relativeFilePath.replace(/\\/g, '/');
        const language = CodeParser.detectLanguage(normPath);
        const contentHash = CodeParser.computeHash(content);
        const nodes = [];
        const edges = [];
        // Always create a File node representing the whole file
        const fileNodeId = `file:${normPath}`;
        const lines = content.split('\n');
        const lineCount = lines.length;
        nodes.push({
            id: fileNodeId,
            name: path.basename(normPath),
            kind: 'file',
            filePath: normPath,
            startLine: 1,
            endLine: lineCount,
            contentSnippet: content.slice(0, 300),
            metadata: { language, sizeBytes: Buffer.byteLength(content, 'utf8') },
        });
        const ctx = {
            filePath: normPath,
            content,
            lines,
            nodes,
            edges,
            fileNodeId,
            language,
        };
        try {
            const parser = this.parsers.find((p) => p.supports(language));
            if (parser) {
                parser.parse(ctx);
            }
        }
        catch (err) {
            console.error(`[OmniKB Parser] Error parsing ${normPath}: ${err?.message || err}`);
        }
        return { filePath: normPath, language, nodes, edges, contentHash };
    }
}
exports.CodeParser = CodeParser;
