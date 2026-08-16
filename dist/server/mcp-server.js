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
exports.McpServer = void 0;
const readline = __importStar(require("readline"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const graph_1 = require("../core/graph");
const storage_1 = require("../core/storage");
const watcher_1 = require("../core/watcher");
const reporter_1 = require("../core/reporter");
class McpServer {
    workspaceRoot;
    parser;
    storage;
    graph;
    reporter;
    watcher;
    rl = null;
    constructor(workspaceRoot, parser, storage, graph, reporter, watcher) {
        this.workspaceRoot = path.resolve(workspaceRoot);
        this.parser = parser;
        this.storage = storage;
        this.graph = graph;
        this.reporter = reporter;
        this.watcher = watcher;
    }
    /**
     * Helper to normalize file URIs and Windows/POSIX paths to absolute system paths
     */
    parsePath(input) {
        if (!input)
            return '';
        let p = input;
        if (p.startsWith('file://')) {
            p = decodeURIComponent(p.replace(/^file:\/\//, ''));
            // Windows file:///C:/path or /C:/path -> C:/path
            if (/^\/?[A-Za-z]:/.test(p)) {
                p = p.replace(/^\//, '');
            }
        }
        return path.resolve(p);
    }
    /**
     * Dynamically switches the active project workspace, scans it, and starts auto-sync
     */
    async switchWorkspace(targetPath) {
        const norm = this.parsePath(targetPath);
        if (!norm || !fs.existsSync(norm) || !fs.statSync(norm).isDirectory()) {
            console.error(`[OmniKB MCP] Invalid or non-existent workspace directory: '${targetPath}'`);
            return false;
        }
        if (path.normalize(norm) === path.normalize(this.workspaceRoot)) {
            return true; // Already active on this directory
        }
        console.error(`[OmniKB MCP] Switching active workspace to: ${norm}`);
        // 1. Stop existing watcher on old directory
        this.watcher.stopWatching();
        // 2. Re-initialize storage, graph, reporter for the new directory
        this.workspaceRoot = norm;
        const newStorage = new storage_1.KnowledgeStorage(norm);
        await newStorage.init();
        this.storage = newStorage;
        this.graph = new graph_1.GraphEngine(norm, newStorage);
        this.reporter = new reporter_1.KnowledgeReporter(norm, newStorage, this.graph);
        this.watcher = new watcher_1.WorkspaceWatcher({
            rootPath: norm,
            debounceMs: 400,
            autoGenerateReport: true,
            autoGenerateVisual: true,
        }, this.parser, newStorage, this.graph, this.reporter);
        // 3. Scan the new project and start auto-sync watcher
        await this.watcher.initialScan();
        this.watcher.startWatching();
        console.error(`[OmniKB MCP] Active workspace updated and watcher running on: ${norm}`);
        return true;
    }
    /**
     * Starts reading JSON-RPC requests from standard input (stdio)
     */
    startStdio() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
        this.rl.on('line', async (line) => {
            const trimmed = line.trim();
            if (!trimmed)
                return;
            try {
                const req = JSON.parse(trimmed);
                const res = await this.handleRequest(req);
                if (res && req.id !== undefined) {
                    process.stdout.write(JSON.stringify(res) + '\n');
                }
            }
            catch (err) {
                const errRes = {
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: `Parse error: ${err?.message || err}` },
                };
                process.stdout.write(JSON.stringify(errRes) + '\n');
            }
        });
        this.rl.on('close', () => {
            console.error('[OmniKB MCP] Host application closed. Exiting OmniKB process.');
            process.exit(0);
        });
        console.error(`[OmniKB MCP] Stdio server initialized (Initial workspace: ${this.workspaceRoot}).`);
    }
    async handleRequest(req) {
        const { method, params, id } = req;
        switch (method) {
            case 'initialize': {
                const rootUri = params?.rootUri;
                const rootPath = params?.rootPath;
                const workspaceFolders = params?.workspaceFolders;
                let detectedPath = '';
                if (rootPath) {
                    detectedPath = rootPath;
                }
                else if (rootUri) {
                    detectedPath = rootUri;
                }
                else if (Array.isArray(workspaceFolders) && workspaceFolders.length > 0) {
                    detectedPath = workspaceFolders[0].uri || workspaceFolders[0].path;
                }
                if (detectedPath) {
                    await this.switchWorkspace(detectedPath);
                }
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: '2024-11-05',
                        serverInfo: {
                            name: 'omnikb-mcp-server',
                            version: '1.1.0',
                        },
                        capabilities: {
                            tools: {},
                        },
                        instructions: `OmniKB is your pre-indexed real-time Knowledge Base and Code Graph engine (Active Workspace: ${this.workspaceRoot}).
- Call 'kb_explore' for any structural question ("how does X work", "call flow for Y", or symbol lookup) to get exact source code, caller graph, and blast radius in 1 step.
- Call 'kb_impact' before refactoring to check all files and routes that depend on a symbol.
- Call 'kb_search' for instant full-text symbol searches.
- Call 'kb_switch_project' to switch or re-index any other project folder.
The index auto-syncs continuously on every file change.`,
                    },
                };
            }
            case 'workspace/didChangeWorkspaceFolders': {
                const added = params?.event?.added || params?.added;
                if (Array.isArray(added) && added.length > 0) {
                    const firstFolder = added[0].uri || added[0].path;
                    if (firstFolder) {
                        await this.switchWorkspace(firstFolder);
                    }
                }
                return null;
            }
            case 'notifications/initialized':
                return null;
            case 'tools/list':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: [
                            {
                                name: 'kb_explore',
                                description: 'Deeply explores a function, class, file, or concept in the active workspace. Returns relevant symbol definitions, call hierarchies, callers, callees, impact radius, and verbatim code lines in 1 single call.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        query: {
                                            type: 'string',
                                            description: 'Name of the function, class, symbol, route, or file to explore.',
                                        },
                                        maxDepth: {
                                            type: 'number',
                                            description: 'Maximum depth for call graph and impact traversal (default: 3).',
                                        },
                                        includeFullFile: {
                                            type: 'boolean',
                                            description: 'When true, returns the entire verbatim source code file containing the target symbol (eliminates compaction context loss).',
                                        },
                                        includeImports: {
                                            type: 'boolean',
                                            description: 'When true, returns all module imports and imported symbols for the target file.',
                                        },
                                    },
                                    required: ['query'],
                                },
                            },
                            {
                                name: 'kb_impact',
                                description: 'Analyzes the blast radius and breaking change risk of modifying or deleting a symbol/file in the active workspace.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        target: {
                                            type: 'string',
                                            description: 'Symbol or file path being modified.',
                                        },
                                        maxDepth: {
                                            type: 'number',
                                            description: 'Max upstream dependency depth (default: 5).',
                                        },
                                    },
                                    required: ['target'],
                                },
                            },
                            {
                                name: 'kb_search',
                                description: 'Fast inverted index & full-text search across all codebase symbols and documentation in active workspace.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        query: {
                                            type: 'string',
                                            description: 'Search query terms or symbol names.',
                                        },
                                        limit: {
                                            type: 'number',
                                            description: 'Maximum results to return (default: 20).',
                                        },
                                    },
                                    required: ['query'],
                                },
                            },
                            {
                                name: 'kb_architecture',
                                description: 'Returns top-level repository metrics, God Nodes (most coupled components), and HTTP route map for active workspace.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {},
                                },
                            },
                            {
                                name: 'kb_status',
                                description: 'Returns active workspace path, real-time sync status, watched files, and pending queue.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {},
                                },
                            },
                            {
                                name: 'kb_switch_project',
                                description: 'Switches the active knowledge base workspace to a new project directory, scans it, and starts auto-sync file watching.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        projectPath: {
                                            type: 'string',
                                            description: 'Absolute path or file URI of the project directory to switch to.',
                                        },
                                    },
                                    required: ['projectPath'],
                                },
                            },
                        ],
                    },
                };
            case 'tools/call': {
                const toolName = params?.name;
                const args = params?.arguments || {};
                try {
                    let outputText = '';
                    if (toolName === 'kb_explore') {
                        const res = this.graph.explore(args.query, args.maxDepth || 3, {
                            includeFullFile: args.includeFullFile,
                            includeImports: args.includeImports,
                        });
                        outputText = JSON.stringify(res, null, 2);
                    }
                    else if (toolName === 'kb_impact') {
                        const res = this.graph.calculateImpact(args.target, args.maxDepth || 5);
                        outputText = JSON.stringify(res, null, 2);
                    }
                    else if (toolName === 'kb_search') {
                        const res = this.storage.search(args.query, args.limit || 20);
                        outputText = JSON.stringify(res, null, 2);
                    }
                    else if (toolName === 'kb_architecture') {
                        const stats = this.graph.getStats();
                        outputText = JSON.stringify(stats, null, 2);
                    }
                    else if (toolName === 'kb_status') {
                        const stats = this.graph.getStats();
                        const pending = this.watcher.getPendingQueue();
                        outputText = JSON.stringify({
                            activeWorkspace: this.workspaceRoot,
                            stats,
                            pendingQueue: pending,
                        }, null, 2);
                    }
                    else if (toolName === 'kb_switch_project') {
                        const success = await this.switchWorkspace(args.projectPath);
                        const stats = this.graph.getStats();
                        outputText = JSON.stringify({
                            success,
                            activeWorkspace: this.workspaceRoot,
                            stats,
                        }, null, 2);
                    }
                    else {
                        return {
                            jsonrpc: '2.0',
                            id,
                            error: { code: -32601, message: `Unknown tool: ${toolName}` },
                        };
                    }
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [
                                {
                                    type: 'text',
                                    text: outputText,
                                },
                            ],
                        },
                    };
                }
                catch (err) {
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32000, message: `Tool execution failed: ${err?.message || err}` },
                    };
                }
            }
            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Method not found: ${method}` },
                };
        }
    }
}
exports.McpServer = McpServer;
