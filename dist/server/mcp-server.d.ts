import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: any;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id?: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export declare class McpServer {
    private graph;
    private storage;
    private watcher;
    private rl;
    constructor(graph: GraphEngine, storage: KnowledgeStorage, watcher: WorkspaceWatcher);
    /**
     * Starts reading JSON-RPC requests from standard input (stdio)
     */
    startStdio(): void;
    handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null>;
}
