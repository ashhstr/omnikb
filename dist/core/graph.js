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
exports.GraphEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("./parser");
class GraphEngine {
    storage;
    workspaceRoot;
    constructor(workspaceRoot, storage) {
        this.workspaceRoot = workspaceRoot;
        this.storage = storage;
    }
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
    /**
     * Resolves raw symbolic edges (e.g. sym:myFunc) to concrete node IDs
     */
    resolveCrossFileReferences() {
        const symbolMap = new Map(); // Symbol name -> Array of Node IDs
        for (const node of this.storage.nodes.values()) {
            if (node.kind !== 'file' && node.kind !== 'doc_document') {
                const key = node.name.toLowerCase();
                if (!symbolMap.has(key)) {
                    symbolMap.set(key, []);
                }
                symbolMap.get(key).push(node.id);
            }
        }
        for (const edge of this.storage.edges.values()) {
            let isSym = edge.targetId.startsWith('sym:');
            // If targetId is not in storage.nodes and not external, attempt re-resolution
            if (!isSym &&
                !this.storage.nodes.has(edge.targetId) &&
                !edge.targetId.startsWith('pkg:') &&
                !edge.targetId.startsWith('crate:') &&
                !edge.targetId.startsWith('file:')) {
                isSym = true;
            }
            if (isSym) {
                const rawSym = edge.targetId.startsWith('sym:')
                    ? edge.targetId.slice(4)
                    : edge.targetName || edge.targetId.split('#')[1] || edge.targetId;
                const symName = rawSym.toLowerCase();
                const targets = symbolMap.get(symName);
                if (targets && targets.length > 0) {
                    if (targets.length === 1) {
                        edge.targetId = targets[0];
                        edge.confidence = 'exact';
                    }
                    else {
                        const sameFile = targets.find((t) => t.startsWith(edge.filePath));
                        if (sameFile) {
                            edge.targetId = sameFile;
                            edge.confidence = 'exact';
                        }
                        else {
                            edge.targetId = targets[0];
                            edge.confidence = 'heuristic';
                        }
                    }
                }
                else {
                    edge.targetId = `sym:${rawSym}`;
                }
            }
        }
    }
    /**
     * Performs atomic verification of graph data freshness against current disk state
     */
    checkFreshness(filePaths) {
        let isFresh = true;
        let staleReason;
        let diskMtime;
        let combinedHash = '';
        for (const relPath of filePaths) {
            if (!relPath)
                continue;
            const absPath = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath);
            const meta = this.storage.files.get(relPath);
            if (!fs.existsSync(absPath)) {
                if (meta) {
                    isFresh = false;
                    staleReason = 'file_deleted';
                }
                continue;
            }
            try {
                const stats = fs.statSync(absPath);
                diskMtime = Math.max(diskMtime || 0, stats.mtimeMs);
                if (meta) {
                    // If disk modification time is strictly newer than stored lastModified (with 50ms tolerance)
                    if (stats.mtimeMs > meta.lastModified + 50) {
                        const currentContent = fs.readFileSync(absPath, 'utf8');
                        const currentHash = parser_1.CodeParser.computeHash(currentContent);
                        if (currentHash !== meta.hash) {
                            isFresh = false;
                            staleReason = 'file_modified_on_disk';
                        }
                    }
                    combinedHash += meta.hash.slice(0, 8);
                }
            }
            catch {
                isFresh = false;
            }
        }
        return {
            isFresh,
            isStale: !isFresh,
            indexedAt: this.storage.lastUpdated || Date.now(),
            diskLastModified: diskMtime,
            contentHash: combinedHash || 'clean',
            staleReason,
            pendingInQueue: false,
        };
    }
    /**
     * Explores code symbol, flow, and verbatim code in a single call (inspired by CodeGraph)
     */
    explore(query, maxDepth = 3) {
        // 1. Find matching target nodes
        let targetNodes = this.storage.findNodesByName(query);
        // Fallback to full-text search if no exact symbol name found
        if (targetNodes.length === 0) {
            const searchResults = this.storage.search(query, 5);
            targetNodes = searchResults.flatMap((r) => r.nodes);
        }
        if (targetNodes.length === 0) {
            return {
                query,
                targetNodes: [],
                callPaths: [],
                callers: [],
                callees: [],
                impactRadius: { directAffected: [], transitiveAffected: [], affectedFiles: [] },
                verbatimSource: [],
                freshness: this.checkFreshness([]),
            };
        }
        const primaryNode = targetNodes[0];
        const primaryId = primaryNode.id;
        // 2. Find direct callers (incoming edges with 'calls' or 'references')
        const callers = [];
        const callees = [];
        const callPaths = [];
        for (const edge of this.storage.edges.values()) {
            if (edge.targetId === primaryId && (edge.kind === 'calls' || edge.kind === 'references')) {
                const callerNode = this.storage.nodes.get(edge.sourceId);
                if (callerNode && !callers.some((c) => c.id === callerNode.id)) {
                    callers.push(callerNode);
                    callPaths.push({ source: callerNode, target: primaryNode, edge });
                }
            }
            if (edge.sourceId === primaryId && (edge.kind === 'calls' || edge.kind === 'references')) {
                const calleeNode = this.storage.nodes.get(edge.targetId);
                if (calleeNode && !callees.some((c) => c.id === calleeNode.id)) {
                    callees.push(calleeNode);
                    callPaths.push({ source: primaryNode, target: calleeNode, edge });
                }
            }
        }
        // 3. Compute impact radius
        const impact = this.calculateImpact(primaryNode.name || primaryNode.filePath, maxDepth);
        // 4. Extract verbatim code for primary target
        const verbatimSource = this.extractVerbatimSource(primaryNode);
        // 5. Related documentation sections
        const relatedDocs = [];
        for (const edge of this.storage.edges.values()) {
            if (edge.targetId === primaryId && edge.kind === 'documents') {
                const docNode = this.storage.nodes.get(edge.sourceId);
                if (docNode)
                    relatedDocs.push(docNode);
            }
        }
        const touchedFiles = Array.from(new Set([primaryNode.filePath, ...callers.map((c) => c.filePath), ...callees.map((c) => c.filePath)]));
        const freshness = this.checkFreshness(touchedFiles);
        return {
            query,
            targetNodes,
            callPaths,
            callers,
            callees,
            impactRadius: {
                directAffected: impact.directCallers,
                transitiveAffected: impact.transitiveCallers,
                affectedFiles: impact.affectedFiles,
            },
            verbatimSource,
            relatedDocs,
            stalenessWarning: freshness.isStale
                ? `Warning: graph data for ${touchedFiles.join(', ')} may be stale due to: ${freshness.staleReason}`
                : undefined,
            freshness,
        };
    }
    /**
     * Calculates Blast Radius and Change Impact for a symbol or file (inspired by GitNexus)
     */
    calculateImpact(target, maxDepth = 5) {
        const targetNodes = this.storage.findNodesByName(target);
        const targetNode = targetNodes[0];
        const targetId = targetNode ? targetNode.id : target;
        const directCallers = [];
        const transitiveCallers = [];
        const visitedNodeIds = new Set([targetId]);
        const affectedFilesSet = new Set();
        const affectedRoutes = [];
        if (targetNode) {
            affectedFilesSet.add(targetNode.filePath);
        }
        // BFS queue for upstream dependency traversal
        let currentLevel = [targetId];
        let depth = 0;
        while (currentLevel.length > 0 && depth < maxDepth) {
            const nextLevel = [];
            depth++;
            for (const currentId of currentLevel) {
                for (const edge of this.storage.edges.values()) {
                    if (edge.targetId === currentId && (edge.kind === 'calls' || edge.kind === 'imports' || edge.kind === 'references')) {
                        const upstreamNode = this.storage.nodes.get(edge.sourceId);
                        if (upstreamNode && !visitedNodeIds.has(upstreamNode.id)) {
                            visitedNodeIds.add(upstreamNode.id);
                            nextLevel.push(upstreamNode.id);
                            affectedFilesSet.add(upstreamNode.filePath);
                            if (depth === 1) {
                                directCallers.push(upstreamNode);
                            }
                            else {
                                transitiveCallers.push(upstreamNode);
                            }
                            if (upstreamNode.kind === 'route') {
                                affectedRoutes.push(upstreamNode);
                            }
                        }
                    }
                }
            }
            currentLevel = nextLevel;
        }
        // Determine risk score
        const totalAffected = directCallers.length + transitiveCallers.length;
        let riskScore = 'LOW';
        if (affectedRoutes.length > 0 || totalAffected > 15 || affectedFilesSet.size > 5) {
            riskScore = 'CRITICAL';
        }
        else if (totalAffected > 6 || affectedFilesSet.size > 2) {
            riskScore = 'HIGH';
        }
        else if (totalAffected > 1) {
            riskScore = 'MEDIUM';
        }
        const summary = `Changing '${target}' impacts ${directCallers.length} direct caller(s), ${transitiveCallers.length} transitive caller(s) across ${affectedFilesSet.size} file(s), and ${affectedRoutes.length} HTTP route(s). Risk Level: ${riskScore}.`;
        const freshness = this.checkFreshness(Array.from(affectedFilesSet));
        return {
            target,
            targetNode,
            directCallers,
            transitiveCallers,
            affectedFiles: Array.from(affectedFilesSet),
            affectedRoutes,
            riskScore,
            summary,
            freshness,
        };
    }
    /**
     * God Node & Architecture Bottleneck Detection (inspired by Graphify)
     */
    getStats() {
        const nodesByKind = {
            file: 0,
            function: 0,
            method: 0,
            class: 0,
            interface: 0,
            type: 0,
            variable: 0,
            route: 0,
            doc_section: 0,
            doc_document: 0,
        };
        const edgesByKind = {
            contains: 0,
            imports: 0,
            exports: 0,
            calls: 0,
            extends: 0,
            implements: 0,
            references: 0,
            documents: 0,
        };
        const languages = {};
        const inDegreeMap = new Map();
        const outDegreeMap = new Map();
        for (const node of this.storage.nodes.values()) {
            nodesByKind[node.kind] = (nodesByKind[node.kind] || 0) + 1;
            inDegreeMap.set(node.id, 0);
            outDegreeMap.set(node.id, 0);
        }
        for (const file of this.storage.files.values()) {
            languages[file.language] = (languages[file.language] || 0) + 1;
        }
        for (const edge of this.storage.edges.values()) {
            edgesByKind[edge.kind] = (edgesByKind[edge.kind] || 0) + 1;
            outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);
            inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
        }
        // Calculate PageRank Centrality
        const pageRankMap = this.calculatePageRank();
        // Calculate top God Nodes (Highest connectivity / high PageRank centrality)
        const godNodes = Array.from(this.storage.nodes.values())
            .filter((n) => n.kind !== 'file' && n.kind !== 'doc_section')
            .map((node) => {
            const inDeg = inDegreeMap.get(node.id) || 0;
            const outDeg = outDegreeMap.get(node.id) || 0;
            const pr = pageRankMap.get(node.id) || 0;
            return {
                id: node.id,
                name: node.name,
                filePath: node.filePath,
                degree: inDeg + outDeg,
                inDegree: inDeg,
                outDegree: outDeg,
                pageRank: Math.round(pr * 10000) / 10000,
            };
        })
            .sort((a, b) => (b.pageRank || 0) - (a.pageRank || 0) || b.degree - a.degree)
            .slice(0, 10);
        return {
            totalFiles: this.storage.files.size,
            totalNodes: this.storage.nodes.size,
            totalEdges: this.storage.edges.size,
            nodesByKind,
            edgesByKind,
            languages,
            godNodes,
            lastSyncTime: Date.now(),
        };
    }
    /**
     * Calculates iterative PageRank centrality across all graph nodes
     */
    calculatePageRank(dampingFactor = 0.85, maxIterations = 20) {
        const nodeIds = Array.from(this.storage.nodes.keys());
        const N = nodeIds.length;
        const rankMap = new Map();
        if (N === 0)
            return rankMap;
        const initialRank = 1 / N;
        for (const id of nodeIds) {
            rankMap.set(id, initialRank);
        }
        // Outgoing edges per node & Incoming edges per node
        const outgoing = new Map();
        const incoming = new Map();
        for (const id of nodeIds) {
            outgoing.set(id, []);
            incoming.set(id, []);
        }
        for (const edge of this.storage.edges.values()) {
            if (outgoing.has(edge.sourceId) && incoming.has(edge.targetId)) {
                outgoing.get(edge.sourceId).push(edge.targetId);
                incoming.get(edge.targetId).push(edge.sourceId);
            }
        }
        for (let iter = 0; iter < maxIterations; iter++) {
            const nextRanks = new Map();
            let danglingSum = 0;
            for (const id of nodeIds) {
                const outList = outgoing.get(id);
                if (outList.length === 0) {
                    danglingSum += rankMap.get(id);
                }
            }
            for (const id of nodeIds) {
                const inList = incoming.get(id);
                let sumIn = 0;
                for (const inId of inList) {
                    const outDegree = outgoing.get(inId).length;
                    if (outDegree > 0) {
                        sumIn += rankMap.get(inId) / outDegree;
                    }
                }
                const newRank = (1 - dampingFactor) / N + dampingFactor * (sumIn + danglingSum / N);
                nextRanks.set(id, newRank);
            }
            for (const [id, r] of nextRanks.entries()) {
                rankMap.set(id, r);
            }
        }
        return rankMap;
    }
    extractVerbatimSource(node) {
        try {
            const absPath = path.isAbsolute(node.filePath)
                ? node.filePath
                : path.join(this.workspaceRoot, node.filePath);
            if (!fs.existsSync(absPath))
                return [];
            const rawContent = fs.readFileSync(absPath, 'utf8');
            const lines = rawContent.split('\n');
            const start = Math.max(1, node.startLine - 2);
            const end = Math.min(lines.length, node.endLine + 2);
            const snippetLines = [];
            for (let i = start; i <= end; i++) {
                snippetLines.push({ lineNumber: i, content: lines[i - 1] || '' });
            }
            return [
                {
                    filePath: node.filePath,
                    startLine: start,
                    endLine: end,
                    lines: snippetLines,
                },
            ];
        }
        catch {
            return [];
        }
    }
}
exports.GraphEngine = GraphEngine;
