import { GraphEngine } from '../core/graph';
import { KnowledgeStorage } from '../core/storage';
import { WorkspaceWatcher } from '../core/watcher';
import { CodeParser } from '../core/parser';
import { KnowledgeReporter } from '../core/reporter';
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
    private workspaceRoot;
    private parser;
    private storage;
    private graph;
    private reporter;
    private watcher;
    private rl;
    constructor(workspaceRoot: string, parser: CodeParser, storage: KnowledgeStorage, graph: GraphEngine, reporter: KnowledgeReporter, watcher: WorkspaceWatcher);
    /**
     * Helper to normalize file URIs and Windows/POSIX paths to absolute system paths
     */
    private parsePath;
    /**
     * Dynamically switches the active project workspace, scans it, and starts auto-sync
     */
    switchWorkspace(targetPath: string): Promise<boolean>;
    /**
     * Starts reading JSON-RPC requests from standard input (stdio)
     */
    startStdio(): void;
    handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null>;
}
