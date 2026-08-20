import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
import { WorkspaceManager } from '../core/workspace-manager';
import { WorkspaceRegistry } from '../core/workspace-registry';
import { KnowledgeReporter } from '../core/reporter';

export class LocalHttpServer {
  private port: number;
  private manager: WorkspaceManager;
  private fallbackWorkspaceRoot?: string;
  private fallbackInstance?: {
    graph: GraphEngine;
    storage: KnowledgeStorage;
    watcher: WorkspaceWatcher;
  };
  private server: http.Server | null = null;

  constructor(
    port: number,
    workspaceRootOrManager: string | WorkspaceManager,
    graph?: GraphEngine,
    storage?: KnowledgeStorage,
    watcher?: WorkspaceWatcher
  ) {
    this.port = port;

    if (workspaceRootOrManager instanceof WorkspaceManager) {
      this.manager = workspaceRootOrManager;
    } else {
      const wsRoot = workspaceRootOrManager;
      this.fallbackWorkspaceRoot = wsRoot;
      const registry = new WorkspaceRegistry();
      registry.register(wsRoot);
      registry.setActive(wsRoot);
      this.manager = new WorkspaceManager(registry);

      if (graph && storage && watcher) {
        this.fallbackInstance = { graph, storage, watcher };
      }
    }
  }

  private async resolveInstance(workspaceParam?: string) {
    if (!workspaceParam && this.fallbackInstance) {
      return {
        ...this.fallbackInstance,
        workspaceRoot: this.fallbackWorkspaceRoot || this.fallbackInstance.graph.getWorkspaceRoot(),
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

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // Set CORS headers for universal local access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const reqUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
        const pathname = reqUrl.pathname || '/';
        const query = Object.fromEntries(reqUrl.searchParams.entries());

        try {
          // 1. Health check
          if (pathname === '/v1/health') {
            const inst = await this.resolveInstance(query.workspace);
            this.sendJson(res, 200, {
              status: 'healthy',
              version: '1.4.0',
              engine: 'OmniKB Real-Time Multi-Workspace Engine',
              activeWorkspace: this.manager.getRegistry().getActive(),
              stats: inst.graph.getStats(),
            });
            return;
          }

          // 2. Visualizer UI (Served on / and /visual)
          if ((pathname === '/' || pathname === '/visual') && req.method === 'GET') {
            if (
              pathname === '/' &&
              req.headers.accept &&
              req.headers.accept.includes('application/json') &&
              !req.headers.accept.includes('text/html')
            ) {
              const inst = await this.resolveInstance(query.workspace);
              this.sendJson(res, 200, {
                status: 'healthy',
                version: '1.4.0',
                engine: 'OmniKB Real-Time Multi-Workspace Engine',
                activeWorkspace: this.manager.getRegistry().getActive(),
                stats: inst.graph.getStats(),
              });
              return;
            }

            const html = KnowledgeReporter.renderVisualizerHtml();
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
          }

          // 3. Workspace Management Endpoints
          if (pathname === '/v1/workspaces' && req.method === 'GET') {
            const list = this.manager.getRegistry().list();
            const active = this.manager.getRegistry().getActive();
            this.sendJson(res, 200, { activeWorkspace: active, workspaces: list });
            return;
          }

          if (pathname === '/v1/workspaces/register' && req.method === 'POST') {
            const body = await this.readBodyJson(req);
            if (!body.path) {
              this.sendJson(res, 400, { error: 'Missing required field: path' });
              return;
            }
            const instance = await this.manager.registerAndLoad(body.path, body.name, true);
            this.sendJson(res, 200, {
              success: true,
              message: `Workspace '${instance.entry.name}' registered and indexed.`,
              workspace: instance.entry,
              stats: instance.graph.getStats(),
            });
            return;
          }

          if (pathname === '/v1/workspaces/switch' && req.method === 'POST') {
            const body = await this.readBodyJson(req);
            const wsTarget = body.workspace || query.workspace;
            if (!wsTarget) {
              this.sendJson(res, 400, { error: 'Missing required field: workspace' });
              return;
            }
            const instance = await this.manager.switchTo(wsTarget);
            this.sendJson(res, 200, {
              success: true,
              message: `Switched active workspace to '${instance.entry.name}'.`,
              activeWorkspace: instance.entry,
            });
            return;
          }

          if (pathname === '/v1/workspaces/unregister' && (req.method === 'POST' || req.method === 'DELETE')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const wsTarget = body.workspace || query.workspace;
            if (!wsTarget) {
              this.sendJson(res, 400, { error: 'Missing required field: workspace' });
              return;
            }
            const success = await this.manager.unregister(wsTarget);
            this.sendJson(res, 200, {
              success,
              message: success
                ? `Workspace '${wsTarget}' unregistered successfully.`
                : `Workspace '${wsTarget}' not found.`,
            });
            return;
          }

          // 4. Graph Data Endpoint (Dynamic Visualizer Feed)
          if (pathname === '/v1/graph/data' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const wsParam = body.workspace || query.workspace;
            const inst = await this.resolveInstance(wsParam);
            const stats = inst.graph.getStats();
            const nodes = Array.from(inst.storage.nodes.values());
            const edges = Array.from(inst.storage.edges.values());
            const activeWorkspace = this.manager.getRegistry().getActive() || {
              id: 'default',
              name: inst.name || path.basename(inst.workspaceRoot),
              rootPath: inst.workspaceRoot,
            };

            this.sendJson(res, 200, {
              nodes,
              edges,
              godNodes: stats.godNodes,
              stats: {
                totalNodes: stats.totalNodes,
                totalEdges: stats.totalEdges,
                totalFiles: stats.totalFiles,
                nodesByKind: stats.nodesByKind,
                edgesByKind: stats.edgesByKind,
                languages: stats.languages,
                lastSyncTime: stats.lastSyncTime,
              },
              activeWorkspace,
            });
            return;
          }

          // 5. Stats
          if (pathname === '/v1/stats' && req.method === 'GET') {
            const inst = await this.resolveInstance(query.workspace);
            this.sendJson(res, 200, { workspace: inst.workspaceRoot, ...inst.graph.getStats() });
            return;
          }

          // 6. Full Graph Export (JSON)
          if (pathname === '/v1/graph' && req.method === 'GET') {
            const inst = await this.resolveInstance(query.workspace);
            const nodes = Array.from(inst.storage.nodes.values());
            const edges = Array.from(inst.storage.edges.values());
            this.sendJson(res, 200, { workspace: inst.workspaceRoot, nodes, edges });
            return;
          }

          // 7. LLM Prompt Context (Formatted Markdown)
          if (pathname === '/v1/context' && req.method === 'GET') {
            const inst = await this.resolveInstance(query.workspace);
            const kbPath = path.join(inst.workspaceRoot, 'KNOWLEDGE_BASE.md');
            if (fs.existsSync(kbPath)) {
              const content = fs.readFileSync(kbPath, 'utf8');
              res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
              res.end(content);
            } else {
              this.sendJson(res, 404, { error: `KNOWLEDGE_BASE.md not found yet for workspace: ${inst.workspaceRoot}` });
            }
            return;
          }

          // 8. Action Endpoints (Explore, Impact, Search, God Nodes, Sync)
          if (pathname === '/v1/explore' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const q = body.query || query.query || '';
            const maxDepth = parseInt(body.maxDepth || query.maxDepth || '3', 10);
            const wsParam = body.workspace || query.workspace;
            const inst = await this.resolveInstance(wsParam);
            const result = inst.graph.explore(q, maxDepth);
            this.sendJson(res, 200, result);
            return;
          }

          if (
            (pathname === '/v1/graph/impact' || pathname === '/v1/impact') &&
            (req.method === 'GET' || req.method === 'POST')
          ) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const target = body.target || query.target || '';
            const depth = parseInt(body.depth || body.maxDepth || query.depth || query.maxDepth || '5', 10);
            const wsParam = body.workspace || query.workspace;
            const inst = await this.resolveInstance(wsParam);
            if (!target) {
              this.sendJson(res, 400, { error: 'Missing required query/body parameter: target' });
              return;
            }
            const result = inst.graph.calculateImpact(target, depth);
            this.sendJson(res, 200, result);
            return;
          }

          if (pathname === '/v1/search' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const q = body.query || query.query || '';
            const limit = parseInt(body.limit || query.limit || '20', 10);
            const wsParam = body.workspace || query.workspace;
            const inst = await this.resolveInstance(wsParam);
            const result = inst.storage.search(q, limit);
            this.sendJson(res, 200, result);
            return;
          }

          if (pathname === '/v1/god-nodes' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const limit = parseInt(body.limit || query.limit || '10', 10);
            const wsParam = body.workspace || query.workspace;
            const inst = await this.resolveInstance(wsParam);
            const stats = inst.graph.getStats();
            this.sendJson(res, 200, {
              workspace: inst.workspaceRoot,
              godNodes: stats.godNodes.slice(0, limit),
            });
            return;
          }

          if (pathname === '/v1/sync' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const wsParam = body.workspace || query.workspace;
            if (wsParam === 'all') {
              const results = await this.manager.reconcileAll();
              this.sendJson(res, 200, {
                success: true,
                message: `Universal sync: successfully reconciled ${results.length} workspace(s)`,
                workspaces: results,
              });
              return;
            }

            const inst = await this.resolveInstance(wsParam);
            const stats = await inst.watcher.forceReconcile();
            this.sendJson(res, 200, {
              success: true,
              message: `Workspace '${inst.workspaceRoot}' successfully reconciled and refreshed`,
              stats,
            });
            return;
          }

          this.sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
        } catch (err: any) {
          this.sendJson(res, 500, { error: err?.message || 'Internal server error' });
        }
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[OmniKB REST API] Port ${this.port} is already in use. REST API disabled, MCP & Watcher remain active.`);
          resolve();
        } else {
          console.error(`[OmniKB REST API] Server error:`, err?.message || err);
          resolve();
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`[OmniKB REST API] Multi-Workspace server running at http://127.0.0.1:${this.port}`);
        console.log(`[OmniKB REST API] Interactive Visualizer: http://127.0.0.1:${this.port}/visual`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private sendJson(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  private readBodyJson(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB limit

      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > MAX_PAYLOAD_BYTES) {
          req.destroy();
          reject(new Error('Payload too large: maximum allowed is 5MB'));
        }
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }
}
