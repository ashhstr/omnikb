import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
import { WorkspaceManager } from '../core/workspace-manager';
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
    private manager;
    private fallbackInstance?;
    private rl;
    constructor(graphOrManager: GraphEngine | WorkspaceManager, storage?: KnowledgeStorage, watcher?: WorkspaceWatcher);
    private resolveInstance;
    /**
     * Starts reading JSON-RPC requests from standard input (stdio)
     */
    startStdio(): void;
    handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null>;
}
