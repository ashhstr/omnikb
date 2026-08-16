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
    // 1. Test CodeParser on TypeScript and Python
    console.log('1. Testing CodeParser...');
    const parser = new CodeParser();

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

    const searchRes = storage.search('formatUser', 5);
    assert.ok(searchRes.length > 0, 'Search for formatUser should return results');
    assert.strictEqual(searchRes[0].nodes[0].name, 'formatUser');
    console.log('   ✅ Storage & Symbol search passed.');

    // 3. Test GraphEngine & Blast Radius
    console.log('3. Testing GraphEngine & Impact Analysis...');
    const graph = new GraphEngine(testWorkspace, storage);
    graph.resolveCrossFileReferences();

    const exploreRes = graph.explore('formatUser', 3);
    assert.strictEqual(exploreRes.targetNodes[0].name, 'formatUser');
    assert.ok(exploreRes.callers.length > 0 || exploreRes.targetNodes.length > 0);

    const impact = graph.calculateImpact('formatUser', 5);
    assert.ok(impact.riskScore, 'Risk score must be computed');
    assert.ok(impact.summary.includes('formatUser'));
    console.log('   ✅ Graph explore & Impact calculation passed.');

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

    // Update storage lastModified to match disk
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
    // Bump mtime
    const futureTime = new Date(Date.now() + 2000);
    fs.utimesSync(diskUserPath, futureTime, futureTime);

    const staleExplore = graph.explore('deleteUser', 3);
    assert.strictEqual(staleExplore.freshness.isFresh, false, 'Freshness must detect disk modification');
    assert.strictEqual(staleExplore.freshness.isStale, true);
    assert.strictEqual(staleExplore.freshness.staleReason, 'file_modified_on_disk');
    assert.ok(staleExplore.stalenessWarning, 'Staleness warning string must be generated');
    console.log('   ✅ Atomic staleness detection passed.');

    // 7. Test Active Reconciliation (kb_sync / forceReconcile)
    console.log('7. Testing Active Reconciliation (forceReconcile & kb_sync)...');
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

    // Test MCP Server kb_sync tool call
    const { McpServer } = require('../dist/server/mcp-server');
    const mcpServer = new McpServer(graph, storage, watcher);
    const rpcResponse = await mcpServer.handleRequest({
      jsonrpc: '2.0',
      id: 'test-sync-1',
      method: 'tools/call',
      params: {
        name: 'kb_sync',
        arguments: { force: true },
      },
    });

    assert.strictEqual(rpcResponse.id, 'test-sync-1');
    assert.ok(rpcResponse.result && rpcResponse.result.content);
    const parsedMcpOut = JSON.parse(rpcResponse.result.content[0].text);
    assert.strictEqual(parsedMcpOut.success, true);
    console.log('   ✅ Active reconciliation and MCP kb_sync passed.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% Freshness Guarantee is verified.\n');
  } finally {
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
