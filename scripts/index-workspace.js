const path = require('path');
const { CodeParser } = require('../dist/core/parser');
const { KnowledgeStorage } = require('../dist/core/storage');
const { GraphEngine } = require('../dist/core/graph');
const { KnowledgeReporter } = require('../dist/core/reporter');
const { WorkspaceWatcher } = require('../dist/core/watcher');

async function build() {
  const root = path.resolve(__dirname, '..');
  console.log(`[Build] Indexing OmniKB repository at: ${root}`);

  const parser = new CodeParser();
  const storage = new KnowledgeStorage(root);
  await storage.init();

  const graph = new GraphEngine(root, storage);
  const reporter = new KnowledgeReporter(root, storage, graph);
  const watcher = new WorkspaceWatcher(
    {
      rootPath: root,
      debounceMs: 400,
      autoGenerateReport: true,
      autoGenerateVisual: true,
    },
    parser,
    storage,
    graph,
    reporter
  );

  const stats = await watcher.initialScan();
  console.log(`\n🎉 OmniKB Knowledge Base successfully built!`);
  console.log(`- Files indexed: ${stats.totalFiles}`);
  console.log(`- Total Symbols: ${stats.totalNodes}`);
  console.log(`- Relationships/Edges: ${stats.totalEdges}`);
  console.log(`- God Nodes detected: ${stats.godNodes.length}`);
}

build().catch((err) => {
  console.error('Error during indexing:', err);
  process.exit(1);
});
