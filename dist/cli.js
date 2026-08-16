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
function parseArgs(args) {
    const command = args[0] || 'help';
    // Resolve target workspace directory
    let targetDir = process.cwd();
    const wsIndex = args.indexOf('--workspace');
    if (wsIndex !== -1 && args[wsIndex + 1]) {
        targetDir = path.resolve(args[wsIndex + 1]);
    }
    else if (args[1] &&
        !args[1].startsWith('-') &&
        !['explore', 'impact', 'search'].includes(command)) {
        targetDir = path.resolve(args[1]);
    }
    const portIndex = args.indexOf('--port');
    const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 7890;
    return {
        command,
        workspaceRoot: targetDir,
        port,
        isMcp: args.includes('--mcp') || !process.stdout.isTTY,
    };
}
async function initServices(workspaceRoot) {
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
    return { parser, storage, graph, reporter, watcher };
}
function keepAlive() {
    setInterval(() => { }, 1000 * 60);
}
async function handleInit(services, options) {
    printBanner();
    console.log(`[OmniKB] Initializing knowledge base for: ${options.workspaceRoot}`);
    await services.watcher.initialScan();
    console.log(`\n✅ Setup complete! Created:`);
    console.log(`   - ${path.join(options.workspaceRoot, '.omnikb', 'knowledge-graph.json')}`);
    console.log(`   - ${path.join(options.workspaceRoot, '.omnikb', 'graph.html')} (Interactive visualizer)`);
    console.log(`   - ${path.join(options.workspaceRoot, 'KNOWLEDGE_BASE.md')} (Live agent architecture doc)`);
}
async function handleWatch(services, options) {
    printBanner();
    await services.watcher.initialScan();
    services.watcher.startWatching();
    console.log(`[OmniKB] Watching workspace: ${options.workspaceRoot}`);
    console.log(`[OmniKB] Press Ctrl+C to stop watcher.`);
    keepAlive();
}
async function handleServe(services, options) {
    await services.watcher.initialScan();
    services.watcher.startWatching();
    // Start HTTP REST API server
    const httpServer = new http_server_1.LocalHttpServer(options.port, options.workspaceRoot, services.graph, services.storage, services.watcher);
    await httpServer.start();
    // If MCP flag or non-interactive stdio, launch MCP server
    if (options.isMcp) {
        const mcpServer = new mcp_server_1.McpServer(options.workspaceRoot, services.parser, services.storage, services.graph, services.reporter, services.watcher);
        mcpServer.startStdio();
    }
    else {
        printBanner();
        console.log(`[OmniKB] Real-time engine active for workspace: ${options.workspaceRoot}`);
        console.log(`- REST API: http://127.0.0.1:${options.port}`);
        console.log(`- Visualizer: http://127.0.0.1:${options.port}/visual`);
        console.log(`- Live Doc: ${path.join(options.workspaceRoot, 'KNOWLEDGE_BASE.md')}`);
        console.log(`\nPress Ctrl+C to exit.`);
        keepAlive();
    }
}
function requireQueryArg(args, usage) {
    const query = args[1];
    if (!query) {
        console.error(`Error: ${usage}`);
        process.exit(1);
    }
    return query;
}
function handleExplore(services, args) {
    const query = requireQueryArg(args, 'Please provide a symbol name to explore. Example: omnikb explore calculateImpact');
    const includeFullFile = args.includes('--full');
    const includeImports = args.includes('--imports');
    const result = services.graph.explore(query, 3, { includeFullFile, includeImports });
    console.log(JSON.stringify(result, null, 2));
}
function handleImpact(services, args) {
    const target = requireQueryArg(args, 'Please provide a symbol/file to check impact. Example: omnikb impact storage.ts');
    const result = services.graph.calculateImpact(target, 5);
    console.log(JSON.stringify(result, null, 2));
}
function handleSearch(services, args) {
    const query = requireQueryArg(args, 'Please provide a search query. Example: omnikb search "parse"');
    const result = services.storage.search(query, 10);
    console.log(JSON.stringify(result, null, 2));
}
async function handleReport(services) {
    printBanner();
    const reportPath = await services.reporter.generateMarkdownReport();
    console.log(`✅ Generated live markdown report at: ${reportPath}`);
}
async function handleVisual(services) {
    printBanner();
    const visualPath = await services.reporter.generateHtmlVisualizer();
    console.log(`✅ Generated standalone visualizer at: ${visualPath}`);
}
function handleHelp() {
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
    console.log(`  --full                    Include full verbatim source file in explore output`);
    console.log(`  --imports                 Include all imported module symbols in explore output`);
    console.log(`  --mcp                     Start stdio MCP server for agent integration`);
    console.log(`  --port <number>           Port for HTTP server (default: 7890)`);
    console.log(`  --workspace <dir>         Explicitly specify workspace directory`);
}
async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    const services = await initServices(options.workspaceRoot);
    switch (options.command) {
        case 'init':
            await handleInit(services, options);
            break;
        case 'watch':
            await handleWatch(services, options);
            break;
        case 'serve':
            await handleServe(services, options);
            break;
        case 'explore':
            handleExplore(services, args);
            break;
        case 'impact':
            handleImpact(services, args);
            break;
        case 'search':
            handleSearch(services, args);
            break;
        case 'report':
            await handleReport(services);
            break;
        case 'visual':
            await handleVisual(services);
            break;
        case 'help':
        default:
            handleHelp();
            break;
    }
}
main().catch((err) => {
    console.error('[OmniKB CLI Error]:', err);
    process.exit(1);
});
