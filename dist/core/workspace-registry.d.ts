import { WorkspaceEntry } from '../types';
export declare class WorkspaceRegistry {
    private registryDir;
    private registryFilePath;
    private data;
    constructor(customRegistryDir?: string);
    getRegistryFilePath(): string;
    static generateId(rootPath: string): string;
    load(): void;
    save(): void;
    register(rootPath: string, customName?: string, stats?: Partial<WorkspaceEntry>): WorkspaceEntry;
    unregister(idOrPathOrName: string): boolean;
    setActive(idOrPathOrName: string): WorkspaceEntry | null;
    getActive(): WorkspaceEntry | null;
    find(idOrPathOrName: string): WorkspaceEntry | null;
    findByPath(targetPath: string): WorkspaceEntry | null;
    list(): WorkspaceEntry[];
    updateStats(id: string, stats: {
        totalNodes?: number;
        totalEdges?: number;
        totalFiles?: number;
    }): void;
    /**
     * Prunes workspace entries whose root directories no longer exist on disk.
     * Returns list of pruned workspace identifiers.
     */
    pruneNonExistent(): string[];
    /**
     * Discovers the project root directory from any file path by looking for project root markers
     */
    static detectProjectRoot(startPath: string): string | null;
}
