import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
import { WorkspaceManager } from '../core/workspace-manager';
export declare class LocalHttpServer {
    private port;
    private manager;
    private fallbackWorkspaceRoot?;
    private fallbackInstance?;
    private server;
    constructor(port: number, workspaceRootOrManager: string | WorkspaceManager, graph?: GraphEngine, storage?: KnowledgeStorage, watcher?: WorkspaceWatcher);
    private resolveInstance;
    start(): Promise<void>;
    stop(): Promise<void>;
    private sendJson;
    private readBodyJson;
}
