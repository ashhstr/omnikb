import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
export declare class LocalHttpServer {
    private port;
    private graph;
    private storage;
    private watcher;
    private workspaceRoot;
    private server;
    constructor(port: number, workspaceRoot: string, graph: GraphEngine, storage: KnowledgeStorage, watcher: WorkspaceWatcher);
    start(): Promise<void>;
    stop(): Promise<void>;
    private sendJson;
    private readBodyJson;
}
