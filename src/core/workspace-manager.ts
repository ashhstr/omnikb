import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceEntry } from '../types';
import { WorkspaceRegistry } from './workspace-registry';
import { CodeParser } from './parser';
import { KnowledgeStorage } from './storage';
import { GraphEngine } from './graph';
import { KnowledgeReporter } from './reporter';
import { WorkspaceWatcher } from './watcher';

export interface WorkspaceInstance {
  entry: WorkspaceEntry;
  storage: KnowledgeStorage;
  graph: GraphEngine;
  watcher: WorkspaceWatcher;
  reporter: KnowledgeReporter;
  loadedAt: number;
  lastUsedAt: number;
}

export class WorkspaceManager {
  private registry: WorkspaceRegistry;
  private instances: Map<string, WorkspaceInstance> = new Map();
  private maxLoadedWorkspaces: number;
  private parser: CodeParser;
  private discoveryWatcher: GlobalDiscoveryWatcher;

  constructor(registry?: WorkspaceRegistry, maxLoadedWorkspaces: number = 5) {
    this.registry = registry || new WorkspaceRegistry();
    this.maxLoadedWorkspaces = Math.max(1, maxLoadedWorkspaces);
    this.parser = new CodeParser();
    
    this.discoveryWatcher = new GlobalDiscoveryWatcher(this);
    this.discoveryWatcher.start();
  }

  public getRegistry(): WorkspaceRegistry {
    return this.registry;
  }

  public getLoadedInstances(): WorkspaceInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Resolves a workspace instance by identifier or falls back to active/cwd
   */
  public async resolveInstance(workspaceIdOrPath?: string): Promise<WorkspaceInstance> {
    if (workspaceIdOrPath && workspaceIdOrPath.trim()) {
      const trimmed = workspaceIdOrPath.trim();
      const existing = this.registry.find(trimmed);
      if (existing) {
        return this.getOrLoad(existing.id);
      }

      const resolved = path.resolve(trimmed);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Workspace not found: '${workspaceIdOrPath}'`);
      }

      // Check if workspaceIdOrPath is a path or file on disk and auto-detect project root
      const detectedRoot = WorkspaceRegistry.detectProjectRoot(resolved);
      if (detectedRoot && fs.existsSync(detectedRoot)) {
        const stats = fs.statSync(detectedRoot);
        if (stats.isDirectory()) {
          return this.registerAndLoad(detectedRoot, undefined, true);
        }
      }

      throw new Error(`Workspace not found: '${workspaceIdOrPath}'`);
    }

    // No param: return active workspace
    const active = this.registry.getActive();
    if (active) {
      return this.getOrLoad(active.id);
    }

    // If registry is completely empty, auto-register process.cwd()
    const cwd = process.cwd();
    return this.registerAndLoad(cwd);
  }

  /**
   * Loads an existing registered workspace into memory (with LRU eviction if full)
   */
  public async getOrLoad(idOrPathOrName: string, autoScan: boolean = false): Promise<WorkspaceInstance> {
    let entry = this.registry.find(idOrPathOrName);
    if (!entry) {
      // Check if it's a directory on disk that can be auto-registered
      if (fs.existsSync(idOrPathOrName)) {
        return this.registerAndLoad(idOrPathOrName, undefined, true);
      }
      throw new Error(`Workspace '${idOrPathOrName}' is not registered in OmniKB.`);
    }

    // If already loaded in memory
    const existingInstance = this.instances.get(entry.id);
    if (existingInstance) {
      existingInstance.lastUsedAt = Date.now();
      return existingInstance;
    }

    // Evict least recently used instance if capacity reached
    if (this.instances.size >= this.maxLoadedWorkspaces) {
      this.evictLRU();
    }

    // Instantiate triad for this workspace root
    const rootPath = entry.rootPath;
    const storage = new KnowledgeStorage(rootPath);
    await storage.init();

    const graph = new GraphEngine(rootPath, storage);
    const reporter = new KnowledgeReporter(rootPath, storage, graph);
    const watcher = new WorkspaceWatcher(
      {
        rootPath,
        debounceMs: 400,
        autoGenerateReport: true,
        autoGenerateVisual: true,
      },
      this.parser,
      storage,
      graph,
      reporter
    );

    // If no nodes in storage or explicitly requested, run initial scan
    if (storage.nodes.size === 0 || autoScan) {
      const stats = await watcher.initialScan();
      this.registry.updateStats(entry.id, {
        totalNodes: stats.totalNodes,
        totalEdges: stats.totalEdges,
        totalFiles: stats.totalFiles,
      });
    } else {
      graph.resolveCrossFileReferences();
    }

    watcher.startWatching();

    const now = Date.now();
    const instance: WorkspaceInstance = {
      entry,
      storage,
      graph,
      watcher,
      reporter,
      loadedAt: now,
      lastUsedAt: now,
    };

    this.instances.set(entry.id, instance);
    this.registry.setActive(entry.id);

    return instance;
  }

  /**
   * Registers a new workspace and loads it immediately
   */
  public async registerAndLoad(rootPath: string, customName?: string, autoScan: boolean = true): Promise<WorkspaceInstance> {
    const resolvedPath = path.resolve(rootPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory does not exist: ${resolvedPath}`);
    }

    const entry = this.registry.register(resolvedPath, customName);
    return this.getOrLoad(entry.id, autoScan);
  }

  /**
   * Switches the active workspace
   */
  public async switchTo(idOrPathOrName: string): Promise<WorkspaceInstance> {
    let entry = this.registry.find(idOrPathOrName);
    if (!entry) {
      const resolved = path.resolve(idOrPathOrName);
      if (fs.existsSync(resolved)) {
        const detectedRoot = WorkspaceRegistry.detectProjectRoot(resolved);
        if (detectedRoot && fs.existsSync(detectedRoot) && fs.statSync(detectedRoot).isDirectory()) {
          return this.registerAndLoad(detectedRoot, undefined, true);
        }
      }
      throw new Error(`Cannot switch: workspace '${idOrPathOrName}' not found on disk or in registry.`);
    }
    this.registry.setActive(entry.id);
    return this.getOrLoad(entry.id);
  }

  /**
   * Unregisters a workspace and unloads it if in memory
   */
  public async unregister(idOrPathOrName: string): Promise<boolean> {
    const entry = this.registry.find(idOrPathOrName);
    if (!entry) return false;

    const loaded = this.instances.get(entry.id);
    if (loaded) {
      loaded.watcher.stopWatching();
      this.instances.delete(entry.id);
    }

    return this.registry.unregister(entry.id);
  }

  /**
   * Evicts the least recently used workspace instance from memory
   */
  private evictLRU(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, inst] of this.instances.entries()) {
      if (inst.lastUsedAt < oldestTime) {
        oldestTime = inst.lastUsedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      const inst = this.instances.get(oldestId);
      if (inst) {
        inst.watcher.stopWatching();
        this.instances.delete(oldestId);
      }
    }
  }

  /**
   * Disposes all loaded watchers and resources on shutdown
   */
  public dispose(): void {
    if (this.discoveryWatcher) {
      this.discoveryWatcher.dispose();
    }
    for (const inst of this.instances.values()) {
      inst.watcher.stopWatching();
    }
    this.instances.clear();
  }
}

class GlobalDiscoveryWatcher {
  private basePaths: Set<string> = new Set();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private pendingChecks: Map<string, NodeJS.Timeout> = new Map();

  constructor(private manager: WorkspaceManager) {}

  public start(): void {
    this.refreshBasePaths();
    // Re-check periodically in case new base paths emerge
    setInterval(() => this.refreshBasePaths(), 15000).unref();
  }

  private refreshBasePaths(): void {
    const workspaces = this.manager.getRegistry().list();
    const newBasePaths = new Set<string>();
    
    for (const ws of workspaces) {
      try {
        if (!fs.existsSync(ws.rootPath)) continue;
        const parentDir = path.dirname(ws.rootPath);
        if (parentDir) {
          newBasePaths.add(parentDir);
        }
      } catch (e) {
        // Ignore errors accessing root paths
      }
    }

    // Start watching new base paths
    for (const base of newBasePaths) {
      if (!this.basePaths.has(base)) {
        this.basePaths.add(base);
        this.watchBase(base);
      }
    }
  }

  private watchBase(basePath: string): void {
    try {
      const watcher = fs.watch(basePath, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(basePath, filename);
        
        // Debounce checks for newly created directories
        if (this.pendingChecks.has(fullPath)) {
          clearTimeout(this.pendingChecks.get(fullPath)!);
        }

        const timer = setTimeout(() => {
          this.pendingChecks.delete(fullPath);
          this.checkAndAutoRegister(fullPath);
        }, 3000); // Wait 3 seconds to allow user to run `npm init` or `git init`

        this.pendingChecks.set(fullPath, timer);
      });
      this.watchers.set(basePath, watcher);
      console.log(`[OmniKB Global Auto-Discovery] Now monitoring base directory: ${basePath}`);
    } catch (err: any) {
      console.warn(`[OmniKB] Could not watch base directory ${basePath}: ${err.message}`);
    }
  }

  private async checkAndAutoRegister(dirPath: string): Promise<void> {
    try {
      if (!fs.existsSync(dirPath)) return;
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) return;

      // Check if it's already registered
      if (this.manager.getRegistry().findByPath(dirPath)) {
        return;
      }

      const markers = [
        'package.json', '.git', 'pubspec.yaml', 'Cargo.toml', 'go.mod',
        'pom.xml', 'build.gradle', 'composer.json', 'requirements.txt', 'pyproject.toml'
      ];
      let isProject = false;
      for (const m of markers) {
        if (fs.existsSync(path.join(dirPath, m))) {
          isProject = true;
          break;
        }
      }

      if (isProject) {
        console.log(`[OmniKB Global Auto-Discovery] Detected new project at: ${dirPath}`);
        await this.manager.registerAndLoad(dirPath, undefined, true);
        console.log(`[OmniKB Global Auto-Discovery] Auto-registered & indexed: ${dirPath}`);
      }
    } catch {}
  }

  public dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    for (const timer of this.pendingChecks.values()) {
      clearTimeout(timer);
    }
    this.pendingChecks.clear();
  }
}
