#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { CodeParser } from './core/parser';
import { KnowledgeStorage } from './core/storage';
import { GraphEngine } from './core/graph';
import { KnowledgeReporter } from './core/reporter';
import { WorkspaceWatcher } from './core/watcher';
import { McpServer } from './server/mcp-server';
import { LocalHttpServer } from './server/http-server';

function printBanner() {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│    OmniKB: Universal Real-Time Code Knowledge Base Engine   │
│  Auto-Sync · SQLite/FTS5 · Graph RAG · MCP · Local REST API │
└─────────────────────────────────────────────────────────────┘
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // Resolve target workspace directory
  let targetDir = process.cwd();
  const wsIndex = args.indexOf('--workspace');
  if (wsIndex !== -1 && args[wsIndex + 1]) {
    targetDir = path.resolve(args[wsIndex + 1]);
  } else if (
    args[1] &&
    !args[1].startsWith('-') &&
    !['explore', 'impact', 'search'].includes(command)
  ) {
    targetDir = path.resolve(args[1]);
  }

  const workspaceRoot = targetDir;
  const parser = new CodeParser();
  const storage = new KnowledgeStorage(workspaceRoot);
  await storage.init();

  const graph = new GraphEngine(workspaceRoot, storage);
  const reporter = new KnowledgeReporter(workspaceRoot, storage, graph);
  const watcher = new WorkspaceWatcher(
    {
      rootPath: workspaceRoot,
      debounceMs: 400,
      autoGenerateReport: true,
      autoGenerateVisual: true,
    },
    parser,
    storage,
    graph,
    reporter
  );

  switch (command) {
    case 'init': {
      printBanner();
      console.log(`[OmniKB] Initializing knowledge base for: ${workspaceRoot}`);
      await watcher.initialScan();
      console.log(`\n✅ Setup complete! Created:`);
      console.log(`   - ${path.join(workspaceRoot, '.omnikb', 'knowledge-graph.json')}`);
      console.log(`   - ${path.join(workspaceRoot, '.omnikb', 'graph.html')} (Interactive visualizer)`);
      console.log(`   - ${path.join(workspaceRoot, 'KNOWLEDGE_BASE.md')} (Live agent architecture doc)`);
      break;
    }

    case 'watch': {
      printBanner();
      await watcher.initialScan();
      watcher.startWatching();
      console.log(`[OmniKB] Watching workspace: ${workspaceRoot}`);
      console.log(`[OmniKB] Press Ctrl+C to stop watcher.`);
      // Keep process alive
      setInterval(() => {}, 1000 * 60);
      break;
    }

    case 'serve': {
      const isMcp = args.includes('--mcp') || !process.stdout.isTTY;
      const portIndex = args.indexOf('--port');
      const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 7890;

      await watcher.initialScan();
      watcher.startWatching();

      // Start HTTP REST API server
      const httpServer = new LocalHttpServer(port, workspaceRoot, graph, storage, watcher);
      await httpServer.start();

      // If MCP flag or non-interactive stdio, launch MCP server
      if (isMcp) {
        const mcpServer = new McpServer(workspaceRoot, parser, storage, graph, reporter, watcher);
        mcpServer.startStdio();
      } else {
        printBanner();
        console.log(`[OmniKB] Real-time engine active for workspace: ${workspaceRoot}`);
        console.log(`- REST API: http://127.0.0.1:${port}`);
        console.log(`- Visualizer: http://127.0.0.1:${port}/visual`);
        console.log(`- Live Doc: ${path.join(workspaceRoot, 'KNOWLEDGE_BASE.md')}`);
        console.log(`\nPress Ctrl+C to exit.`);
        setInterval(() => {}, 1000 * 60);
      }
      break;
    }

    case 'explore': {
      const query = args[1];
      if (!query) {
        console.error('Error: Please provide a symbol name to explore. Example: omnikb explore calculateImpact');
        process.exit(1);
      }
      const result = graph.explore(query, 3);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'impact': {
      const target = args[1];
      if (!target) {
        console.error('Error: Please provide a symbol/file to check impact. Example: omnikb impact storage.ts');
        process.exit(1);
      }
      const result = graph.calculateImpact(target, 5);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'search': {
      const query = args[1];
      if (!query) {
        console.error('Error: Please provide a search query. Example: omnikb search "parse"');
        process.exit(1);
      }
      const result = storage.search(query, 10);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'report': {
      printBanner();
      const reportPath = await reporter.generateMarkdownReport();
      console.log(`✅ Generated live markdown report at: ${reportPath}`);
      break;
    }

    case 'visual': {
      printBanner();
      const visualPath = await reporter.generateHtmlVisualizer();
      console.log(`✅ Generated standalone visualizer at: ${visualPath}`);
      break;
    }

    case 'help':
    default: {
      printBanner();
      console.log(`Usage: omnikb <command> [directory] [options]\n`);
      console.log(`Commands:`);
      console.log(`  init [dir]                Scan workspace, build graph, and create initial docs`);
      console.log(`  watch [dir]               Run continuous background watcher with auto-sync`);
      console.log(`  serve [dir] [--port]      Run real-time watcher + HTTP REST API + MCP stdio server`);
      console.log(`  explore <symbol>          Explore symbol context, callers, callees, and verbatim source`);
      console.log(`  impact <symbol>           Calculate blast radius and affected files for a change`);
      console.log(`  search <query>            Search symbols and tokens across knowledge base`);
      console.log(`  report [dir]              Re-generate KNOWLEDGE_BASE.md`);
      console.log(`  visual [dir]              Re-generate .omnikb/graph.html visualizer`);
      console.log(`  help                      Show this help message\n`);
      console.log(`Options:`);
      console.log(`  --mcp                     Start stdio MCP server for agent integration`);
      console.log(`  --port <number>           Port for HTTP server (default: 7890)`);
      console.log(`  --workspace <dir>         Explicitly specify workspace directory`);
      break;
    }
  }
}

main().catch((err) => {
  console.error('[OmniKB CLI Error]:', err);
  process.exit(1);
});
