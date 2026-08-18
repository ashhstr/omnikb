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
const fs = __importStar(require("fs"));
const workspace_registry_1 = require("./core/workspace-registry");
const workspace_manager_1 = require("./core/workspace-manager");
const mcp_server_1 = require("./server/mcp-server");
const http_server_1 = require("./server/http-server");
function printBanner() {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│    OmniKB: Universal Real-Time Code Knowledge Base Engine   │
│  Auto-Sync · SQLite/FTS5 · Graph RAG · MCP · Multi-Workspace│
└─────────────────────────────────────────────────────────────┘
`);
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const isJsonMode = args.includes('--json') || ['explore', 'impact', 'search'].includes(command);
    const isMcp = args.includes('--mcp') || !process.stdout.isTTY;
    // If JSON mode or MCP mode, redirect standard console.log to stderr so stdout is never corrupted
    if (isJsonMode || isMcp) {
        console.log = (...logArgs) => console.error(...logArgs);
    }
    const registry = new workspace_registry_1.WorkspaceRegistry();
    const manager = new workspace_manager_1.WorkspaceManager(registry);
    let workspaceRoot = process.cwd();
    const wsIdxLong = args.indexOf('--workspace');
    const wsIdxShort = args.indexOf('-w');
    const wsIndex = wsIdxLong !== -1 ? wsIdxLong : wsIdxShort;
    if (wsIndex !== -1 && args[wsIndex + 1]) {
        workspaceRoot = path.resolve(args[wsIndex + 1]);
    }
    else {
        // If no explicit workspace, use cwd if it looks like a project, otherwise active registry
        const cwdRoot = workspace_registry_1.WorkspaceRegistry.detectProjectRoot(process.cwd());
        const cwdLooksLikeProject = cwdRoot !== process.cwd() || fs.existsSync(path.join(process.cwd(), 'package.json')) || fs.existsSync(path.join(process.cwd(), '.git'));
        if (!cwdLooksLikeProject) {
            const active = registry.getActive();
            if (active && command !== 'register') {
                workspaceRoot = active.rootPath;
            }
        }
    }
    switch (command) {
        case 'register': {
            printBanner();
            const targetPath = args[1] || workspaceRoot;
            const customName = args[2];
            const resolved = path.resolve(targetPath);
            console.log(`[OmniKB] Registering workspace: ${resolved}`);
            const instance = await manager.registerAndLoad(resolved, customName, true);
            const stats = instance.graph.getStats();
            console.log(`\n✅ Workspace '${instance.entry.name}' registered & indexed:`);
            console.log(`   - ID: ${instance.entry.id}`);
            console.log(`   - Root: ${instance.entry.rootPath}`);
            console.log(`   - Files: ${stats.totalFiles} | Nodes: ${stats.totalNodes} | Edges: ${stats.totalEdges}`);
            manager.dispose();
            break;
        }
        case 'unregister': {
            printBanner();
            const target = args[1] || workspaceRoot;
            const success = await manager.unregister(target);
            if (success) {
                console.log(`✅ Unregistered workspace: '${target}'`);
            }
            else {
                console.log(`⚠️  Workspace '${target}' not found in registry.`);
            }
            break;
        }
        case 'workspaces': {
            printBanner();
            const list = registry.list();
            const active = registry.getActive();
            console.log(`📁 Registered Workspaces (${list.length}):\n`);
            if (list.length === 0) {
                console.log(`  (No workspaces registered yet. Run 'omnikb register <path>' or 'omnikb init')`);
            }
            else {
                for (const ws of list) {
                    const isActive = active && active.id === ws.id;
                    const marker = isActive ? '▶ [ACTIVE]' : ' ';
                    console.log(`  ${marker} ${ws.name.padEnd(20)} | ID: ${ws.id} | Nodes: ${ws.totalNodes} | Files: ${ws.totalFiles}`);
                    console.log(`     Path: ${ws.rootPath}\n`);
                }
            }
            manager.dispose();
            break;
        }
        case 'switch': {
            printBanner();
            const target = args[1];
            if (!target) {
                console.error('Error: Please provide a workspace name, ID, or path to switch to.');
                console.error('Example: omnikb switch "Ash-Portofolio-main"');
                process.exit(1);
            }
            const instance = await manager.switchTo(target);
            console.log(`✅ Switched active workspace to: '${instance.entry.name}' (${instance.entry.rootPath})`);
            manager.dispose();
            break;
        }
        case 'init': {
            printBanner();
            console.log(`[OmniKB] Initializing knowledge base for: ${workspaceRoot}`);
            const instance = await manager.registerAndLoad(workspaceRoot, undefined, true);
            console.log(`\n✅ Setup complete! Created:`);
            console.log(`   - .omnikb/knowledge-graph.json`);
            console.log(`   - .omnikb/graph.html (Interactive visualizer)`);
            console.log(`   - KNOWLEDGE_BASE.md (Live agent architecture doc)`);
            console.log(`   - Registered in global catalog: ${instance.entry.id}`);
            manager.dispose();
            break;
        }
        case 'watch': {
            printBanner();
            const instance = await manager.registerAndLoad(workspaceRoot, undefined, false);
            await instance.watcher.initialScan();
            instance.watcher.startWatching();
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
            // Auto-register and load target workspace
            const instance = await manager.registerAndLoad(workspaceRoot, undefined, false);
            await instance.watcher.initialScan();
            // Start HTTP REST API server
            const httpServer = new http_server_1.LocalHttpServer(port, manager);
            await httpServer.start();
            // If MCP flag or non-interactive stdio, launch MCP server with WorkspaceManager
            if (isMcp) {
                const mcpServer = new mcp_server_1.McpServer(manager);
                mcpServer.startStdio();
            }
            else {
                printBanner();
                console.log(`[OmniKB] Real-time multi-workspace engine active.`);
                console.log(`- Active Workspace: ${instance.entry.name} (${instance.entry.rootPath})`);
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
            const instance = await manager.resolveInstance(workspaceRoot);
            const result = instance.graph.explore(query, 3);
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
            manager.dispose();
            break;
        }
        case 'impact': {
            const target = args[1];
            if (!target) {
                console.error('Error: Please provide a symbol/file to check impact. Example: omnikb impact storage.ts');
                process.exit(1);
            }
            const instance = await manager.resolveInstance(workspaceRoot);
            const result = instance.graph.calculateImpact(target, 5);
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
            manager.dispose();
            break;
        }
        case 'audit-impact': {
            let target;
            let maxRisk = 'HIGH';
            let depth = 5;
            let isJson = false;
            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                if (arg === '--json') {
                    isJson = true;
                }
                else if (arg === '--max-risk' && args[i + 1]) {
                    const val = args[i + 1].toUpperCase();
                    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(val)) {
                        maxRisk = val;
                    }
                    i++;
                }
                else if (arg.startsWith('--max-risk=')) {
                    const val = arg.split('=')[1].toUpperCase();
                    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(val)) {
                        maxRisk = val;
                    }
                }
                else if (arg === '--depth' && args[i + 1]) {
                    const parsed = parseInt(args[i + 1], 10);
                    if (!isNaN(parsed) && parsed > 0)
                        depth = parsed;
                    i++;
                }
                else if (arg.startsWith('--depth=')) {
                    const parsed = parseInt(arg.split('=')[1], 10);
                    if (!isNaN(parsed) && parsed > 0)
                        depth = parsed;
                }
                else if (arg === '--workspace' || arg === '-w') {
                    i++; // skip workspace value
                }
                else if (!arg.startsWith('-') && !target) {
                    target = arg;
                }
            }
            if (!target) {
                if (isJson) {
                    console.error(JSON.stringify({ error: 'Please provide a target symbol or file to audit impact.' }));
                }
                else {
                    console.error('Error: Please provide a symbol or file to audit impact.');
                    console.error('Usage: omnikb audit-impact <target> [--max-risk <LOW|MEDIUM|HIGH|CRITICAL>] [--depth <number>] [--json]');
                }
                process.exit(1);
            }
            const instance = await manager.resolveInstance(workspaceRoot);
            const result = instance.graph.calculateImpact(target, depth);
            const RISK_LEVELS = {
                LOW: 1,
                MEDIUM: 2,
                HIGH: 3,
                CRITICAL: 4,
            };
            const currentRiskVal = RISK_LEVELS[result.riskScore] || 1;
            const maxRiskVal = RISK_LEVELS[maxRisk] || 3;
            const passed = currentRiskVal <= maxRiskVal;
            if (isJson) {
                process.stdout.write(JSON.stringify({
                    passed,
                    maxAllowedRisk: maxRisk,
                    ...result,
                }, null, 2) + '\n');
            }
            else {
                printBanner();
                if (passed) {
                    console.log(`✅ [OmniKB Audit Impact] PASSED (Risk: ${result.riskScore} <= Max Allowed: ${maxRisk})`);
                    console.log(`   - Target: ${result.target}`);
                    console.log(`   - Direct Callers: ${result.directCallers.length}`);
                    console.log(`   - Transitive Callers: ${result.transitiveCallers.length}`);
                    console.log(`   - Affected Files (${result.affectedFiles.length}):`);
                    result.affectedFiles.slice(0, 10).forEach((f) => console.log(`     • ${f}`));
                    if (result.affectedFiles.length > 10) {
                        console.log(`     ... and ${result.affectedFiles.length - 10} more file(s)`);
                    }
                    if (result.affectedRoutes.length > 0) {
                        console.log(`   - Affected Routes (${result.affectedRoutes.length}):`);
                        result.affectedRoutes.forEach((r) => console.log(`     • [${r.name}] ${r.filePath}`));
                    }
                    console.log(`   - Summary: ${result.summary}\n`);
                }
                else {
                    console.error(`🚨 [OmniKB Audit Impact] FAILED: Blast radius risk threshold exceeded!`);
                    console.error(`   - Target: ${result.target}`);
                    console.error(`   - Calculated Risk: ${result.riskScore} (Allowed Maximum: ${maxRisk})`);
                    console.error(`   - Direct Callers: ${result.directCallers.length}`);
                    console.error(`   - Transitive Callers: ${result.transitiveCallers.length}`);
                    console.error(`   - Affected Files (${result.affectedFiles.length}):`);
                    result.affectedFiles.forEach((f) => console.error(`     • ${f}`));
                    if (result.affectedRoutes.length > 0) {
                        console.error(`   - Affected Routes (${result.affectedRoutes.length}):`);
                        result.affectedRoutes.forEach((r) => console.error(`     • [${r.name}] ${r.filePath}`));
                    }
                    console.error(`   - Summary: ${result.summary}`);
                    console.error(`\n❌ CI/CD Gate Failed: Blast radius exceeds maximum risk policy (${result.riskScore} > ${maxRisk}).\n`);
                }
            }
            manager.dispose();
            if (!passed) {
                process.exit(1);
            }
            break;
        }
        case 'search': {
            const query = args[1];
            if (!query) {
                console.error('Error: Please provide a search query. Example: omnikb search "parse"');
                process.exit(1);
            }
            const instance = await manager.resolveInstance(workspaceRoot);
            const result = instance.storage.search(query, 10);
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
            manager.dispose();
            break;
        }
        case 'report': {
            printBanner();
            const instance = await manager.resolveInstance(wsIndex !== -1 ? workspaceRoot : undefined);
            const reportPath = await instance.reporter.generateMarkdownReport();
            console.log(`✅ Generated live markdown report at: ${reportPath}`);
            manager.dispose();
            break;
        }
        case 'visual': {
            printBanner();
            const instance = await manager.resolveInstance(wsIndex !== -1 ? workspaceRoot : undefined);
            const visualPath = await instance.reporter.generateHtmlVisualizer();
            console.log(`✅ Generated standalone visualizer at: ${visualPath}`);
            manager.dispose();
            break;
        }
        case 'install':
        case 'setup': {
            const { runSetupWizard } = require('./setup-wizard');
            await runSetupWizard();
            manager.dispose();
            break;
        }
        case 'help':
        default: {
            printBanner();
            console.log(`Usage: omnikb <command> [options]\n`);
            console.log(`Workspace Commands:`);
            console.log(`  workspaces                 List all registered workspaces and active status`);
            console.log(`  register [path] [name]     Register and index a workspace in the global catalog`);
            console.log(`  unregister <target>        Remove workspace from global catalog`);
            console.log(`  switch <target>            Switch active workspace context\n`);
            console.log(`Graph & Service Commands:`);
            console.log(`  init [--workspace <path>]  Scan workspace, build graph, and create initial docs`);
            console.log(`  watch [--workspace <path>] Run continuous background watcher with auto-sync`);
            console.log(`  serve [--port] [--mcp]     Run real-time multi-workspace server + MCP stdio`);
            console.log(`  explore <symbol>           Explore symbol context, callers, callees, and code`);
            console.log(`  impact <symbol>            Calculate blast radius and affected files`);
            console.log(`  audit-impact <target>      Audit blast radius in CI/CD pipeline against max allowed risk`);
            console.log(`  search <query>             Search symbols and tokens across knowledge base`);
            console.log(`  report                     Re-generate KNOWLEDGE_BASE.md`);
            console.log(`  visual                     Re-generate .omnikb/graph.html visualizer`);
            console.log(`  setup                      Run interactive setup wizard for AI Agents and Memory location`);
            console.log(`  help                       Show this help message\n`);
            break;
        }
    }
}
main().catch((err) => {
    console.error('[OmniKB CLI Error]:', err);
    process.exit(1);
});
