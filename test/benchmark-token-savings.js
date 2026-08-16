const fs = require('fs');
const path = require('path');

// First compile TS if needed or require dist directly
const { CodeParser } = require('../dist/core/parser');
const { KnowledgeStorage } = require('../dist/core/storage');
const { GraphEngine } = require('../dist/core/graph');
const { WorkspaceWatcher } = require('../dist/core/watcher');
const { KnowledgeReporter } = require('../dist/core/reporter');

function estimateTokens(text) {
  // Standard rule of thumb for code/text: ~3.8 to 4 characters per token
  return Math.ceil(text.length / 3.8);
}

async function runBenchmark() {
  const rootDir = path.resolve(__dirname, '..');
  
  // 1. Calculate Full Context Dump (Naive RAG / dumping all src files into prompt)
  const srcDir = path.join(rootDir, 'src');
  function getAllFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(full));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        files.push(full);
      }
    }
    return files;
  }

  const allSrcFiles = getAllFiles(srcDir);
  let totalRawChars = 0;
  let fullDumpContent = '';
  
  for (const f of allSrcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    totalRawChars += content.length;
    fullDumpContent += `\n--- FILE: ${path.relative(rootDir, f)} ---\n` + content;
  }

  const fullDumpTokens = estimateTokens(fullDumpContent);

  // 2. Initialize OmniKB Engine & Index workspace
  const parser = new CodeParser();
  const storage = new KnowledgeStorage(rootDir);
  await storage.init();
  const graph = new GraphEngine(rootDir, storage);
  const reporter = new KnowledgeReporter(rootDir, storage, graph);
  const watcher = new WorkspaceWatcher(
    { rootPath: rootDir, autoGenerateReport: false, autoGenerateVisual: false },
    parser, storage, graph, reporter
  );
  await watcher.initialScan();

  // 3. Test Surgical Context Retrieval (kb_explore) on representative queries
  const testQueries = ['checkFreshness', 'forceReconcile', 'calculateImpact', 'McpServer', 'CodeParser'];
  
  console.log('===============================================================');
  console.log('📊 OMNIKB v1.3.0 TOKEN SAVINGS BENCHMARK REPORT');
  console.log('===============================================================\n');
  console.log(`📁 Project Scope: ${allSrcFiles.length} source files in /src`);
  console.log(`📜 Full Repository Context Size: ${fullDumpContent.length.toLocaleString()} chars (~${fullDumpTokens.toLocaleString()} tokens)\n`);

  let totalExploreTokens = 0;
  
  console.log('-------------------------------------------------------------------------');
  console.log('Query Symbol       | OmniKB Payload  | Tokens   | Token Savings %');
  console.log('-------------------------------------------------------------------------');

  for (const query of testQueries) {
    const exploreRes = graph.explore(query, 3);
    const jsonPayload = JSON.stringify(exploreRes, null, 2);
    const tokens = estimateTokens(jsonPayload);
    totalExploreTokens += tokens;
    
    const savingsPct = (((fullDumpTokens - tokens) / fullDumpTokens) * 100).toFixed(2);
    console.log(
      `${query.padEnd(18)} | ${jsonPayload.length.toString().padStart(12)} B | ${tokens.toString().padStart(8)} | ${savingsPct}%`
    );
  }

  const avgExploreTokens = Math.round(totalExploreTokens / testQueries.length);
  const avgSavingsPct = (((fullDumpTokens - avgExploreTokens) / fullDumpTokens) * 100).toFixed(2);

  console.log('-------------------------------------------------------------------------');
  console.log(`RATA-RATA ON-DEMAND RETRIEVAL : ~${avgExploreTokens.toLocaleString()} tokens`);
  console.log(`FULL CONTEXT DUMP             : ~${fullDumpTokens.toLocaleString()} tokens`);
  console.log(`KLAIM SAVING RATE EFFICIENCY  : ${avgSavingsPct}% TOKEN SAVINGS`);
  console.log('===============================================================\n');
}

runBenchmark().catch(console.error);
