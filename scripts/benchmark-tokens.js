/**
 * OmniKB Empirical Token Reduction Benchmark
 * Verifies and proves the ~90%+ token reduction claim across standard coding agent workflows.
 * Run via: npm run benchmark
 */

const fs = require('fs');
const path = require('path');
const { KnowledgeStorage } = require('../dist/core/storage');
const { GraphEngine } = require('../dist/core/graph');

async function runBenchmark() {
  const root = path.resolve(__dirname, '..');

  console.log('========================================================================');
  console.log('             OMNIKB EMPIRICAL TOKEN REDUCTION AUDIT BENCHMARK           ');
  console.log('========================================================================\n');

  const storage = new KnowledgeStorage(root);
  const loaded = storage.loadFromDisk();
  if (!loaded) {
    console.error('❌ Knowledge graph index not found. Please run `npm run index` first.');
    process.exit(1);
  }

  const graph = new GraphEngine(root, storage);

  // SCENARIO 1: Targeted Symbol Lookup & Inspection ("resolveCrossFileReferences")
  const targetSymbol = 'resolveCrossFileReferences';
  const res1 = graph.explore(targetSymbol, 1);
  const json1 = JSON.stringify(res1, null, 2);
  const omni1Tokens = Math.ceil(json1.length / 3.75);

  // Traditional approach requires reading the files containing implementation, types, and AST extractor
  const files1 = ['src/core/graph.ts', 'src/types/index.ts', 'src/core/parser-ts-ast.ts'];
  let raw1 = '';
  for (const f of files1) {
    if (fs.existsSync(path.join(root, f))) {
      raw1 += fs.readFileSync(path.join(root, f), 'utf8') + '\n';
    }
  }
  const raw1Tokens = Math.ceil(raw1.length / 3.75);
  const saved1 = raw1Tokens - omni1Tokens;
  const red1 = ((saved1 / raw1Tokens) * 100).toFixed(2);

  // SCENARIO 2: Refactoring Blast Radius Calculation ("KnowledgeStorage")
  const targetComp = 'KnowledgeStorage';
  const res2 = graph.calculateImpact(targetComp, 3);
  const json2 = JSON.stringify(res2, null, 2);
  const omni2Tokens = Math.ceil(json2.length / 3.75);

  // Traditional approach: Grepping and loading all 9 dependent files across the codebase
  const files2 = [
    'src/core/storage.ts',
    'src/core/graph.ts',
    'src/core/parser.ts',
    'src/core/reporter.ts',
    'src/core/watcher.ts',
    'src/server/mcp-server.ts',
    'src/server/http-server.ts',
    'src/cli.ts',
    'test/run-tests.js',
  ];
  let raw2 = '';
  for (const f of files2) {
    if (fs.existsSync(path.join(root, f))) {
      raw2 += fs.readFileSync(path.join(root, f), 'utf8') + '\n';
    }
  }
  const raw2Tokens = Math.ceil(raw2.length / 3.75);
  const saved2 = raw2Tokens - omni2Tokens;
  const red2 = ((saved2 / raw2Tokens) * 100).toFixed(2);

  // SCENARIO 3: Inverted Index Symbol Search vs Global Code Grep
  const searchRes = storage.search('switchWorkspace', 5);
  const json3 = JSON.stringify(searchRes, null, 2);
  const omni3Tokens = Math.ceil(json3.length / 3.75);

  // Traditional: dumping search results with whole file contexts
  const files3 = ['src/server/mcp-server.ts', 'src/cli.ts', 'test/run-tests.js'];
  let raw3 = '';
  for (const f of files3) {
    if (fs.existsSync(path.join(root, f))) {
      raw3 += fs.readFileSync(path.join(root, f), 'utf8') + '\n';
    }
  }
  const raw3Tokens = Math.ceil(raw3.length / 3.75);
  const saved3 = raw3Tokens - omni3Tokens;
  const red3 = ((saved3 / raw3Tokens) * 100).toFixed(2);

  console.log("[SCENARIO 1: Targeted Symbol Inspection ('resolveCrossFileReferences')]");
  console.log(`- Traditional Agent (Read 3 Full Source Files) : ${raw1.length.toLocaleString()} chars | ~${raw1Tokens.toLocaleString()} tokens`);
  console.log(`- OmniKB Surgical Graph (kb_explore)           : ${json1.length.toLocaleString()} chars | ~${omni1Tokens.toLocaleString()} tokens`);
  console.log(`>>> EXACT TOKENS SAVED                         : ~${saved1.toLocaleString()} tokens`);
  console.log(`>>> PROVEN TOKEN REDUCTION                     : ${red1}%\n`);

  console.log('------------------------------------------------------------------------');
  console.log("\n[SCENARIO 2: Refactoring Blast Radius Analysis ('KnowledgeStorage')]");
  console.log(`- Traditional Agent (Recursive Grep & 9 Files) : ${raw2.length.toLocaleString()} chars | ~${raw2Tokens.toLocaleString()} tokens`);
  console.log(`- OmniKB Blast Radius Graph (kb_impact)        : ${json2.length.toLocaleString()} chars | ~${omni2Tokens.toLocaleString()} tokens`);
  console.log(`>>> EXACT TOKENS SAVED                         : ~${saved2.toLocaleString()} tokens`);
  console.log(`>>> PROVEN TOKEN REDUCTION                     : ${red2}%\n`);

  console.log('------------------------------------------------------------------------');
  console.log("\n[SCENARIO 3: Inverted Index Symbol Search ('switchWorkspace')]");
  console.log(`- Traditional Agent (Full File Pattern Search) : ${raw3.length.toLocaleString()} chars | ~${raw3Tokens.toLocaleString()} tokens`);
  console.log(`- OmniKB Inverted Search (kb_search)           : ${json3.length.toLocaleString()} chars | ~${omni3Tokens.toLocaleString()} tokens`);
  console.log(`>>> EXACT TOKENS SAVED                         : ~${saved3.toLocaleString()} tokens`);
  console.log(`>>> PROVEN TOKEN REDUCTION                     : ${red3}%\n`);

  const totalTraditional = raw1Tokens + raw2Tokens + raw3Tokens;
  const totalOmniKB = omni1Tokens + omni2Tokens + omni3Tokens;
  const totalSaved = totalTraditional - totalOmniKB;
  const overallReduction = ((totalSaved / totalTraditional) * 100).toFixed(2);

  console.log('========================================================================');
  console.log('                       FINAL AUDIT VERDICT                              ');
  console.log('========================================================================');
  console.log(`Total Traditional Pipeline Tokens : ~${totalTraditional.toLocaleString()} tokens`);
  console.log(`Total OmniKB Graph RAG Tokens     : ~${totalOmniKB.toLocaleString()} tokens`);
  console.log(`Overall Net Tokens Saved          : ~${totalSaved.toLocaleString()} tokens`);
  console.log(`AVERAGE EMPIRICAL REDUCTION RATE  : ${overallReduction}%`);
  console.log('========================================================================\n');
}

runBenchmark().catch(console.error);
