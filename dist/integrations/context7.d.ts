/**
 * Context7 Integration Module for OmniKB
 * Source: https://github.com/upstash/context7
 *
 * Implements:
 * - Dynamic Documentation & Up-to-date Context Injection
 * - Version-Specific Library Schema Resolution
 * - Prompt Context Formatting for AI Agents
 * - MCP Server Context Provider
 */
import { CodeNode } from '../types';
export interface DocContextEntry {
    libraryName: string;
    version?: string;
    topic: string;
    markdownDoc: string;
    codeExamples: string[];
}
export declare class Context7Engine {
    static readonly REPO_URL = "https://github.com/upstash/context7";
    static readonly VERSION = "1.0.0";
    private docStore;
    constructor();
    /**
     * Seed foundational documentation patterns
     */
    private seedDefaultDocs;
    registerDoc(entry: DocContextEntry): void;
    /**
     * Retrieves relevant doc context for a prompt or query
     */
    resolveContext(query: string, codeNodes: CodeNode[]): string;
}
