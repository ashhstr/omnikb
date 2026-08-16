import * as fs from 'fs';
import * as path from 'path';
import { WatcherConfig, FileMetadata, GraphStats } from '../types';
import { CodeParser } from './parser';
import { KnowledgeStorage } from './storage';
import { GraphEngine } from './graph';
import { KnowledgeReporter } from './reporter';
import { IKnowledgeStorage } from './storage-types';

export class WorkspaceWatcher {
  private config: WatcherConfig;
  private parser: CodeParser;
  private storage: IKnowledgeStorage;
  private graph: GraphEngine;
  private reporter: KnowledgeReporter;

  private isRunning: boolean = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingFiles: Set<string> = new Set();
  private fsWatchers: fs.FSWatcher[] = [];

  constructor(
    config: WatcherConfig,
    parser: CodeParser,
    storage: KnowledgeStorage,
    graph: GraphEngine,
    reporter: KnowledgeReporter
  ) {
    this.config = {
      debounceMs: 500,
      autoGenerateReport: true,
      autoGenerateVisual: true,
      ignorePatterns: [
        'node_modules',
        '.git',
        '.omnikb',
        'dist',
        'build',
        'out',
        '.next',
        'coverage',
        '.cache',
        '*.tmp',
        '*.log',
        'KNOWLEDGE_BASE.md',
      ],
      ...config,
    };
    this.parser = parser;
    this.storage = storage;
    this.graph = graph;
    this.reporter = reporter;
  }

  /**
   * Scans and indexes the entire workspace for the initial baseline
   */
  public async initialScan(): Promise<GraphStats> {
    console.log(`[OmniKB] Starting initial workspace scan at: ${this.config.rootPath}`);
    const startTime = Date.now();

    const allFiles = this.collectFiles(this.config.rootPath);
    console.log(`[OmniKB] Found ${allFiles.length} candidate files to index.`);

    let indexedCount = 0;
    for (const fullPath of allFiles) {
      const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const parseRes = this.parser.parseFile(relPath, content);
        const stats = fs.statSync(fullPath);

        const meta: FileMetadata = {
          path: relPath,
          hash: parseRes.contentHash,
          size: stats.size,
          lastModified: stats.mtimeMs,
          language: parseRes.language,
          nodeCount: parseRes.nodes.length,
          edgeCount: parseRes.edges.length,
        };

        this.storage.updateFileGraph(relPath, meta, parseRes.nodes, parseRes.edges);
        indexedCount++;
      } catch (err: any) {
        console.error(`[OmniKB] Failed to index ${relPath}: ${err?.message || err}`);
      }
    }

    // Resolve cross-file references
    this.graph.resolveCrossFileReferences();

    // Save to disk
    await this.storage.saveToDisk();

    // Generate initial reports
    if (this.config.autoGenerateReport) {
      await this.reporter.generateMarkdownReport();
    }
    if (this.config.autoGenerateVisual) {
      await this.reporter.generateHtmlVisualizer();
    }

    const elapsed = Date.now() - startTime;
    const finalStats = this.graph.getStats();
    console.log(
      `[OmniKB] Initial indexing completed in ${elapsed}ms: ${finalStats.totalNodes} nodes, ${finalStats.totalEdges} edges.`
    );

    if (this.config.onSyncComplete) {
      this.config.onSyncComplete(finalStats);
    }

    return finalStats;
  }

  /**
   * Starts real-time file watcher with debounced auto-sync
   */
  public startWatching(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Use recursive watch if supported by platform (Windows & macOS)
      const watcher = fs.watch(
        this.config.rootPath,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;
          const normFile = filename.replace(/\\/g, '/');
          if (this.shouldIgnore(normFile)) return;

          this.onFileChanged(normFile);
        }
      );

      this.fsWatchers.push(watcher);
      console.log(`[OmniKB Watcher] Active and monitoring for changes (debounce: ${this.config.debounceMs}ms)...`);
    } catch (err: any) {
      console.warn(`[OmniKB Watcher] Native recursive watch warning: ${err?.message}. Falling back to directory walk.`);
      this.watchDirectoriesRecursively(this.config.rootPath);
    }
  }

  /**
   * Stops the active file watchers
   */
  public stopWatching(): void {
    this.isRunning = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const watcher of this.fsWatchers) {
      try {
        watcher.close();
      } catch {}
    }
    this.fsWatchers = [];
    console.log(`[OmniKB Watcher] Stopped.`);
  }

  public getPendingQueue(): string[] {
    return Array.from(this.pendingFiles);
  }

  private onFileChanged(relativeFilePath: string): void {
    this.pendingFiles.add(relativeFilePath);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingChanges();
    }, this.config.debounceMs || 500);
  }

  /**
   * Incremental sync of only the changed files
   */
  private async processPendingChanges(): Promise<void> {
    const filesToProcess = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    if (filesToProcess.length === 0) return;

    const start = Date.now();
    let updatedCount = 0;
    let deletedCount = 0;

    for (const relPath of filesToProcess) {
      const fullPath = path.join(this.config.rootPath, relPath);

      if (!fs.existsSync(fullPath)) {
        // File was deleted
        this.storage.removeFileFromGraph(relPath);
        deletedCount++;
        continue;
      }

      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        const hash = CodeParser.computeHash(content);

        // Check if content hash actually changed
        const existing = this.storage.files.get(relPath);
        if (existing && existing.hash === hash) {
          continue; // Content identical, skip re-parsing
        }

        const parseRes = this.parser.parseFile(relPath, content);
        const meta: FileMetadata = {
          path: relPath,
          hash,
          size: stats.size,
          lastModified: stats.mtimeMs,
          language: parseRes.language,
          nodeCount: parseRes.nodes.length,
          edgeCount: parseRes.edges.length,
        };

        this.storage.updateFileGraph(relPath, meta, parseRes.nodes, parseRes.edges);
        updatedCount++;
      } catch (err: any) {
        console.error(`[OmniKB Watcher] Failed to re-parse ${relPath}: ${err?.message || err}`);
      }
    }

    if (updatedCount > 0 || deletedCount > 0) {
      // Re-resolve cross-file references
      this.graph.resolveCrossFileReferences();

      // Persist to disk
      await this.storage.saveToDisk();

      // Refresh Markdown report and Visualizer
      if (this.config.autoGenerateReport) {
        await this.reporter.generateMarkdownReport();
      }
      if (this.config.autoGenerateVisual) {
        await this.reporter.generateHtmlVisualizer();
      }

      const elapsed = Date.now() - start;
      const stats = this.graph.getStats();
      console.log(
        `[OmniKB Auto-Sync] Updated ${updatedCount} file(s), removed ${deletedCount} in ${elapsed}ms. (Total nodes: ${stats.totalNodes})`
      );

      if (this.config.onSyncComplete) {
        this.config.onSyncComplete(stats);
      }
    }
  }

  private collectFiles(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');

      if (this.shouldIgnore(relPath)) continue;

      if (entry.isDirectory()) {
        results.push(...this.collectFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (
          [
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
            '.py', '.go', '.rs', '.java', '.cs', '.cpp', '.c', '.h', '.hpp',
            '.md', '.mdx', '.json', '.yaml', '.yml', '.sql'
          ].includes(ext)
        ) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  private watchDirectoriesRecursively(dir: string): void {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(dir, filename);
        const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
        if (!this.shouldIgnore(relPath)) {
          this.onFileChanged(relPath);
        }
      });
      this.fsWatchers.push(watcher);

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(this.config.rootPath, fullPath).replace(/\\/g, '/');
          if (!this.shouldIgnore(relPath)) {
            this.watchDirectoriesRecursively(fullPath);
          }
        }
      }
    } catch {}
  }

  private shouldIgnore(relPath: string): boolean {
    const parts = relPath.split('/');
    const ignoreList = this.config.ignorePatterns || [];

    for (const part of parts) {
      if (ignoreList.includes(part)) return true;
      if (part.startsWith('.') && part !== '.' && part !== '..') {
        if (part === '.omnikb' || part === '.git') return true;
      }
    }
    return false;
  }
}
