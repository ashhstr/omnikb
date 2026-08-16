#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dbFilePath = fs.existsSync(path.join(rootDir, '.omnikb', 'knowledge-graph.json'))
  ? path.join(rootDir, '.omnikb', 'knowledge-graph.json')
  : path.join(rootDir, '.omnikb', 'graph.json');

console.log('🔍 OmniKB State & Graph Diagnostic Tool');
console.log('=========================================');

if (!fs.existsSync(dbFilePath)) {
  console.log('ℹ️  No index found at .omnikb/knowledge-graph.json. Run "npm start" or index your workspace first.');
  process.exit(0);
}

try {
  const raw = fs.readFileSync(dbFilePath, 'utf8');
  const sizeKb = (Buffer.byteLength(raw, 'utf8') / 1024).toFixed(2);
  const data = JSON.parse(raw);

  console.log(`📂 Index File Size : ${sizeKb} KB`);
  console.log(`🕒 Last Updated    : ${data.lastUpdated || 'Unknown'}`);
  console.log(`📊 Nodes Count     : ${data.nodes ? data.nodes.length : 0}`);
  console.log(`🔗 Edges Count     : ${data.edges ? data.edges.length : 0}`);

  const nodeMap = new Set();
  const fileNodes = new Set();
  let internalBrokenEdges = 0;
  let unresolvedExternalSymbols = 0;
  let selfLoops = 0;
  const missingFiles = [];

  if (Array.isArray(data.nodes)) {
    for (const node of data.nodes) {
      nodeMap.add(node.id);
      if (node.kind === 'file' || node.id.startsWith('file:')) {
        const filePath = node.filePath || node.id.replace(/^file:/, '');
        fileNodes.add(filePath);
        const abs = path.resolve(rootDir, filePath);
        if (!fs.existsSync(abs) && !filePath.startsWith('node:')) {
          missingFiles.push(filePath);
        }
      }
    }
  }

  if (Array.isArray(data.edges)) {
    for (const edge of data.edges) {
      const srcExists = nodeMap.has(edge.sourceId);
      const tgtExists = nodeMap.has(edge.targetId);

      if (!srcExists) {
        internalBrokenEdges++;
      } else if (!tgtExists) {
        if (edge.targetId.startsWith('sym:') || edge.targetId.startsWith('pkg:') || edge.targetId.startsWith('crate:') || edge.targetId.startsWith('file:')) {
          unresolvedExternalSymbols++;
        } else {
          internalBrokenEdges++;
        }
      }

      if (edge.sourceId === edge.targetId) {
        selfLoops++;
      }
    }
  }

  console.log('\n🩺 Diagnostic Results:');
  console.log(`- Unique Nodes Identified : ${nodeMap.size}`);
  console.log(`- Tracked Source Files    : ${fileNodes.size}`);
  console.log(`- Internal Broken Edges   : ${internalBrokenEdges === 0 ? '✅ None (0)' : `⚠️ ${internalBrokenEdges} found`}`);
  console.log(`- External References     : ℹ️  ${unresolvedExternalSymbols} external symbols/packages`);
  console.log(`- Self-referencing Edges  : ${selfLoops}`);
  console.log(`- Missing File References : ${missingFiles.length === 0 ? '✅ All files exist locally' : `⚠️ ${missingFiles.length} missing files: ${missingFiles.slice(0, 3).join(', ')}`}`);

  if (internalBrokenEdges === 0 && missingFiles.length === 0) {
    console.log('\n🎉 Graph integrity check PASSED! 100% healthy.\n');
  } else {
    console.log('\n⚠️  Graph integrity warnings detected. Running full resync will clean stale nodes.\n');
  }
} catch (err) {
  console.error('❌ Failed to parse graph state:', err.message);
  process.exit(1);
}
