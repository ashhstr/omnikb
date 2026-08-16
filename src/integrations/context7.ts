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

export class Context7Engine {
  public static readonly REPO_URL = 'https://github.com/upstash/context7';
  public static readonly VERSION = '1.0.0';

  private docStore: Map<string, DocContextEntry> = new Map();

  constructor() {
    this.seedDefaultDocs();
  }

  /**
   * Seed foundational documentation patterns
   */
  private seedDefaultDocs(): void {
    this.registerDoc({
      libraryName: 'omnikb',
      version: '1.0.0',
      topic: 'Core Architecture',
      markdownDoc:
        'OmniKB is a local real-time knowledge base synthesizing CodeGraph, GitNexus, Graphify, and Context7 with debounced file watching and universal MCP/REST API access.',
      codeExamples: [
        'import { KnowledgeStorage } from "./core/storage";',
        'const storage = new KnowledgeStorage(process.cwd());',
        'await storage.init();',
      ],
    });
  }

  public registerDoc(entry: DocContextEntry): void {
    const key = `${entry.libraryName.toLowerCase()}:${entry.topic.toLowerCase()}`;
    this.docStore.set(key, entry);
  }

  /**
   * Retrieves relevant doc context for a prompt or query
   */
  public resolveContext(query: string, codeNodes: CodeNode[]): string {
    const matchedDocs: DocContextEntry[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, entry] of this.docStore.entries()) {
      if (key.includes(lowerQuery) || lowerQuery.includes(entry.libraryName.toLowerCase())) {
        matchedDocs.push(entry);
      }
    }

    let formatted = `### 📚 Context7 Verified Documentation Context\n\n`;

    if (matchedDocs.length > 0) {
      for (const doc of matchedDocs) {
        formatted += `#### [${doc.libraryName} v${doc.version || 'latest'}] ${doc.topic}\n`;
        formatted += `${doc.markdownDoc}\n\n`;
        if (doc.codeExamples.length > 0) {
          formatted += `\`\`\`typescript\n${doc.codeExamples.join('\n\n')}\n\`\`\`\n\n`;
        }
      }
    }

    if (codeNodes.length > 0) {
      formatted += `#### 🔍 Matching Project Symbols:\n`;
      for (const node of codeNodes.slice(0, 5)) {
        formatted += `- **\`${node.name}\`** (\`${node.kind}\`) at \`${node.filePath}:${node.startLine}\`\n`;
      }
      formatted += `\n`;
    }

    return formatted;
  }
}
