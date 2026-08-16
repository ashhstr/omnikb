import { WatcherConfig, GraphStats } from '../types';
import { CodeParser } from './parser';
import { KnowledgeStorage } from './storage';
import { GraphEngine } from './graph';
import { KnowledgeReporter } from './reporter';
export declare class WorkspaceWatcher {
    private config;
    private parser;
    private storage;
    private graph;
    private reporter;
    private isRunning;
    private debounceTimer;
    private pendingFiles;
    private fsWatchers;
    constructor(config: WatcherConfig, parser: CodeParser, storage: KnowledgeStorage, graph: GraphEngine, reporter: KnowledgeReporter);
    /**
     * Scans and indexes the entire workspace for the initial baseline
     */
    initialScan(): Promise<GraphStats>;
    /**
     * Starts real-time file watcher with debounced auto-sync
     */
    startWatching(): void;
    /**
     * Performs an immediate atomic reconciliation of all files in the workspace,
     * detecting any out-of-sync files, mass deletions, or branch changes.
     */
    forceReconcile(): Promise<GraphStats>;
    /**
     * Stops the active file watchers
     */
    stopWatching(): void;
    getPendingQueue(): string[];
    private onFileChanged;
    /**
     * Incremental sync of only the changed files
     */
    private processPendingChanges;
    private collectFiles;
    private watchDirectoriesRecursively;
    private shouldIgnore;
}
