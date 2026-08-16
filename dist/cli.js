#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const parser_1 = require("./core/parser");
const storage_1 = require("./core/storage");
const graph_1 = require("./core/graph");
const reporter_1 = require("./core/reporter");
const watcher_1 = require("./core/watcher");
const mcp_server_1 = require("./server/mcp-server");
const http_server_1 = require("./server/http-server");
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
    let workspaceRoot = process.cwd();
    const wsIdxLong = args.indexOf('--workspace');
    const wsIdxShort = args.indexOf('-w');
    const wsIndex = wsIdxLong !== -1 ? wsIdxLong : wsIdxShort;
    if (wsIndex !== -1 && args[wsIndex + 1]) {
        workspaceRoot = path.resolve(args[wsIndex + 1]);
    }
    const parser = new parser_1.CodeParser();
    const storage = new storage_1.KnowledgeStorage(workspaceRoot);
    await storage.init();
    const graph = new graph_1.GraphEngine(workspaceRoot, storage);
    const reporter = new reporter_1.KnowledgeReporter(workspaceRoot, storage, graph);
    const watcher = new watcher_1.WorkspaceWatcher({
        rootPath: workspaceRoot,
        debounceMs: 400,
        autoGenerateReport: true,
        autoGenerateVisual: true,
    }, parser, storage, graph, reporter);
    switch (command) {
        case 'init': {
            printBanner();
            console.log(`[OmniKB] Initializing knowledge base for: ${workspaceRoot}`);
            await watcher.initialScan();
            console.log(`\n✅ Setup complete! Created:`);
            console.log(`   - .omnikb/knowledge-graph.json`);
            console.log(`   - .omnikb/graph.html (Interactive visualizer)`);
            console.log(`   - KNOWLEDGE_BASE.md (Live agent architecture doc)`);
            break;
        }
        case 'watch': {
            printBanner();
            await watcher.initialScan();
            watcher.startWatching();
            console.log(`[OmniKB] Press Ctrl+C to stop watcher.`);
            // Keep process alive
            setInterval(() => { }, 1000 * 60);
            break;
        }
        case 'serve': {
            const isMcp = args.includes('--mcp') || !process.stdout.isTTY;
            const portIndex = args.indexOf('--port');
            const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 7890;
            // If MCP mode, redirect standard console.log to stderr so JSON-RPC stdout is never corrupted
            if (isMcp) {
                console.log = (...logArgs) => console.error(...logArgs);
            }
            await watcher.initialScan();
            watcher.startWatching();
            // Start HTTP REST API server
            const httpServer = new http_server_1.LocalHttpServer(port, workspaceRoot, graph, storage, watcher);
            await httpServer.start();
            // If MCP flag or non-interactive stdio, launch MCP server
            if (isMcp) {
                const mcpServer = new mcp_server_1.McpServer(graph, storage, watcher);
                mcpServer.startStdio();
            }
            else {
                printBanner();
                console.log(`[OmniKB] Real-time engine active.`);
                console.log(`- REST API: http://127.0.0.1:${port}`);
                console.log(`- Visualizer: http://127.0.0.1:${port}/visual`);
                console.log(`- Live Doc: ${path.join(workspaceRoot, 'KNOWLEDGE_BASE.md')}`);
                console.log(`\nPress Ctrl+C to exit.`);
                setInterval(() => { }, 1000 * 60);
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
            console.log(`Usage: omnikb <command> [options]\n`);
            console.log(`Commands:`);
            console.log(`  init              Scan workspace, build graph, and create initial docs`);
            console.log(`  watch             Run continuous background watcher with auto-sync`);
            console.log(`  serve [--port]    Run real-time watcher + HTTP REST API + MCP stdio server`);
            console.log(`  explore <symbol>  Explore symbol context, callers, callees, and verbatim source`);
            console.log(`  impact <symbol>   Calculate blast radius and affected files for a change`);
            console.log(`  search <query>    Search symbols and tokens across knowledge base`);
            console.log(`  report            Re-generate KNOWLEDGE_BASE.md`);
            console.log(`  visual            Re-generate .omnikb/graph.html visualizer`);
            console.log(`  help              Show this help message\n`);
            break;
        }
    }
}
main().catch((err) => {
    console.error('[OmniKB CLI Error]:', err);
    process.exit(1);
});
