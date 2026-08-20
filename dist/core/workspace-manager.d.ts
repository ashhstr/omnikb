import { WorkspaceEntry } from '../types';
import { WorkspaceRegistry } from './workspace-registry';
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
export declare class WorkspaceManager {
    private registry;
    private instances;
    private maxLoadedWorkspaces;
    private parser;
    private discoveryWatcher;
    constructor(registry?: WorkspaceRegistry, maxLoadedWorkspaces?: number);
    getRegistry(): WorkspaceRegistry;
    getLoadedInstances(): WorkspaceInstance[];
    /**
     * Starts universal real-time watchers for ALL valid registered workspaces.
     * Automatically prunes non-existent paths and keeps all workspaces in 100% sync.
     */
    startUniversalWatch(autoScan?: boolean): Promise<WorkspaceInstance[]>;
    /**
     * Triggers atomic full reconciliation across all loaded workspaces concurrently.
     */
    reconcileAll(): Promise<Array<{
        workspace: string;
        stats: any;
    }>>;
    /**
     * Resolves a workspace instance by identifier or falls back to active/cwd
     */
    resolveInstance(workspaceIdOrPath?: string): Promise<WorkspaceInstance>;
    /**
     * Loads an existing registered workspace into memory (with LRU eviction if full)
     */
    getOrLoad(idOrPathOrName: string, autoScan?: boolean): Promise<WorkspaceInstance>;
    /**
     * Registers a new workspace and loads it immediately
     */
    registerAndLoad(rootPath: string, customName?: string, autoScan?: boolean): Promise<WorkspaceInstance>;
    /**
     * Switches the active workspace
     */
    switchTo(idOrPathOrName: string): Promise<WorkspaceInstance>;
    /**
     * Unregisters a workspace and unloads it if in memory
     */
    unregister(idOrPathOrName: string): Promise<boolean>;
    /**
     * Evicts the least recently used workspace instance from memory
     */
    private evictLRU;
    /**
     * Disposes all loaded watchers and resources on shutdown
     */
    dispose(): void;
}
