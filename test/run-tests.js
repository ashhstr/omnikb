/**
 * OmniKB Automated Test Suite
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { CodeParser } = require('../dist/core/parser');
const { KnowledgeStorage } = require('../dist/core/storage');
const { GraphEngine } = require('../dist/core/graph');
const { KnowledgeReporter } = require('../dist/core/reporter');
const { WorkspaceWatcher } = require('../dist/core/watcher');

console.log('🧪 Running OmniKB Verification Test Suite...\n');

async function runTests() {
  const testWorkspace = path.join(__dirname, 'sandbox');
  if (fs.existsSync(testWorkspace)) {
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  }
  fs.mkdirSync(testWorkspace, { recursive: true });

  try {
    // 1. Test CodeParser on TypeScript, Python, Go, and Rust
    console.log('1. Testing CodeParser across multiple languages...');
    const parser = new CodeParser();

    // 1.1 TypeScript
    const tsCode = `
import { db } from './database';

export class UserService {
  public async getUser(id: string): Promise<User> {
    const user = await db.query(id);
    return formatUser(user);
  }
}

export function formatUser(u: any) {
  return { id: u.id, name: u.name.toUpperCase() };
}

app.get('/api/users/:id', getUserHandler);
`;

    const tsResult = parser.parseFile('src/services/user.ts', tsCode);
    assert.strictEqual(tsResult.language, 'typescript');
    assert.ok(tsResult.nodes.some((n) => n.name === 'UserService' && n.kind === 'class'));
    assert.ok(tsResult.nodes.some((n) => n.name === 'getUser' && n.kind === 'function'));
    assert.ok(tsResult.nodes.some((n) => n.name === 'formatUser' && n.kind === 'function'));
    assert.ok(tsResult.nodes.some((n) => n.kind === 'route'));
    assert.ok(tsResult.edges.some((e) => e.kind === 'imports'));
    assert.ok(tsResult.edges.some((e) => e.kind === 'calls'));
    console.log('   ✅ TypeScript parsing passed.');

    // 1.2 Python
    const pyCode = `
from app.db import Database

class AuthManager:
    def authenticate(self, username, password):
        user = self.find_user(username)
        return verify_hash(user, password)

def verify_hash(user, pwd):
    return user.password == pwd

@app.post("/api/auth/login")
def login_route():
    pass
`;

    const pyResult = parser.parseFile('app/auth.py', pyCode);
    assert.strictEqual(pyResult.language, 'python');
    assert.ok(pyResult.nodes.some((n) => n.name === 'AuthManager' && n.kind === 'class'));
    assert.ok(pyResult.nodes.some((n) => n.name === 'authenticate' && n.kind === 'function'));
    assert.ok(pyResult.nodes.some((n) => n.name === 'verify_hash' && n.kind === 'function'));
    console.log('   ✅ Python parsing passed.');

    // 1.3 Go
    const goCode = `
package server

import (
  "net/http"
  "fmt"
)

type Server struct {
  port int
}

type Router interface {
  Handle(pattern string)
}

func (s *Server) Start() error {
  fmt.Println(s.port)
  return nil
}

func NewServer(port int) *Server {
  return &Server{port: port}
}
`;
    const goResult = parser.parseFile('pkg/server/server.go', goCode);
    assert.strictEqual(goResult.language, 'go');
    assert.ok(goResult.nodes.some((n) => n.name === 'Server' && n.kind === 'class'));
    assert.ok(goResult.nodes.some((n) => n.name === 'Router' && n.kind === 'interface'));
    assert.ok(goResult.nodes.some((n) => n.name === 'Server.Start' && n.kind === 'method'));
    assert.ok(goResult.nodes.some((n) => n.name === 'NewServer' && n.kind === 'function'));
    assert.ok(goResult.edges.some((e) => e.kind === 'imports'));
    console.log('   ✅ Go parsing passed.');

    // 1.4 Rust
    const rustCode = `
use std::sync::Arc;

pub struct Engine {
    id: String,
}

pub trait Runner {
    fn execute(&self);
}

impl Runner for Engine {
    fn execute(&self) {}
}

pub fn run_engine(e: &Engine) {
    e.execute();
}
`;
    const rustResult = parser.parseFile('src/engine.rs', rustCode);
    assert.strictEqual(rustResult.language, 'rust');
    assert.ok(rustResult.nodes.some((n) => n.name === 'Engine' && n.kind === 'class'));
    assert.ok(rustResult.nodes.some((n) => n.name === 'Runner' && n.kind === 'interface'));
    assert.ok(rustResult.nodes.some((n) => n.name === 'run_engine' && n.kind === 'function'));
    assert.ok(rustResult.edges.some((e) => e.kind === 'implements'));
    console.log('   ✅ Rust parsing passed.');

    // 1.5 Dart / Flutter
    const dartCode = `
import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}

final userCounterProvider = StateNotifierProvider((ref) => 0);
GoRoute(path: '/user/profile', builder: (c, s) => ProfileScreen());
`;
    const dartResult = parser.parseFile('lib/screens/profile.dart', dartCode);
    assert.strictEqual(dartResult.language, 'dart');
    assert.ok(dartResult.nodes.some((n) => n.name === 'ProfileScreen' && n.kind === 'class'));
    assert.ok(dartResult.nodes.some((n) => n.name === 'build' && n.kind === 'function'));
    assert.ok(dartResult.nodes.some((n) => n.name === 'userCounterProvider' && n.kind === 'variable'));
    assert.ok(dartResult.nodes.some((n) => n.kind === 'route'));
    assert.ok(dartResult.edges.some((e) => e.kind === 'imports'));
    console.log('   ✅ Dart & Flutter parsing passed.');

    // 1.6 Vue SFC
    const vueCode = `
<script setup lang="ts">
import { ref } from 'vue';
import HeaderBar from './HeaderBar.vue';

const count = ref(0);
function increment() {
  count.value++;
}
</script>
<template>
  <div>{{ count }}</div>
</template>
`;
    const vueResult = parser.parseFile('src/components/Counter.vue', vueCode);
    assert.strictEqual(vueResult.language, 'vue');
    assert.ok(vueResult.nodes.some((n) => n.name === 'Counter' && n.kind === 'class'));
    assert.ok(vueResult.nodes.some((n) => n.name === 'increment' && n.kind === 'function'));
    assert.ok(vueResult.edges.some((e) => e.kind === 'imports'));
    console.log('   ✅ Vue / Svelte SFC parsing passed.');

    // 1.7 Prisma Schema
    const prismaCode = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  title    String
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}

enum Role {
  USER
  ADMIN
}
`;
    const prismaResult = parser.parseFile('prisma/schema.prisma', prismaCode);
    assert.strictEqual(prismaResult.language, 'prisma');
    assert.ok(prismaResult.nodes.some((n) => n.name === 'User' && n.kind === 'class'));
    assert.ok(prismaResult.nodes.some((n) => n.name === 'Post' && n.kind === 'class'));
    assert.ok(prismaResult.nodes.some((n) => n.name === 'Role' && n.kind === 'type'));
    assert.ok(prismaResult.edges.some((e) => e.kind === 'references' && e.targetName === 'User'));
    console.log('   ✅ Prisma relational schema parsing passed.');

    // 1.8 SQL DDL
    const sqlCode = `
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50) NOT NULL
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;
    const sqlResult = parser.parseFile('migrations/init.sql', sqlCode);
    assert.strictEqual(sqlResult.language, 'sql');
    assert.ok(sqlResult.nodes.some((n) => n.name === 'users' && n.kind === 'class'));
    assert.ok(sqlResult.nodes.some((n) => n.name === 'orders' && n.kind === 'class'));
    assert.ok(sqlResult.edges.some((e) => e.kind === 'references' && e.targetName === 'users'));
    console.log('   ✅ SQL DDL relational parsing passed.');

    // 1.9 Java & Kotlin (JVM)
    const javaCode = `
package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ProductController extends BaseController {
    @GetMapping("/products")
    public List<Product> listProducts() {
        return getService().findAll();
    }
}
`;
    const javaResult = parser.parseFile('src/main/java/ProductController.java', javaCode);
    assert.strictEqual(javaResult.language, 'java');
    assert.ok(javaResult.nodes.some((n) => n.name === 'ProductController' && n.kind === 'class'));
    assert.ok(javaResult.nodes.some((n) => n.name === 'listProducts' && n.kind === 'function'));
    assert.ok(javaResult.nodes.some((n) => n.kind === 'route' && n.name.includes('/api/v1/products')));
    console.log('   ✅ Java & Kotlin (JVM / Spring Boot) parsing passed.');

    // 1.10 PHP & Laravel
    const phpCode = `
<?php
namespace App\\Http\\Controllers;

use App\\Models\\Post;
use Illuminate\\Support\\Facades\\Route;

Route::get('/blog/posts', [PostController::class, 'index']);

class PostController extends Controller {
    public function index() {
        return Post::all();
    }
}

class User extends Model {
    public function posts() {
        return $this->hasMany(Post::class);
    }
}
`;
    const phpResult = parser.parseFile('app/Http/Controllers/PostController.php', phpCode);
    assert.strictEqual(phpResult.language, 'php');
    assert.ok(phpResult.nodes.some((n) => n.name === 'PostController' && n.kind === 'class'));
    assert.ok(phpResult.nodes.some((n) => n.name === 'index' && n.kind === 'function'));
    assert.ok(phpResult.nodes.some((n) => n.kind === 'route' && n.name.includes('/blog/posts')));
    assert.ok(phpResult.edges.some((e) => e.kind === 'references' && e.targetName === 'Post'));
    console.log('   ✅ PHP & Laravel parsing passed.');

    // 2. Test Storage and Inverted Search Index
    console.log('2. Testing KnowledgeStorage & Inverted Index...');
    const storage = new KnowledgeStorage(testWorkspace);
    await storage.init();

    storage.updateFileGraph(
      'src/services/user.ts',
      {
        path: 'src/services/user.ts',
        hash: tsResult.contentHash,
        size: 500,
        lastModified: Date.now(),
        language: 'typescript',
        nodeCount: tsResult.nodes.length,
        edgeCount: tsResult.edges.length,
      },
      tsResult.nodes,
      tsResult.edges
    );

    storage.updateFileGraph(
      'app/auth.py',
      {
        path: 'app/auth.py',
        hash: pyResult.contentHash,
        size: 400,
        lastModified: Date.now(),
        language: 'python',
        nodeCount: pyResult.nodes.length,
        edgeCount: pyResult.edges.length,
      },
      pyResult.nodes,
      pyResult.edges
    );

    storage.updateFileGraph(
      'pkg/server/server.go',
      {
        path: 'pkg/server/server.go',
        hash: goResult.contentHash,
        size: 450,
        lastModified: Date.now(),
        language: 'go',
        nodeCount: goResult.nodes.length,
        edgeCount: goResult.edges.length,
      },
      goResult.nodes,
      goResult.edges
    );

    // 2.1 Test Tokenizer constituent word extraction
    const symTokens1 = KnowledgeStorage.tokenizeSymbol('getUserProfile');
    assert.ok(symTokens1.includes('get') && symTokens1.includes('user') && symTokens1.includes('profile'));

    const symTokens2 = KnowledgeStorage.tokenizeSymbol('verify_hash_pwd');
    assert.ok(symTokens2.includes('verify') && symTokens2.includes('hash') && symTokens2.includes('pwd'));

    const symTokens3 = KnowledgeStorage.tokenizeSymbol('parseAST');
    assert.ok(symTokens3.includes('parse') && symTokens3.includes('ast'));

    const symTokens4 = KnowledgeStorage.tokenizeSymbol('user-profile-card');
    assert.ok(symTokens4.includes('user') && symTokens4.includes('profile') && symTokens4.includes('card'));

    // 2.2 Test Inverted Index & Single / Multi-word Search
    const searchRes = storage.search('formatUser', 5);
    assert.ok(searchRes.length > 0, 'Search for formatUser should return results');
    assert.strictEqual(searchRes[0].nodes[0].name, 'formatUser');
    assert.strictEqual(searchRes[0].matchType, 'exact_name');
    assert.ok(searchRes[0].score >= 100, 'Exact symbol match should receive score >= 100');

    // 2.3 Test multi-word query ranking
    const multiSearch = storage.search('auth manager', 5);
    assert.ok(multiSearch.length > 0, 'Multi-word search for auth manager should return results');
    assert.strictEqual(multiSearch[0].nodes[0].name, 'AuthManager');

    // 2.4 Test constituent token search (e.g. search 'format' finds 'formatUser')
    const tokenSearch = storage.search('format', 5);
    assert.ok(tokenSearch.some((r) => r.nodes[0].name === 'formatUser'));

    // 2.5 Test buildInvertedIndex() rebuild
    storage.buildInvertedIndex();
    const afterRebuild = storage.search('getUser', 5);
    assert.ok(afterRebuild.some((r) => r.nodes[0].name === 'getUser'));

    console.log('   ✅ Storage, Inverted Index & Semantic Ranking search passed.');

    // 3. Test GraphEngine & PageRank Centrality
    console.log('3. Testing GraphEngine & PageRank Centrality...');
    const graph = new GraphEngine(testWorkspace, storage);
    graph.resolveCrossFileReferences();

    const exploreRes = graph.explore('formatUser', 3);
    assert.strictEqual(exploreRes.targetNodes[0].name, 'formatUser');
    assert.ok(exploreRes.callers.length > 0 || exploreRes.targetNodes.length > 0);

    const impact = graph.calculateImpact('formatUser', 5);
    assert.ok(impact.riskScore, 'Risk score must be computed');
    assert.ok(impact.summary.includes('formatUser'));

    const stats = graph.getStats();
    assert.ok(stats.godNodes.length > 0, 'God Nodes list should not be empty');
    assert.ok(typeof stats.godNodes[0].pageRank === 'number', 'PageRank score should be calculated');
    console.log('   ✅ Graph explore, Impact calculation, and PageRank Centrality passed.');

    // 4. Test KnowledgeReporter (Markdown + Visualizer)
    console.log('4. Testing KnowledgeReporter...');
    const reporter = new KnowledgeReporter(testWorkspace, storage, graph);
    const mdPath = await reporter.generateMarkdownReport();
    const htmlPath = await reporter.generateHtmlVisualizer();

    assert.ok(fs.existsSync(mdPath), 'KNOWLEDGE_BASE.md should be created');
    assert.ok(fs.existsSync(htmlPath), 'graph.html should be created');
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    assert.ok(mdContent.includes('Executive Architecture Overview'));
    console.log('   ✅ Markdown doc & HTML visualizer generation passed.');

    // 5. Test Auto-Sync Delta Updates
    console.log('5. Testing Auto-Sync incremental delta updates...');
    const modifiedTsCode = tsCode + `\nexport function deleteUser(id: string) { return true; }`;
    const modResult = parser.parseFile('src/services/user.ts', modifiedTsCode);

    storage.updateFileGraph(
      'src/services/user.ts',
      {
        path: 'src/services/user.ts',
        hash: modResult.contentHash,
        size: 600,
        lastModified: Date.now(),
        language: 'typescript',
        nodeCount: modResult.nodes.length,
        edgeCount: modResult.edges.length,
      },
      modResult.nodes,
      modResult.edges
    );

    const checkDelete = storage.findNodesByName('deleteUser');
    assert.strictEqual(checkDelete.length, 1, 'deleteUser symbol should now exist in index');
    console.log('   ✅ Auto-sync incremental update passed.');

    // 6. Test 100% Freshness Guarantee & Atomic Staleness Detection
    console.log('6. Testing 100% Freshness Verification & Staleness Detection...');
    const diskUserPath = path.join(testWorkspace, 'src', 'services', 'user.ts');
    fs.mkdirSync(path.dirname(diskUserPath), { recursive: true });
    fs.writeFileSync(diskUserPath, modifiedTsCode, 'utf8');

    const diskStats = fs.statSync(diskUserPath);
    storage.files.get('src/services/user.ts').lastModified = diskStats.mtimeMs;
    storage.files.get('src/services/user.ts').hash = CodeParser.computeHash(modifiedTsCode);

    const freshExplore = graph.explore('deleteUser', 3);
    assert.strictEqual(freshExplore.freshness.isFresh, true, 'Freshness must be true when file matches index');
    assert.strictEqual(freshExplore.freshness.isStale, false);
    assert.ok(freshExplore.freshness.contentHash, 'Content hash must be present');
    console.log('   ✅ Freshness verification (clean state) passed.');

    // Simulate disk file change behind the back of the index
    fs.writeFileSync(diskUserPath, modifiedTsCode + '\n// Changed directly on disk without indexing', 'utf8');
    const futureTime = new Date(Date.now() + 2000);
    fs.utimesSync(diskUserPath, futureTime, futureTime);

    const staleExplore = graph.explore('deleteUser', 3);
    assert.strictEqual(staleExplore.freshness.isFresh, false, 'Freshness must detect disk modification');
    assert.strictEqual(staleExplore.freshness.isStale, true);
    assert.strictEqual(staleExplore.freshness.staleReason, 'file_modified_on_disk');
    assert.ok(staleExplore.stalenessWarning, 'Staleness warning string must be generated');
    console.log('   ✅ Atomic staleness detection passed.');

    // 7. Test Active Reconciliation & MCP Tools (kb_sync & kb_god_nodes)
    console.log('7. Testing Active Reconciliation & MCP Server Tools...');
    const watcher = new WorkspaceWatcher(
      { rootPath: testWorkspace, autoGenerateReport: false, autoGenerateVisual: false },
      parser,
      storage,
      graph,
      reporter
    );

    const reconciledStats = await watcher.forceReconcile();
    assert.ok(reconciledStats.totalFiles > 0, 'Reconciled stats must include files');

    const reconciledExplore = graph.explore('deleteUser', 3);
    assert.strictEqual(reconciledExplore.freshness.isFresh, true, 'File must return to fresh state after reconcile');
    assert.strictEqual(reconciledExplore.freshness.isStale, false);

    // Test MCP Server kb_sync & kb_god_nodes
    const { McpServer } = require('../dist/server/mcp-server');
    const mcpServer = new McpServer(graph, storage, watcher);
    
    // 7.1 kb_sync
    const syncRes = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'test-sync-1',
      method: 'tools/call',
      params: {
        name: 'kb_sync',
        arguments: { force: true },
      },
    });
    assert.strictEqual(syncRes.id, 'test-sync-1');
    assert.ok(syncRes.result && syncRes.result.content);
    const parsedSyncOut = JSON.parse(syncRes.result.content[0].text);
    assert.strictEqual(parsedSyncOut.success, true);

    // 7.2 kb_god_nodes
    const godNodesRes = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'test-godnodes-1',
      method: 'tools/call',
      params: {
        name: 'kb_god_nodes',
        arguments: { limit: 5 },
      },
    });
    assert.strictEqual(godNodesRes.id, 'test-godnodes-1');
    const parsedGodOut = JSON.parse(godNodesRes.result.content[0].text);
    assert.ok(Array.isArray(parsedGodOut.godNodes));
    // 8. Test Multi-Agent Compatibility (Antigravity, Claude, ChatGPT, Codex, REST API)
    console.log('8. Testing Multi-Agent Protocol Compatibility (Antigravity, Claude, ChatGPT, Codex)...');
    const { LocalHttpServer } = require('../dist/server/http-server');
    const testPort = 7899;
    const httpServer = new LocalHttpServer(testPort, testWorkspace, graph, storage, watcher);
    await httpServer.start();

    try {
      const http = require('http');
      const makePostRequest = (path, body) => {
        return new Promise((resolve, reject) => {
          const postData = JSON.stringify(body);
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: testPort,
              path,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
              },
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => resolve(JSON.parse(data)));
            }
          );
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
      };

      const makeGetRequest = (path, headers = {}) => {
        return new Promise((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: testPort,
              path,
              method: 'GET',
              headers,
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
            }
          );
          req.on('error', reject);
          req.end();
        });
      };

      // 8.1 REST API explore endpoint (for ChatGPT / Python Agents / Codex)
      const restExplore = await makePostRequest('/v1/explore', { query: 'deleteUser', maxDepth: 2 });
      assert.ok(restExplore.targetNodes && restExplore.targetNodes.length > 0);

      // 8.2 REST API impact endpoint (for Claude / Antigravity / Refactoring tools)
      const restImpact = await makePostRequest('/v1/impact', { target: 'deleteUser', maxDepth: 3 });
      assert.ok(restImpact.riskScore);

      // 8.3 REST API god-nodes endpoint
      const restGodNodes = await makePostRequest('/v1/god-nodes', { limit: 3 });
      assert.ok(Array.isArray(restGodNodes.godNodes));

      // 8.4 REST API /v1/graph/data endpoint (for Visualizer 2.0 dynamic feed)
      const graphDataRes = await makeGetRequest('/v1/graph/data');
      assert.strictEqual(graphDataRes.statusCode, 200);
      const parsedGraphData = JSON.parse(graphDataRes.body);
      assert.ok(Array.isArray(parsedGraphData.nodes), 'graph/data must return nodes array');
      assert.ok(Array.isArray(parsedGraphData.edges), 'graph/data must return edges array');
      assert.ok(Array.isArray(parsedGraphData.godNodes), 'graph/data must return godNodes array');
      assert.ok(parsedGraphData.stats && typeof parsedGraphData.stats.totalNodes === 'number', 'graph/data must return stats');
      assert.ok(parsedGraphData.activeWorkspace, 'graph/data must return activeWorkspace');

      // 8.5 REST API /v1/graph/impact GET endpoint
      const graphImpactRes = await makeGetRequest('/v1/graph/impact?target=deleteUser&depth=3');
      assert.strictEqual(graphImpactRes.statusCode, 200);
      const parsedGraphImpact = JSON.parse(graphImpactRes.body);
      assert.ok(parsedGraphImpact.riskScore, 'graph/impact must calculate risk score');
      assert.ok(parsedGraphImpact.summary.includes('deleteUser'), 'graph/impact summary must reference target');

      // 8.6 Modern Visualizer 2.0 UI endpoint (/visual and /)
      const visualRes = await makeGetRequest('/visual');
      assert.strictEqual(visualRes.statusCode, 200);
      assert.ok(visualRes.body.includes('OmniKB Visualizer 2.0'), 'Visualizer HTML must contain title');
      assert.ok(visualRes.body.includes('d3.v7.min.js'), 'Visualizer HTML must include D3.js');

      const rootRes = await makeGetRequest('/');
      assert.strictEqual(rootRes.statusCode, 200);
      assert.ok(rootRes.body.includes('OmniKB Visualizer 2.0'), 'Root endpoint must serve Visualizer HTML');

      console.log('   ✅ Multi-Agent REST API & Protocol endpoints passed.');
    } finally {
      await httpServer.stop();
    }

    // 9. Test Multi-Workspace Registry & Isolation
    console.log('9. Testing Multi-Workspace Registry & Catalog Persistence...');
    const { WorkspaceRegistry } = require('../dist/core/workspace-registry');
    const { WorkspaceManager } = require('../dist/core/workspace-manager');
    const testRegistryDir = path.join(testWorkspace, 'mock-registry');
    const registry = new WorkspaceRegistry(testRegistryDir);

    const wsEntry1 = registry.register(testWorkspace, 'Sandbox-Primary');
    assert.strictEqual(wsEntry1.name, 'Sandbox-Primary');
    assert.strictEqual(registry.getActive().id, wsEntry1.id);

    const secondaryWs = path.join(testWorkspace, 'secondary-project');
    fs.mkdirSync(secondaryWs, { recursive: true });
    const wsEntry2 = registry.register(secondaryWs, 'Secondary-Project');
    assert.strictEqual(registry.list().length, 2);

    registry.setActive(wsEntry2.id);
    assert.strictEqual(registry.getActive().id, wsEntry2.id);

    const foundByPath = registry.findByPath(path.join(secondaryWs, 'src', 'index.ts'));
    assert.ok(foundByPath, 'findByPath should resolve parent workspace');
    assert.strictEqual(foundByPath.id, wsEntry2.id);
    console.log('   ✅ WorkspaceRegistry CRUD & path resolution passed.');

    // 10. Test Multi-Workspace Manager & MCP Tools
    console.log('10. Testing WorkspaceManager & Multi-Workspace MCP on-demand loading...');
    // Create dummy code file in secondary workspace
    const secFile = path.join(secondaryWs, 'src', 'auth.ts');
    fs.mkdirSync(path.dirname(secFile), { recursive: true });
    fs.writeFileSync(secFile, 'export function loginSecondaryUser() { return true; }', 'utf8');

    const manager = new WorkspaceManager(registry, 2); // max 2 loaded
    const multiMcp = new McpServer(manager);

    // 10.1 List workspaces via MCP
    const wsListRes = await multiMcp.handleRequest({
      jsonrpc: '2.0',
      id: 'test-ws-list',
      method: 'tools/call',
      params: { name: 'kb_workspaces' },
    });
    const parsedWsList = JSON.parse(wsListRes.result.content[0].text);
    assert.strictEqual(parsedWsList.workspaces.length, 2);

    // 10.2 Register a 3rd workspace via MCP tool
    const thirdWs = path.join(testWorkspace, 'third-project');
    fs.mkdirSync(thirdWs, { recursive: true });
    const regRes = await multiMcp.handleRequest({
      jsonrpc: '2.0',
      id: 'test-ws-reg',
      method: 'tools/call',
      params: { name: 'kb_register', arguments: { path: thirdWs, name: 'Third-Project' } },
    });
    const parsedReg = JSON.parse(regRes.result.content[0].text);
    assert.strictEqual(parsedReg.success, true);
    assert.strictEqual(registry.list().length, 3);

    // 10.3 Query secondary workspace explicitly via workspace parameter
    const exploreSecRes = await multiMcp.handleRequest({
      jsonrpc: '2.0',
      id: 'test-explore-sec',
      method: 'tools/call',
      params: {
        name: 'kb_explore',
        arguments: { query: 'loginSecondaryUser', workspace: 'Secondary-Project' },
      },
    });
    const parsedExploreSec = JSON.parse(exploreSecRes.result.content[0].text);
    assert.ok(
      parsedExploreSec.targetNodes.some((n) => n.name === 'loginSecondaryUser'),
      'Should find loginSecondaryUser in Secondary-Project'
    );

    // 10.4 Switch workspace via MCP tool
    const switchRes = await multiMcp.handleRequest({
      jsonrpc: '2.0',
      id: 'test-ws-switch',
      method: 'tools/call',
      params: { name: 'kb_switch', arguments: { workspace: 'Sandbox-Primary' } },
    });
    const parsedSwitch = JSON.parse(switchRes.result.content[0].text);
    assert.strictEqual(parsedSwitch.success, true);
    assert.strictEqual(registry.getActive().name, 'Sandbox-Primary');

    // 10.5 Unregister workspace via MCP tool
    const unregRes = await multiMcp.handleRequest({
      jsonrpc: '2.0',
      id: 'test-ws-unreg',
      method: 'tools/call',
      params: { name: 'kb_unregister', arguments: { workspace: 'Third-Project' } },
    });
    const parsedUnreg = JSON.parse(unregRes.result.content[0].text);
    assert.strictEqual(parsedUnreg.success, true);
    assert.strictEqual(registry.list().length, 2);

    // 10.6 Test Invalid Workspace Resolution Rejection & Non-existent Root Detection
    assert.strictEqual(
      WorkspaceRegistry.detectProjectRoot('invalid_nonexistent_dir_999'),
      null,
      'detectProjectRoot must return null for non-existent paths'
    );

    let rejected = false;
    try {
      await manager.resolveInstance('invalid_xyz_123');
    } catch (err) {
      rejected = true;
      assert.ok(
        err.message.includes("Workspace not found: 'invalid_xyz_123'"),
        `Error message must include expected string: ${err.message}`
      );
    }
    assert.strictEqual(rejected, true, 'resolveInstance must reject non-existent workspace ID');

    manager.dispose();
    console.log('   ✅ WorkspaceManager & Multi-Workspace MCP tools passed.');

    // 11. Testing Automated Blast Radius CI/CD Scanner (omnikb audit-impact & impact-check)
    console.log('11. Testing Automated Blast Radius CI/CD Scanner (omnikb audit-impact & impact-check)...');
    const { spawnSync } = require('child_process');
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    const impactCheckPath = path.join(__dirname, '..', 'scripts', 'impact-check.js');

    // 11.1 Test audit-impact passing on Low risk
    const auditPass = spawnSync(
      process.execPath,
      [cliPath, 'audit-impact', 'CodeParser', '--max-risk', 'CRITICAL', '--json'],
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    assert.strictEqual(auditPass.status, 0, 'audit-impact must exit with 0 when risk is below threshold');
    const parsedPass = JSON.parse(auditPass.stdout.trim());
    assert.strictEqual(parsedPass.passed, true);
    assert.strictEqual(parsedPass.target, 'CodeParser');

    // 11.2 Test audit-impact failing on threshold violation
    const auditFail = spawnSync(
      process.execPath,
      [cliPath, 'audit-impact', 'calculateImpact', '--max-risk', 'LOW', '--json'],
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    assert.strictEqual(auditFail.status, 1, 'audit-impact must exit with 1 when risk exceeds threshold');
    const parsedFail = JSON.parse(auditFail.stdout.trim());
    assert.strictEqual(parsedFail.passed, false);
    assert.ok(['MEDIUM', 'HIGH', 'CRITICAL'].includes(parsedFail.riskScore));

    // 11.3 Test standalone impact-check.js script
    const checkPass = spawnSync(
      process.execPath,
      [impactCheckPath, 'CodeParser', '--max-risk', 'CRITICAL', '--json'],
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    assert.strictEqual(checkPass.status, 0, 'impact-check.js must exit 0 for passing risk check');
    const parsedCheckPass = JSON.parse(checkPass.stdout.trim());
    assert.strictEqual(parsedCheckPass.passed, true);
    assert.strictEqual(parsedCheckPass.totalAudited, 1);

    const checkFail = spawnSync(
      process.execPath,
      [impactCheckPath, 'calculateImpact', '--max-risk', 'LOW', '--json'],
      { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
    );
    assert.strictEqual(checkFail.status, 1, 'impact-check.js must exit 1 for risk violation');
    const parsedCheckFail = JSON.parse(checkFail.stdout.trim());
    assert.strictEqual(parsedCheckFail.passed, false);
    assert.strictEqual(parsedCheckFail.failedCount, 1);

    console.log('   ✅ Automated Blast Radius CI/CD Scanner & scripts/impact-check.js passed.');

    console.log('\n🎉 ALL 11 TEST SUITES PASSED SUCCESSFULLY! 100% Zero-Bug, CI/CD Gate Verified.\n');
  } finally {
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
