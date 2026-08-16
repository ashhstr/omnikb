import * as readline from 'readline';
import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class McpServer {
  private graph: GraphEngine;
  private storage: KnowledgeStorage;
  private watcher: WorkspaceWatcher;
  private rl: readline.Interface | null = null;

  constructor(graph: GraphEngine, storage: KnowledgeStorage, watcher: WorkspaceWatcher) {
    this.graph = graph;
    this.storage = storage;
    this.watcher = watcher;
  }

  /**
   * Starts reading JSON-RPC requests from standard input (stdio)
   */
  public startStdio(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        const res = await this.handleRequest(req);
        if (res && req.id !== undefined) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err: any) {
        const errRes: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${err?.message || err}` },
        };
        process.stdout.write(JSON.stringify(errRes) + '\n');
      }
    });

    console.error('[OmniKB MCP] Stdio server initialized.');
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { method, params, id } = req;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'omnikb-mcp-server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {},
            },
            instructions: `OmniKB is your pre-indexed real-time Knowledge Base and Code Graph engine.
- Call 'kb_explore' for any structural question ("how does X work", "call flow for Y", or symbol lookup) to get exact source code, caller graph, and blast radius in 1 step.
- Call 'kb_impact' before refactoring to check all files and routes that depend on a symbol.
- Call 'kb_search' for instant full-text symbol searches.
The index auto-syncs continuously on every save.`,
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'kb_explore',
                description:
                  'Deeply explores a function, class, file, or concept. Returns relevant symbol definitions, call hierarchies, callers, callees, impact radius, and verbatim code lines in 1 single call.',
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
                  },
                  required: ['query'],
                },
              },
              {
                name: 'kb_impact',
                description:
                  'Analyzes the blast radius and breaking change risk of modifying or deleting a symbol/file.',
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
                  },
                  required: ['query'],
                },
              },
              {
                name: 'kb_architecture',
                description:
                  'Returns top-level repository metrics, God Nodes (most coupled components), and HTTP route map.',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'kb_status',
                description: 'Returns real-time sync status, watched files, and pending queue.',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'kb_sync',
                description:
                  'Forces an immediate atomic reconciliation of all files in the workspace, ensuring 100% graph freshness.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    force: {
                      type: 'boolean',
                      description: 'Force full re-read and reference re-linking (default: true).',
                    },
                  },
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
            const res = this.graph.explore(args.query, args.maxDepth || 3);
            outputText = JSON.stringify(res, null, 2);
          } else if (toolName === 'kb_impact') {
            const res = this.graph.calculateImpact(args.target, args.maxDepth || 5);
            outputText = JSON.stringify(res, null, 2);
          } else if (toolName === 'kb_search') {
            const res = this.storage.search(args.query, args.limit || 20);
            outputText = JSON.stringify(res, null, 2);
          } else if (toolName === 'kb_architecture') {
            const stats = this.graph.getStats();
            outputText = JSON.stringify(stats, null, 2);
          } else if (toolName === 'kb_status') {
            const stats = this.graph.getStats();
            const pending = this.watcher.getPendingQueue();
            outputText = JSON.stringify({ stats, pendingQueue: pending }, null, 2);
          } else if (toolName === 'kb_sync') {
            const stats = await this.watcher.forceReconcile();
            outputText = JSON.stringify(
              { success: true, message: 'Workspace successfully reconciled and refreshed', stats },
              null,
              2
            );
          } else {
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
        } catch (err: any) {
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
