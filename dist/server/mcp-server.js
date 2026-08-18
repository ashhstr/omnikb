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
const workspace_manager_1 = require("../core/workspace-manager");
const workspace_registry_1 = require("../core/workspace-registry");
class McpServer {
    manager;
    fallbackInstance;
    rl = null;
    constructor(graphOrManager, storage, watcher) {
        if (graphOrManager instanceof workspace_manager_1.WorkspaceManager) {
            this.manager = graphOrManager;
        }
        else {
            const graph = graphOrManager;
            const wsRoot = graph.getWorkspaceRoot();
            const registry = new workspace_registry_1.WorkspaceRegistry();
            registry.register(wsRoot);
            registry.setActive(wsRoot);
            this.manager = new workspace_manager_1.WorkspaceManager(registry);
            if (storage && watcher) {
                this.fallbackInstance = { graph, storage, watcher };
            }
        }
    }
    async resolveInstance(workspaceParam) {
        if (!workspaceParam && this.fallbackInstance) {
            return {
                ...this.fallbackInstance,
                workspaceRoot: this.fallbackInstance.graph.getWorkspaceRoot(),
            };
        }
        const instance = await this.manager.resolveInstance(workspaceParam);
        return {
            graph: instance.graph,
            storage: instance.storage,
            watcher: instance.watcher,
            workspaceRoot: instance.entry.rootPath,
            name: instance.entry.name,
        };
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
        console.error('[OmniKB MCP] Universal Multi-Workspace Stdio server initialized.');
    }
    async handleRequest(req) {
        const { method, params, id } = req;
        switch (method) {
            case 'ping':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {},
                };
            case 'notifications/initialized':
                return null;
            case 'initialize': {
                const activeEntry = this.manager.getRegistry().getActive();
                const activePath = activeEntry?.rootPath || (this.fallbackInstance ? this.fallbackInstance.graph.getWorkspaceRoot() : 'Dynamic Multi-Workspace');
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: '2024-11-05',
                        serverInfo: {
                            name: 'omnikb-mcp-server',
                            version: '1.4.0',
                        },
                        capabilities: {
                            tools: {},
                        },
                        instructions: `OmniKB is your pre-indexed real-time Knowledge Base and Multi-Workspace Code Graph engine.
- Active Workspace: ${activePath}
- Call 'kb_workspaces' to list all registered project workspaces.
- Call 'kb_register' or 'kb_switch' to manage and switch between different projects seamlessly.
- Call 'kb_explore' for any structural question ("how does X work", "call flow for Y", or symbol lookup) to get exact source code, caller graph, and blast radius in 1 step.
- Call 'kb_impact' before refactoring to check all files and routes that depend on a symbol.
- Call 'kb_search' for instant full-text symbol searches.
All tools support an optional 'workspace' parameter to query any registered project on-demand.`,
                    },
                };
            }
            case 'tools/list':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: [
                            {
                                name: 'kb_explore',
                                description: 'Deeply explores a function, class, file, or concept. Returns relevant symbol definitions, call hierarchies, callers, callees, impact radius, and verbatim code lines in 1 single call.',
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
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                    required: ['query'],
                                },
                            },
                            {
                                name: 'kb_impact',
                                description: 'Analyzes the blast radius and breaking change risk of modifying or deleting a symbol/file.',
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
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                    required: ['target'],
                                },
                            },
                            {
                                name: 'kb_search',
                                description: 'Fast inverted index & full-text search across all codebase symbols and documentation.',
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
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                    required: ['query'],
                                },
                            },
                            {
                                name: 'kb_architecture',
                                description: 'Returns top-level repository metrics, God Nodes (most coupled components), and HTTP route map.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                },
                            },
                            {
                                name: 'kb_god_nodes',
                                description: 'Returns top architectural God Nodes and coupled hubs ranked by PageRank centrality and degree connectivity.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        limit: {
                                            type: 'number',
                                            description: 'Number of top god nodes to return (default: 10).',
                                        },
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                },
                            },
                            {
                                name: 'kb_status',
                                description: 'Returns real-time sync status, watched files, and pending queue.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                },
                            },
                            {
                                name: 'kb_sync',
                                description: 'Forces an immediate atomic reconciliation of all files in the workspace, ensuring 100% graph freshness.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        force: {
                                            type: 'boolean',
                                            description: 'Force full re-read and reference re-linking (default: true).',
                                        },
                                        workspace: {
                                            type: 'string',
                                            description: 'Optional workspace name, path, or ID. Defaults to active workspace.',
                                        },
                                    },
                                },
                            },
                            {
                                name: 'kb_workspaces',
                                description: 'Lists all registered workspaces in OmniKB with current active indicator and stats.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {},
                                },
                            },
                            {
                                name: 'kb_register',
                                description: 'Registers a new workspace directory into OmniKB global registry and initiates indexing.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        path: {
                                            type: 'string',
                                            description: 'Absolute or relative path to the workspace root directory.',
                                        },
                                        name: {
                                            type: 'string',
                                            description: 'Optional custom display name for the workspace.',
                                        },
                                    },
                                    required: ['path'],
                                },
                            },
                            {
                                name: 'kb_unregister',
                                description: 'Unregisters a workspace from OmniKB.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        workspace: {
                                            type: 'string',
                                            description: 'Workspace name, root path, or ID to unregister.',
                                        },
                                    },
                                    required: ['workspace'],
                                },
                            },
                            {
                                name: 'kb_switch',
                                description: 'Switches the default active workspace context.',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        workspace: {
                                            type: 'string',
                                            description: 'Workspace name, root path, or ID to switch to.',
                                        },
                                    },
                                    required: ['workspace'],
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
                    // 1. Workspace Registry Management Tools
                    if (toolName === 'kb_workspaces') {
                        const list = this.manager.getRegistry().list();
                        const active = this.manager.getRegistry().getActive();
                        outputText = JSON.stringify({ activeWorkspace: active, workspaces: list }, null, 2);
                    }
                    else if (toolName === 'kb_register') {
                        if (!args.path)
                            throw new Error('Path is required for kb_register');
                        const instance = await this.manager.registerAndLoad(args.path, args.name, true);
                        outputText = JSON.stringify({
                            success: true,
                            message: `Workspace '${instance.entry.name}' registered and indexed successfully.`,
                            workspace: instance.entry,
                            stats: instance.graph.getStats(),
                        }, null, 2);
                    }
                    else if (toolName === 'kb_unregister') {
                        if (!args.workspace)
                            throw new Error('Workspace identifier is required for kb_unregister');
                        const success = await this.manager.unregister(args.workspace);
                        outputText = JSON.stringify({
                            success,
                            message: success
                                ? `Workspace '${args.workspace}' unregistered successfully.`
                                : `Workspace '${args.workspace}' not found in registry.`,
                        }, null, 2);
                    }
                    else if (toolName === 'kb_switch') {
                        if (!args.workspace)
                            throw new Error('Workspace identifier is required for kb_switch');
                        const instance = await this.manager.switchTo(args.workspace);
                        outputText = JSON.stringify({
                            success: true,
                            message: `Active workspace switched to '${instance.entry.name}'.`,
                            activeWorkspace: instance.entry,
                        }, null, 2);
                    }
                    else {
                        // 2. Query / Inspection Tools (workspace-aware)
                        const inst = await this.resolveInstance(args.workspace);
                        if (toolName === 'kb_explore') {
                            const res = inst.graph.explore(args.query, args.maxDepth || 3);
                            outputText = JSON.stringify(res, null, 2);
                        }
                        else if (toolName === 'kb_impact') {
                            const res = inst.graph.calculateImpact(args.target, args.maxDepth || 5);
                            outputText = JSON.stringify(res, null, 2);
                        }
                        else if (toolName === 'kb_search') {
                            const res = inst.storage.search(args.query, args.limit || 20);
                            outputText = JSON.stringify(res, null, 2);
                        }
                        else if (toolName === 'kb_architecture') {
                            const stats = inst.graph.getStats();
                            outputText = JSON.stringify({ workspaceRoot: inst.workspaceRoot, stats }, null, 2);
                        }
                        else if (toolName === 'kb_god_nodes') {
                            const stats = inst.graph.getStats();
                            const limit = args.limit || 10;
                            outputText = JSON.stringify({ workspaceRoot: inst.workspaceRoot, godNodes: stats.godNodes.slice(0, limit) }, null, 2);
                        }
                        else if (toolName === 'kb_status') {
                            const stats = inst.graph.getStats();
                            const pending = inst.watcher.getPendingQueue();
                            outputText = JSON.stringify({ workspaceRoot: inst.workspaceRoot, stats, pendingQueue: pending }, null, 2);
                        }
                        else if (toolName === 'kb_sync') {
                            const stats = await inst.watcher.forceReconcile();
                            outputText = JSON.stringify({ success: true, message: `Workspace '${inst.workspaceRoot}' successfully reconciled and refreshed`, stats }, null, 2);
                        }
                        else {
                            return {
                                jsonrpc: '2.0',
                                id,
                                error: { code: -32601, message: `Unknown tool: ${toolName}` },
                            };
                        }
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
