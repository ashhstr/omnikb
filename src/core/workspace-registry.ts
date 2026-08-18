import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { WorkspaceEntry, WorkspaceRegistryData } from '../types';
import { GlobalConfig } from './config';

export class WorkspaceRegistry {
  private registryDir: string;
  private registryFilePath: string;
  private data: WorkspaceRegistryData = {
    version: 1,
    activeWorkspaceId: null,
    workspaces: [],
  };

  constructor(customRegistryDir?: string) {
    this.registryDir = customRegistryDir || GlobalConfig.getMemoryPath();
    this.registryFilePath = path.join(this.registryDir, 'registry.json');
    this.load();
  }

  public getRegistryFilePath(): string {
    return this.registryFilePath;
  }

  public static generateId(rootPath: string): string {
    const normalized = path.resolve(rootPath).toLowerCase().replace(/\\/g, '/');
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  }

  public load(): void {
    try {
      if (!fs.existsSync(this.registryFilePath)) {
        return;
      }
      const raw = fs.readFileSync(this.registryFilePath, 'utf8');
      const parsed: WorkspaceRegistryData = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.workspaces)) {
        this.data = {
          version: parsed.version || 1,
          activeWorkspaceId: parsed.activeWorkspaceId || null,
          workspaces: parsed.workspaces.map((w) => ({
            ...w,
            rootPath: path.resolve(w.rootPath),
          })),
        };
      }
    } catch (err: any) {
      console.error(`[OmniKB Registry] Failed to load registry: ${err?.message || err}`);
    }
  }

  public save(): void {
    try {
      if (!fs.existsSync(this.registryDir)) {
        fs.mkdirSync(this.registryDir, { recursive: true });
      }
      const jsonStr = JSON.stringify(this.data, null, 2);
      const tmpPath = `${this.registryFilePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, jsonStr, 'utf8');
      fs.renameSync(tmpPath, this.registryFilePath);
    } catch (err: any) {
      console.error(`[OmniKB Registry] Failed to save registry: ${err?.message || err}`);
    }
  }

  public register(rootPath: string, customName?: string, stats?: Partial<WorkspaceEntry>): WorkspaceEntry {
    this.load();
    const resolvedPath = path.resolve(rootPath);
    const id = WorkspaceRegistry.generateId(resolvedPath);
    const name = customName || path.basename(resolvedPath) || 'workspace';

    const existingIndex = this.data.workspaces.findIndex(
      (w) => w.id === id || path.resolve(w.rootPath).toLowerCase() === resolvedPath.toLowerCase()
    );

    const now = Date.now();
    const entry: WorkspaceEntry = {
      id,
      name,
      rootPath: resolvedPath,
      lastAccessed: now,
      totalNodes: stats?.totalNodes || 0,
      totalEdges: stats?.totalEdges || 0,
      totalFiles: stats?.totalFiles || 0,
    };

    if (existingIndex !== -1) {
      // Update existing entry while preserving stats if not provided
      const prev = this.data.workspaces[existingIndex];
      this.data.workspaces[existingIndex] = {
        ...prev,
        ...entry,
        name: customName || prev.name,
        totalNodes: stats?.totalNodes !== undefined ? stats.totalNodes : prev.totalNodes,
        totalEdges: stats?.totalEdges !== undefined ? stats.totalEdges : prev.totalEdges,
        totalFiles: stats?.totalFiles !== undefined ? stats.totalFiles : prev.totalFiles,
      };
    } else {
      this.data.workspaces.push(entry);
    }

    if (!this.data.activeWorkspaceId) {
      this.data.activeWorkspaceId = id;
    }

    this.save();
    return this.find(id)!;
  }

  public unregister(idOrPathOrName: string): boolean {
    this.load();
    const entry = this.find(idOrPathOrName);
    if (!entry) return false;

    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== entry.id);
    if (this.data.activeWorkspaceId === entry.id) {
      this.data.activeWorkspaceId = this.data.workspaces.length > 0 ? this.data.workspaces[0].id : null;
    }

    this.save();
    return true;
  }

  public setActive(idOrPathOrName: string): WorkspaceEntry | null {
    this.load();
    const entry = this.find(idOrPathOrName);
    if (!entry) return null;

    entry.lastAccessed = Date.now();
    this.data.activeWorkspaceId = entry.id;
    this.save();
    return entry;
  }

  public getActive(): WorkspaceEntry | null {
    this.load();
    if (!this.data.activeWorkspaceId) {
      if (this.data.workspaces.length > 0) {
        this.data.activeWorkspaceId = this.data.workspaces[0].id;
        this.save();
      } else {
        return null;
      }
    }
    const entry = this.data.workspaces.find((w) => w.id === this.data.activeWorkspaceId);
    if (!entry && this.data.workspaces.length > 0) {
      this.data.activeWorkspaceId = this.data.workspaces[0].id;
      this.save();
      return this.data.workspaces[0];
    }
    return entry || null;
  }

  public find(idOrPathOrName: string): WorkspaceEntry | null {
    if (!idOrPathOrName) return null;
    this.load();

    const trimmed = idOrPathOrName.trim();
    // 1. Match by ID
    const byId = this.data.workspaces.find((w) => w.id === trimmed);
    if (byId) return byId;

    // 2. Match by exact normalized path
    const resolved = path.resolve(trimmed).toLowerCase();
    const byPath = this.data.workspaces.find((w) => path.resolve(w.rootPath).toLowerCase() === resolved);
    if (byPath) return byPath;

    // 3. Match by name (case-insensitive)
    const byName = this.data.workspaces.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
    if (byName) return byName;

    // 4. Match closest ancestor workspace path
    return this.findByPath(trimmed);
  }

  public findByPath(targetPath: string): WorkspaceEntry | null {
    if (!targetPath) return null;
    this.load();
    const resolvedTarget = path.resolve(targetPath).toLowerCase().replace(/\\/g, '/');

    // Sort by longest rootPath to find most specific nested workspace
    const sorted = [...this.data.workspaces].sort(
      (a, b) => b.rootPath.length - a.rootPath.length
    );

    for (const ws of sorted) {
      const wsRoot = path.resolve(ws.rootPath).toLowerCase().replace(/\\/g, '/');
      if (resolvedTarget === wsRoot || resolvedTarget.startsWith(wsRoot + '/')) {
        return ws;
      }
    }
    return null;
  }

  public list(): WorkspaceEntry[] {
    this.load();
    const activeId = this.getActive()?.id;
    return this.data.workspaces.map((w) => ({
      ...w,
      isCurrent: w.id === activeId,
    }));
  }

  public updateStats(id: string, stats: { totalNodes?: number; totalEdges?: number; totalFiles?: number }): void {
    const entry = this.data.workspaces.find((w) => w.id === id);
    if (entry) {
      if (stats.totalNodes !== undefined) entry.totalNodes = stats.totalNodes;
      if (stats.totalEdges !== undefined) entry.totalEdges = stats.totalEdges;
      if (stats.totalFiles !== undefined) entry.totalFiles = stats.totalFiles;
      entry.lastAccessed = Date.now();
      this.save();
    }
  }

  /**
   * Discovers the project root directory from any file path by looking for project root markers
   */
  public static detectProjectRoot(startPath: string): string {
    let current = path.resolve(startPath);
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
    }
    try {
      if (fs.existsSync(current) && fs.statSync(current).isFile()) {
        current = path.dirname(current);
      }
    } catch {}

    const markers = [
      'package.json',
      '.git',
      'pubspec.yaml',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'composer.json',
      'requirements.txt',
      'pyproject.toml',
      '.omnikb',
    ];

    let dir = current;
    while (dir && dir !== path.dirname(dir)) {
      for (const m of markers) {
        if (fs.existsSync(path.join(dir, m))) {
          return dir;
        }
      }
      dir = path.dirname(dir);
    }

    return current;
  }
}
