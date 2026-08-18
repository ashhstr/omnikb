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
exports.KnowledgeReporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class KnowledgeReporter {
    workspaceRoot;
    storage;
    graph;
    constructor(workspaceRoot, storage, graph) {
        this.workspaceRoot = workspaceRoot;
        this.storage = storage;
        this.graph = graph;
    }
    /**
     * Generates live Markdown Knowledge Base (KNOWLEDGE_BASE.md)
     */
    async generateMarkdownReport(outputPath) {
        const targetFile = outputPath || path.join(this.workspaceRoot, 'KNOWLEDGE_BASE.md');
        const stats = this.graph.getStats();
        // Group files by top-level directory
        const moduleMap = new Map();
        for (const filePath of this.storage.files.keys()) {
            const topDir = filePath.includes('/') ? filePath.split('/')[0] : 'root';
            if (!moduleMap.has(topDir)) {
                moduleMap.set(topDir, []);
            }
            moduleMap.get(topDir).push(filePath);
        }
        // Find routes
        const routes = Array.from(this.storage.nodes.values()).filter((n) => n.kind === 'route');
        let md = `# OmniKB Live Knowledge Base & Code Architecture Map\n\n`;
        md += `> **Auto-Updated**: ${new Date(stats.lastSyncTime).toISOString()} | **Indexed Files**: ${stats.totalFiles} | **Total Symbols**: ${stats.totalNodes} | **Call & Dependency Edges**: ${stats.totalEdges}\n\n`;
        md += `## 1. Executive Architecture Overview\n\n`;
        md += `| Metric | Count |\n`;
        md += `| :--- | :--- |\n`;
        md += `| **Source Files** | \`${stats.totalFiles}\` |\n`;
        md += `| **Functions & Methods** | \`${(stats.nodesByKind.function || 0) + (stats.nodesByKind.method || 0)}\` |\n`;
        md += `| **Classes & Interfaces** | \`${(stats.nodesByKind.class || 0) + (stats.nodesByKind.interface || 0)}\` |\n`;
        md += `| **Web Routes / API Endpoints** | \`${routes.length}\` |\n`;
        md += `| **Languages** | ${Object.entries(stats.languages).map(([l, c]) => `\`${l}: ${c}\``).join(', ')} |\n\n`;
        md += `## 2. High Centrality Components (God Nodes & Hotspots)\n\n`;
        md += `The most referenced and interconnected symbols in this repository:\n\n`;
        md += `| Symbol | File Path | Total Connections | Inbound Callers | Outbound Calls | PageRank |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        for (const node of stats.godNodes.slice(0, 8)) {
            md += `| **\`${node.name}\`** | \`${node.filePath}\` | **${node.degree}** | ${node.inDegree} | ${node.outDegree} | \`${node.pageRank || '-'}\` |\n`;
        }
        md += `\n`;
        if (routes.length > 0) {
            md += `## 3. Web & API Route Registry\n\n`;
            md += `| HTTP Method & Route | File Definition |\n`;
            md += `| :--- | :--- |\n`;
            for (const r of routes) {
                md += `| \`${r.name}\` | \`${r.filePath}:${r.startLine}\` |\n`;
            }
            md += `\n`;
        }
        md += `## 4. Module Map & Component Directory\n\n`;
        for (const [moduleName, files] of moduleMap.entries()) {
            md += `### \`/${moduleName}\` (${files.length} files)\n`;
            for (const f of files.slice(0, 10)) {
                const fileNodeCount = this.storage.fileNodesIndex.get(f)?.size || 0;
                md += `- **\`${f}\`**: \`${fileNodeCount} symbols\`\n`;
            }
            if (files.length > 10) {
                md += `- *(and ${files.length - 10} more files)*\n`;
            }
            md += `\n`;
        }
        md += `## 5. Agent Instructions for Context Retrieval\n\n`;
        md += `- **MCP Query**: Use tool \`kb_explore\` with a symbol name to get full callers, blast radius, and verbatim code in 1 step.\n`;
        md += `- **Refactoring Check**: Use tool \`kb_impact\` before modifying functions to calculate breaking change risk.\n`;
        md += `- **Search**: Use tool \`kb_search\` for fast keyword & symbol lookups.\n`;
        md += `- **Local REST API**: Access \`http://127.0.0.1:7890/v1/explore\` directly from scripts.\n\n`;
        md += `---\n*Generated by OmniKB - 100% Local Real-Time Code Intelligence Engine.*\n`;
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        await fs.promises.writeFile(targetFile, md, 'utf8');
        return targetFile;
    }
    /**
     * Renders the modern interactive HTML Graph Visualizer Dashboard 2.0
     */
    static renderVisualizerHtml(embeddedData) {
        const initialDataStr = embeddedData ? JSON.stringify(embeddedData).replace(/</g, '\\u003c') : 'null';
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OmniKB Visualizer 2.0 — Code Intelligence Graph</title>
  <style>
    :root {
      --bg: #090d16;
      --bg-header: #0f172a;
      --bg-panel: rgba(15, 23, 42, 0.95);
      --border: #334155;
      --border-focus: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --cyan: #38bdf8;
      --emerald: #4ade80;
      --amber: #f59e0b;
      --purple: #a855f7;
      --rose: #f43f5e;
      --gold: #fbbf24;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    header {
      background: var(--bg-header);
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      z-index: 20;
      flex-shrink: 0;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      color: #090d16;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-live {
      background: rgba(74, 222, 128, 0.15);
      color: #4ade80;
      border: 1px solid rgba(74, 222, 128, 0.3);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .badge-live::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }
    .ws-selector-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2px 8px;
    }
    .ws-selector-label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 600;
    }
    select#wsSelect {
      background: transparent;
      color: #38bdf8;
      border: none;
      font-size: 12px;
      font-weight: 600;
      outline: none;
      cursor: pointer;
      padding: 4px 0;
      max-width: 200px;
    }
    select#wsSelect option {
      background: #0f172a;
      color: #f8fafc;
    }
    .stats-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .stat-pill {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.6);
      padding: 4px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .stat-pill strong {
      color: #f8fafc;
      font-weight: 600;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: #1e293b;
      border: 1px solid var(--border);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .btn:hover {
      background: #334155;
      color: #f8fafc;
      border-color: #475569;
    }
    .btn-primary {
      background: #0284c7;
      color: white;
      border-color: #0369a1;
    }
    .btn-primary:hover {
      background: #0ea5e9;
    }

    /* Sub-bar / Filters */
    .controls-bar {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 8px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      z-index: 10;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input {
      background: #1e293b;
      border: 1px solid var(--border);
      color: white;
      padding: 6px 12px 6px 30px;
      border-radius: 6px;
      width: 240px;
      font-size: 12px;
      outline: none;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
      width: 300px;
    }
    .search-icon {
      position: absolute;
      left: 9px;
      color: var(--text-dim);
      font-size: 12px;
      pointer-events: none;
    }
    .filter-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 0;
    }
    .chip {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .chip.active {
      background: rgba(56, 189, 248, 0.2);
      border-color: var(--cyan);
      color: #38bdf8;
    }
    .chip:hover:not(.active) {
      background: #334155;
      color: #f8fafc;
    }
    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    /* Main Container & SVG */
    #container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: radial-gradient(circle at center, #131d33 0%, #090d16 100%);
    }
    svg#graphSvg {
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    svg#graphSvg:active {
      cursor: grabbing;
    }

    /* Node & Edge Styles */
    .edge {
      stroke: #334155;
      stroke-width: 1.2px;
      stroke-opacity: 0.6;
      transition: stroke 0.2s, stroke-opacity 0.2s, stroke-width 0.2s;
    }
    .edge-calls {
      stroke: #4ade80;
      stroke-dasharray: 4 2;
      stroke-opacity: 0.7;
    }
    .edge-imports {
      stroke: #38bdf8;
      stroke-opacity: 0.6;
    }
    .edge-extends, .edge-implements {
      stroke: #f59e0b;
      stroke-opacity: 0.7;
    }
    .edge-references {
      stroke: #a855f7;
      stroke-dasharray: 2 2;
      stroke-opacity: 0.6;
    }
    .edge.highlighted {
      stroke: #f59e0b !important;
      stroke-width: 2.5px !important;
      stroke-opacity: 1 !important;
    }
    .edge.impacted {
      stroke: #f43f5e !important;
      stroke-width: 2.8px !important;
      stroke-opacity: 1 !important;
    }

    .node {
      cursor: pointer;
      transition: transform 0.15s, filter 0.15s, opacity 0.2s;
    }
    .node:hover {
      filter: brightness(1.3) drop-shadow(0 0 8px rgba(56, 189, 248, 0.7));
    }
    .node.selected {
      stroke: #ffffff !important;
      stroke-width: 3px !important;
      filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.9));
    }
    .node.god-node {
      stroke: #fbbf24;
      stroke-width: 2.5px;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8));
    }
    .node.impacted {
      stroke: #f43f5e !important;
      stroke-width: 3px !important;
      fill: #f43f5e !important;
      filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.9)) !important;
    }

    .node-file { fill: #38bdf8; }
    .node-function { fill: #4ade80; }
    .node-method { fill: #10b981; }
    .node-class { fill: #f59e0b; }
    .node-interface { fill: #a855f7; }
    .node-type { fill: #c084fc; }
    .node-route { fill: #f43f5e; }
    .node-doc_section, .node-doc_document, .node-doc { fill: #ec4899; }
    .node-variable { fill: #94a3b8; }

    .node-label {
      font-size: 10px;
      fill: #94a3b8;
      pointer-events: none;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      font-family: inherit;
    }
    .node-label.prominent {
      fill: #f8fafc;
      font-weight: 600;
      font-size: 11px;
    }

    /* Floating Tooltip */
    #tooltip {
      position: absolute;
      display: none;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11px;
      color: #f8fafc;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 100;
      max-width: 280px;
      backdrop-filter: blur(6px);
    }
    #tooltip strong {
      color: #38bdf8;
      font-size: 12px;
    }

    /* Inspector Side Panel */
    .inspector-panel {
      position: absolute;
      top: 16px;
      right: 16px;
      bottom: 16px;
      width: 360px;
      background: var(--bg-panel);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      gap: 14px;
      z-index: 30;
      overflow-y: auto;
      transform: translateX(390px);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .inspector-panel.open {
      transform: translateX(0);
    }
    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      padding-bottom: 10px;
    }
    .panel-title {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
      word-break: break-all;
    }
    .kind-tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
    }
    .close-btn:hover {
      color: #f8fafc;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .meta-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.5);
      padding: 8px;
      border-radius: 6px;
    }
    .meta-label {
      font-size: 10px;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 600;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      margin-top: 2px;
    }
    .conn-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .conn-list {
      list-style: none;
      max-height: 110px;
      overflow-y: auto;
      border: 1px solid rgba(51, 65, 85, 0.5);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.6);
    }
    .conn-item {
      padding: 5px 8px;
      font-size: 11px;
      color: #cbd5e1;
      border-bottom: 1px solid rgba(51, 65, 85, 0.3);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .conn-item:hover {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .impact-box {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .risk-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .risk-CRITICAL { background: rgba(244, 63, 94, 0.2); color: #f43f5e; border: 1px solid #f43f5e; }
    .risk-HIGH { background: rgba(249, 115, 22, 0.2); color: #f97316; border: 1px solid #f97316; }
    .risk-MEDIUM { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid #f59e0b; }
    .risk-LOW { background: rgba(74, 222, 128, 0.2); color: #4ade80; border: 1px solid #4ade80; }

    /* Loading Overlay */
    #loadingOverlay {
      position: absolute;
      inset: 0;
      background: rgba(9, 13, 22, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 50;
      color: #38bdf8;
      font-size: 14px;
      font-weight: 500;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">Ω</div>
      <div class="brand-title">
        OmniKB Dashboard 2.0
        <span class="badge-live" id="liveStatus">Live Engine</span>
      </div>
      <div class="ws-selector-wrap">
        <span class="ws-selector-label">Workspace:</span>
        <select id="wsSelect">
          <option value="">(Loading...)</option>
        </select>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-pill">Nodes: <strong id="statNodes">-</strong></div>
      <div class="stat-pill">Edges: <strong id="statEdges">-</strong></div>
      <div class="stat-pill">Files: <strong id="statFiles">-</strong></div>
      <div class="stat-pill">God Nodes: <strong id="statGodNodes" style="color:#fbbf24;">-</strong></div>
    </div>

    <div class="header-actions">
      <button class="btn" id="btnSync" title="Reconcile and refresh graph">🔄 Force Sync</button>
      <button class="btn" id="btnReset" title="Center and reset zoom">🎯 Reset View</button>
    </div>
  </header>

  <div class="controls-bar">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="searchInput" placeholder="Search functions, classes, routes, files..." />
    </div>

    <div class="filter-chips" id="filterChips">
      <div class="chip active" data-filter="all">All</div>
      <div class="chip" data-filter="function"><span class="chip-dot" style="background:#4ade80;"></span>Function</div>
      <div class="chip" data-filter="method"><span class="chip-dot" style="background:#10b981;"></span>Method</div>
      <div class="chip" data-filter="class"><span class="chip-dot" style="background:#f59e0b;"></span>Class</div>
      <div class="chip" data-filter="interface"><span class="chip-dot" style="background:#a855f7;"></span>Interface</div>
      <div class="chip" data-filter="route"><span class="chip-dot" style="background:#f43f5e;"></span>Route</div>
      <div class="chip" data-filter="file"><span class="chip-dot" style="background:#38bdf8;"></span>File</div>
      <div class="chip" data-filter="god"><span class="chip-dot" style="background:#fbbf24;"></span>⭐ God Nodes</div>
    </div>
  </div>

  <div id="container">
    <div id="loadingOverlay">
      <div class="spinner"></div>
      <div id="loadingText">Loading Code Knowledge Graph...</div>
    </div>
    <div id="tooltip"></div>

    <div class="inspector-panel" id="inspectorPanel">
      <div class="panel-header">
        <div>
          <div class="panel-title" id="panelNodeName">Symbol Name</div>
          <span class="kind-tag" id="panelNodeKind" style="background:#0284c7; color:white;">function</span>
        </div>
        <button class="close-btn" id="panelCloseBtn">&times;</button>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Total Connections</div>
          <div class="meta-val" id="panelDegree">0</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">PageRank Centrality</div>
          <div class="meta-val" id="panelPageRank">-</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Inbound Callers</div>
          <div class="meta-val" id="panelInDegree">0</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Outbound Calls</div>
          <div class="meta-val" id="panelOutDegree">0</div>
        </div>
      </div>

      <div>
        <div class="meta-label">File & Location</div>
        <div style="font-size:12px; color:#cbd5e1; word-break:break-all; margin-top:2px;" id="panelFilePath">-</div>
      </div>

      <div class="conn-section">
        <div class="section-title">Inbound Callers (<span id="panelCallersCount">0</span>)</div>
        <ul class="conn-list" id="panelCallersList"></ul>
      </div>

      <div class="conn-section">
        <div class="section-title">Outbound Calls (<span id="panelCalleesCount">0</span>)</div>
        <ul class="conn-list" id="panelCalleesList"></ul>
      </div>

      <div class="impact-box">
        <div class="section-title" style="color:#f43f5e;">💥 Change Impact & Blast Radius</div>
        <button class="btn btn-primary" id="btnCalcImpact" style="width:100%; justify-content:center;">Calculate Blast Radius</button>
        <div id="impactResult" style="display:none; flex-direction:column; gap:6px; font-size:11px; margin-top:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--text-muted);">Risk Level:</span>
            <span class="risk-badge" id="impactRiskBadge">LOW</span>
          </div>
          <div id="impactSummary" style="color:#cbd5e1; line-height:1.4;"></div>
        </div>
      </div>
    </div>

    <svg id="graphSvg"></svg>
  </div>

  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script>
    window.__EMBEDDED_DATA__ = ${initialDataStr};

    (function() {
      let currentData = null;
      let simulation = null;
      let svg, g, linkElements, nodeElements, labelElements;
      let zoomBehavior;
      let activeFilter = 'all';
      let selectedNode = null;
      let godNodesMap = new Map();

      const urlParams = new URLSearchParams(window.location.search);
      let currentWorkspace = urlParams.get('workspace') || '';

      // Initialize
      window.addEventListener('DOMContentLoaded', async () => {
        setupUIEvents();
        await loadWorkspacesList();
        await loadGraphData();
      });

      async function loadWorkspacesList() {
        try {
          const res = await fetch('/v1/workspaces');
          if (res.ok) {
            const data = await res.json();
            const select = document.getElementById('wsSelect');
            select.innerHTML = '';
            (data.workspaces || []).forEach(ws => {
              const opt = document.createElement('option');
              opt.value = ws.id;
              opt.textContent = ws.name || ws.rootPath;
              if (data.activeWorkspace && data.activeWorkspace.id === ws.id) {
                opt.selected = true;
                if (!currentWorkspace) currentWorkspace = ws.id;
              }
              select.appendChild(opt);
            });
          }
        } catch (e) {
          console.warn('Could not fetch /v1/workspaces:', e);
        }
      }

      async function loadGraphData() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'flex';
        document.getElementById('loadingText').textContent = 'Loading Knowledge Graph...';

        try {
          let data = null;
          // Try fetching from REST API
          try {
            const queryUrl = '/v1/graph/data' + (currentWorkspace ? '?workspace=' + encodeURIComponent(currentWorkspace) : '');
            const res = await fetch(queryUrl);
            if (res.ok) {
              data = await res.json();
            }
          } catch (fetchErr) {
            console.warn('REST API fetch failed, falling back to embedded data:', fetchErr);
          }

          if (!data && window.__EMBEDDED_DATA__) {
            data = window.__EMBEDDED_DATA__;
            document.getElementById('liveStatus').textContent = 'Embedded Mode';
            document.getElementById('liveStatus').style.color = '#38bdf8';
          }

          if (!data) {
            throw new Error('No graph data available from API or embedded cache.');
          }

          currentData = data;
          renderGraph(data);
        } catch (err) {
          console.error('Error loading graph:', err);
          document.getElementById('loadingText').innerHTML = '<span style="color:#f43f5e;">Failed to load graph data: ' + err.message + '</span>';
        } finally {
          setTimeout(() => { overlay.style.display = 'none'; }, 300);
        }
      }

      function renderGraph(data) {
        // Update stats
        const stats = data.stats || {};
        document.getElementById('statNodes').textContent = stats.totalNodes || data.nodes.length;
        document.getElementById('statEdges').textContent = stats.totalEdges || data.edges.length;
        document.getElementById('statFiles').textContent = stats.totalFiles || '-';
        document.getElementById('statGodNodes').textContent = (data.godNodes || []).length;

        godNodesMap.clear();
        (data.godNodes || []).forEach(gn => godNodesMap.set(gn.id, gn));

        // Setup SVG
        svg = d3.select("#graphSvg");
        svg.selectAll("*").remove();

        const width = window.innerWidth;
        const height = window.innerHeight - 90;

        // Arrow markers
        const defs = svg.append("defs");
        defs.append("marker")
          .attr("id", "arrow-calls")
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 18)
          .attr("refY", 0)
          .attr("markerWidth", 5)
          .attr("markerHeight", 5)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", "#4ade80");

        defs.append("marker")
          .attr("id", "arrow-imports")
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 18)
          .attr("refY", 0)
          .attr("markerWidth", 5)
          .attr("markerHeight", 5)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", "#38bdf8");

        g = svg.append("g");

        zoomBehavior = d3.zoom()
          .scaleExtent([0.05, 5])
          .on("zoom", (e) => g.attr("transform", e.transform));

        svg.call(zoomBehavior);

        const validNodeIds = new Set(data.nodes.map(n => n.id));
        const validEdges = data.edges.filter(e => {
          const s = typeof e.source === 'object' ? e.source.id : e.sourceId || e.source;
          const t = typeof e.target === 'object' ? e.target.id : e.targetId || e.target;
          return validNodeIds.has(s) && validNodeIds.has(t);
        }).map(e => ({
          ...e,
          source: typeof e.source === 'object' ? e.source.id : e.sourceId || e.source,
          target: typeof e.target === 'object' ? e.target.id : e.targetId || e.target,
          kind: e.kind || 'calls',
        }));

        simulation = d3.forceSimulation(data.nodes)
          .force("link", d3.forceLink(validEdges).id(d => d.id).distance(d => d.kind === 'contains' ? 35 : 75))
          .force("charge", d3.forceManyBody().strength(d => godNodesMap.has(d.id) ? -280 : -140))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(d => getNodeRadius(d) + 8));

        linkElements = g.append("g")
          .selectAll("line")
          .data(validEdges)
          .enter().append("line")
          .attr("class", d => "edge edge-" + (d.kind || 'calls'))
          .attr("marker-end", d => d.kind === 'calls' ? 'url(#arrow-calls)' : (d.kind === 'imports' ? 'url(#arrow-imports)' : null));

        nodeElements = g.append("g")
          .selectAll("circle")
          .data(data.nodes)
          .enter().append("circle")
          .attr("r", d => getNodeRadius(d))
          .attr("class", d => {
            let cls = "node node-" + (d.kind || 'function');
            if (godNodesMap.has(d.id)) cls += " god-node";
            return cls;
          })
          .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
          .on("click", (e, d) => selectNode(d))
          .on("mouseenter", (e, d) => showTooltip(e, d))
          .on("mousemove", (e, d) => moveTooltip(e))
          .on("mouseleave", () => hideTooltip());

        labelElements = g.append("g")
          .selectAll("text")
          .data(data.nodes.slice(0, 200))
          .enter().append("text")
          .text(d => d.name)
          .attr("class", d => "node-label" + (godNodesMap.has(d.id) || d.kind === 'file' ? ' prominent' : ''))
          .attr("dx", d => getNodeRadius(d) + 4)
          .attr("dy", 3);

        simulation.on("tick", () => {
          linkElements
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

          nodeElements
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

          labelElements
            .attr("x", d => d.x)
            .attr("y", d => d.y);
        });
      }

      function getNodeRadius(d) {
        if (godNodesMap.has(d.id)) {
          const gn = godNodesMap.get(d.id);
          return Math.min(18, 9 + (gn.degree || 0) * 0.5);
        }
        switch (d.kind) {
          case 'file': return 10;
          case 'class': return 9;
          case 'interface': return 8;
          case 'route': return 9;
          case 'function': return 7;
          case 'method': return 6;
          default: return 5;
        }
      }

      function selectNode(d) {
        selectedNode = d;
        nodeElements.classed("selected", n => n.id === d.id);

        // Find 1-hop callers and callees
        const callers = [];
        const callees = [];
        const connectedNodeIds = new Set([d.id]);

        linkElements.each(function(e) {
          const sId = typeof e.source === 'object' ? e.source.id : e.source;
          const tId = typeof e.target === 'object' ? e.target.id : e.target;
          if (tId === d.id) {
            connectedNodeIds.add(sId);
            const sourceNode = currentData.nodes.find(n => n.id === sId);
            if (sourceNode) callers.push(sourceNode);
          }
          if (sId === d.id) {
            connectedNodeIds.add(tId);
            const targetNode = currentData.nodes.find(n => n.id === tId);
            if (targetNode) callees.push(targetNode);
          }
        });

        // Highlight connected links
        linkElements.classed("highlighted", e => {
          const sId = typeof e.source === 'object' ? e.source.id : e.source;
          const tId = typeof e.target === 'object' ? e.target.id : e.target;
          return sId === d.id || tId === d.id;
        });

        // Dim unconnected nodes
        nodeElements.attr("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.2);
        labelElements.attr("opacity", n => connectedNodeIds.has(n.id) ? 1 : 0.1);

        // Update Panel
        const panel = document.getElementById("inspectorPanel");
        document.getElementById("panelNodeName").textContent = d.name;
        const kindTag = document.getElementById("panelNodeKind");
        kindTag.textContent = d.kind || 'symbol';
        kindTag.style.background = getNodeColor(d.kind);

        const godInfo = godNodesMap.get(d.id);
        const degree = godInfo ? godInfo.degree : (callers.length + callees.length);
        document.getElementById("panelDegree").textContent = degree;
        document.getElementById("panelInDegree").textContent = godInfo ? godInfo.inDegree : callers.length;
        document.getElementById("panelOutDegree").textContent = godInfo ? godInfo.outDegree : callees.length;
        document.getElementById("panelPageRank").textContent = godInfo && godInfo.pageRank ? godInfo.pageRank.toFixed(4) : '-';

        document.getElementById("panelFilePath").textContent = (d.filePath || d.file || '') + (d.startLine || d.line ? ':' + (d.startLine || d.line) : '');

        // Callers list
        document.getElementById("panelCallersCount").textContent = callers.length;
        const callersList = document.getElementById("panelCallersList");
        callersList.innerHTML = callers.length === 0 ? '<li class="conn-item" style="color:var(--text-dim);">No direct inbound callers</li>' : '';
        callers.slice(0, 15).forEach(c => {
          const li = document.createElement("li");
          li.className = "conn-item";
          li.innerHTML = '<span>' + c.name + '</span><span style="color:var(--text-dim);">' + c.kind + '</span>';
          li.onclick = () => selectNode(c);
          callersList.appendChild(li);
        });

        // Callees list
        document.getElementById("panelCalleesCount").textContent = callees.length;
        const calleesList = document.getElementById("panelCalleesList");
        calleesList.innerHTML = callees.length === 0 ? '<li class="conn-item" style="color:var(--text-dim);">No outbound calls</li>' : '';
        callees.slice(0, 15).forEach(c => {
          const li = document.createElement("li");
          li.className = "conn-item";
          li.innerHTML = '<span>' + c.name + '</span><span style="color:var(--text-dim);">' + c.kind + '</span>';
          li.onclick = () => selectNode(c);
          calleesList.appendChild(li);
        });

        // Reset impact section
        document.getElementById("impactResult").style.display = "none";
        panel.classList.add("open");
      }

      function getNodeColor(kind) {
        switch(kind) {
          case 'function': return '#4ade80';
          case 'method': return '#10b981';
          case 'class': return '#f59e0b';
          case 'interface': return '#a855f7';
          case 'type': return '#c084fc';
          case 'route': return '#f43f5e';
          case 'file': return '#38bdf8';
          case 'doc_section':
          case 'doc_document': return '#ec4899';
          default: return '#94a3b8';
        }
      }

      function showTooltip(event, d) {
        const tooltip = document.getElementById("tooltip");
        const godInfo = godNodesMap.get(d.id);
        let html = '<strong>' + d.name + '</strong> (' + (d.kind || 'symbol') + ')';
        if (godInfo) html += ' <span style="color:#fbbf24; font-weight:bold;">★ God Node</span>';
        html += '<br><span style="color:#94a3b8;">' + (d.filePath || d.file || '') + '</span>';
        if (godInfo) html += '<br>Degree: ' + godInfo.degree + ' | PageRank: ' + (godInfo.pageRank || '-');
        tooltip.innerHTML = html;
        tooltip.style.display = "block";
        moveTooltip(event);
      }

      function moveTooltip(event) {
        const tooltip = document.getElementById("tooltip");
        tooltip.style.left = (event.clientX + 14) + "px";
        tooltip.style.top = (event.clientY + 14) + "px";
      }

      function hideTooltip() {
        document.getElementById("tooltip").style.display = "none";
      }

      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      function setupUIEvents() {
        // Workspace selector
        document.getElementById("wsSelect").addEventListener("change", (e) => {
          currentWorkspace = e.target.value;
          const url = new URL(window.location.href);
          url.searchParams.set("workspace", currentWorkspace);
          window.history.pushState({}, "", url.toString());
          loadGraphData();
        });

        // Search input
        document.getElementById("searchInput").addEventListener("input", (e) => {
          const val = e.target.value.toLowerCase().trim();
          if (!val) {
            applyFilter();
            return;
          }
          nodeElements.attr("opacity", d => {
            const matches = d.name.toLowerCase().includes(val) || (d.filePath || d.file || '').toLowerCase().includes(val);
            return matches ? 1 : 0.15;
          });
          labelElements.attr("opacity", d => {
            const matches = d.name.toLowerCase().includes(val) || (d.filePath || d.file || '').toLowerCase().includes(val);
            return matches ? 1 : 0.1;
          });
        });

        // Filter chips
        document.getElementById("filterChips").addEventListener("click", (e) => {
          const chip = e.target.closest(".chip");
          if (!chip) return;
          document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          activeFilter = chip.getAttribute("data-filter");
          applyFilter();
        });

        // Reset button
        document.getElementById("btnReset").addEventListener("click", () => {
          if (svg && zoomBehavior) {
            svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
          }
          if (simulation) {
            simulation.alpha(0.8).restart();
          }
          nodeElements.attr("opacity", 1).classed("selected", false).classed("impacted", false);
          labelElements.attr("opacity", 1);
          linkElements.classed("highlighted", false).classed("impacted", false);
          document.getElementById("inspectorPanel").classList.remove("open");
        });

        // Sync button
        document.getElementById("btnSync").addEventListener("click", async () => {
          const btn = document.getElementById("btnSync");
          btn.textContent = "⏳ Syncing...";
          btn.disabled = true;
          try {
            const queryUrl = '/v1/sync' + (currentWorkspace ? '?workspace=' + encodeURIComponent(currentWorkspace) : '');
            await fetch(queryUrl, { method: 'POST' });
            await loadGraphData();
          } catch (e) {
            console.error('Sync failed:', e);
          } finally {
            btn.textContent = "🔄 Force Sync";
            btn.disabled = false;
          }
        });

        // Panel Close
        document.getElementById("panelCloseBtn").addEventListener("click", () => {
          document.getElementById("inspectorPanel").classList.remove("open");
          nodeElements.attr("opacity", 1).classed("selected", false);
          labelElements.attr("opacity", 1);
          linkElements.classed("highlighted", false);
        });

        // Blast radius calculate
        document.getElementById("btnCalcImpact").addEventListener("click", async () => {
          if (!selectedNode) return;
          const btn = document.getElementById("btnCalcImpact");
          btn.textContent = "⏳ Analyzing...";
          btn.disabled = true;

          try {
            const queryUrl = '/v1/graph/impact?target=' + encodeURIComponent(selectedNode.name) + (currentWorkspace ? '&workspace=' + encodeURIComponent(currentWorkspace) : '');
            const res = await fetch(queryUrl);
            if (!res.ok) throw new Error('Impact calculation failed');
            const data = await res.json();

            const riskBadge = document.getElementById("impactRiskBadge");
            riskBadge.textContent = data.riskScore || 'LOW';
            riskBadge.className = "risk-badge risk-" + (data.riskScore || 'LOW');
            document.getElementById("impactSummary").textContent = data.summary || '';
            document.getElementById("impactResult").style.display = "flex";

            // Highlight affected nodes on canvas
            const affectedNodeIds = new Set([
              selectedNode.id,
              ...(data.directCallers || []).map(n => n.id),
              ...(data.transitiveCallers || []).map(n => n.id),
            ]);

            nodeElements.classed("impacted", n => affectedNodeIds.has(n.id));
            linkElements.classed("impacted", e => {
              const sId = typeof e.source === 'object' ? e.source.id : e.source;
              const tId = typeof e.target === 'object' ? e.target.id : e.target;
              return affectedNodeIds.has(sId) && affectedNodeIds.has(tId);
            });
          } catch (err) {
            console.error(err);
            document.getElementById("impactSummary").textContent = "Could not calculate blast radius: " + err.message;
            document.getElementById("impactResult").style.display = "flex";
          } finally {
            btn.textContent = "Calculate Blast Radius";
            btn.disabled = false;
          }
        });
      }

      function applyFilter() {
        if (!nodeElements) return;
        if (activeFilter === 'all') {
          nodeElements.attr("opacity", 1);
          labelElements.attr("opacity", 1);
          return;
        }
        if (activeFilter === 'god') {
          nodeElements.attr("opacity", d => godNodesMap.has(d.id) ? 1 : 0.1);
          labelElements.attr("opacity", d => godNodesMap.has(d.id) ? 1 : 0.1);
          return;
        }
        nodeElements.attr("opacity", d => (d.kind === activeFilter) ? 1 : 0.12);
        labelElements.attr("opacity", d => (d.kind === activeFilter) ? 1 : 0.1);
      }
    })();
  </script>
</body>
</html>`;
    }
    /**
     * Generates interactive standalone HTML Graph visualizer (graph.html)
     */
    async generateHtmlVisualizer(outputPath) {
        const targetFile = outputPath || path.join(this.workspaceRoot, '.omnikb', 'graph.html');
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const stats = this.graph.getStats();
        const nodes = Array.from(this.storage.nodes.values());
        const edges = Array.from(this.storage.edges.values());
        const embeddedData = {
            nodes,
            edges,
            godNodes: stats.godNodes,
            stats: {
                totalNodes: stats.totalNodes,
                totalEdges: stats.totalEdges,
                totalFiles: stats.totalFiles,
                nodesByKind: stats.nodesByKind,
                edgesByKind: stats.edgesByKind,
                languages: stats.languages,
                lastSyncTime: stats.lastSyncTime,
            },
            activeWorkspace: {
                id: path.basename(this.workspaceRoot),
                name: path.basename(this.workspaceRoot),
                rootPath: this.workspaceRoot,
            },
        };
        const htmlContent = KnowledgeReporter.renderVisualizerHtml(embeddedData);
        await fs.promises.writeFile(targetFile, htmlContent, 'utf8');
        return targetFile;
    }
}
exports.KnowledgeReporter = KnowledgeReporter;
