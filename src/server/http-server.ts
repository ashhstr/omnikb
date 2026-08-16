import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';

export class LocalHttpServer {
  private port: number;
  private graph: GraphEngine;
  private storage: KnowledgeStorage;
  private watcher: WorkspaceWatcher;
  private workspaceRoot: string;
  private server: http.Server | null = null;

  constructor(
    port: number,
    workspaceRoot: string,
    graph: GraphEngine,
    storage: KnowledgeStorage,
    watcher: WorkspaceWatcher
  ) {
    this.port = port;
    this.workspaceRoot = workspaceRoot;
    this.graph = graph;
    this.storage = storage;
    this.watcher = watcher;
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // Set CORS headers for universal local access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
          if (pathname === '/v1/health' || pathname === '/') {
            this.sendJson(res, 200, {
              status: 'healthy',
              version: '1.0.0',
              engine: 'OmniKB Real-Time Universal Engine',
              stats: this.graph.getStats(),
            });
            return;
          }

          // 2. Stats
          if (pathname === '/v1/stats' && req.method === 'GET') {
            this.sendJson(res, 200, this.graph.getStats());
            return;
          }

          // 3. Full Graph Export (JSON)
          if (pathname === '/v1/graph' && req.method === 'GET') {
            const nodes = Array.from(this.storage.nodes.values());
            const edges = Array.from(this.storage.edges.values());
            this.sendJson(res, 200, { nodes, edges });
            return;
          }

          // 4. LLM Prompt Context (Formatted Markdown for direct prompt injection)
          if (pathname === '/v1/context' && req.method === 'GET') {
            const kbPath = path.join(this.workspaceRoot, 'KNOWLEDGE_BASE.md');
            if (fs.existsSync(kbPath)) {
              const content = fs.readFileSync(kbPath, 'utf8');
              res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
              res.end(content);
            } else {
              this.sendJson(res, 404, { error: 'KNOWLEDGE_BASE.md not found yet.' });
            }
            return;
          }

          // 5. Visualizer UI
          if (pathname === '/visual' && req.method === 'GET') {
            const visualPath = path.join(this.workspaceRoot, '.omnikb', 'graph.html');
            if (fs.existsSync(visualPath)) {
              const content = fs.readFileSync(visualPath, 'utf8');
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(content);
            } else {
              this.sendJson(res, 404, { error: 'Visualizer graph.html not generated yet.' });
            }
            return;
          }

          // 6. Action Endpoints (GET with query params or POST with JSON body)
          if (pathname === '/v1/explore' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const q = body.query || query.query || '';
            const maxDepth = parseInt(body.maxDepth || query.maxDepth || '3', 10);
            const result = this.graph.explore(q, maxDepth);
            this.sendJson(res, 200, result);
            return;
          }

          if (pathname === '/v1/impact' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const target = body.target || query.target || '';
            const maxDepth = parseInt(body.maxDepth || query.maxDepth || '5', 10);
            const result = this.graph.calculateImpact(target, maxDepth);
            this.sendJson(res, 200, result);
            return;
          }

          if (pathname === '/v1/search' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const q = body.query || query.query || '';
            const limit = parseInt(body.limit || query.limit || '20', 10);
            const result = this.storage.search(q, limit);
            this.sendJson(res, 200, result);
            return;
          }

          if (pathname === '/v1/god-nodes' && (req.method === 'GET' || req.method === 'POST')) {
            const body = req.method === 'POST' ? await this.readBodyJson(req) : {};
            const limit = parseInt(body.limit || query.limit || '10', 10);
            const stats = this.graph.getStats();
            this.sendJson(res, 200, {
              godNodes: stats.godNodes.slice(0, limit),
            });
            return;
          }

          if (pathname === '/v1/sync' && (req.method === 'GET' || req.method === 'POST')) {
            const stats = await this.watcher.forceReconcile();
            this.sendJson(res, 200, {
              success: true,
              message: 'Workspace successfully reconciled and refreshed',
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
        console.log(`[OmniKB REST API] Universal server running at http://127.0.0.1:${this.port}`);
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
      let receivedBytes = 0;

      req.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_PAYLOAD_BYTES) {
          req.destroy();
          reject(new Error('Payload too large: maximum allowed is 5MB'));
          return;
        }
        data += chunk;
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
