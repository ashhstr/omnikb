"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDdlParser = void 0;
const types_1 = require("./types");
class SqlDdlParser {
    supports(language) {
        return language === 'sql';
    }
    parse(ctx) {
        const { filePath, content, lines, nodes, edges, fileNodeId } = ctx;
        // 1. Match CREATE TABLE statements
        const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["`]?([A-Za-z0-9_.]+)["`]?\s*\(([\s\S]*?)\);/gi;
        let match;
        while ((match = createTableRegex.exec(content)) !== null) {
            const fullTableName = match[1];
            const tableName = fullTableName.split('.').pop() || fullTableName;
            const tableBody = match[2];
            const lineNum = types_1.ParserUtils.getLineNumber(content, match.index);
            const tableNodeId = `${filePath}#${tableName}`;
            const endLine = lineNum + tableBody.split('\n').length;
            const columnLines = tableBody.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'));
            const columns = [];
            const foreignKeys = [];
            for (const colLine of columnLines) {
                // Table-level Foreign Key: FOREIGN KEY (user_id) REFERENCES users(id)
                const fkMatch = colLine.match(/FOREIGN\s+KEY\s*\((?:`|")?([A-Za-z0-9_]+)(?:`|")?\)\s*REFERENCES\s*(?:`|")?([A-Za-z0-9_.]+)(?:`|")?\s*\((?:`|")?([A-Za-z0-9_]+)(?:`|")?\)/i);
                if (fkMatch) {
                    const targetTable = fkMatch[2].split('.').pop() || fkMatch[2];
                    foreignKeys.push({
                        column: fkMatch[1],
                        targetTable,
                        targetColumn: fkMatch[3],
                    });
                    continue;
                }
                // Inline Foreign Key: user_id INT REFERENCES users(id)
                const inlineFkMatch = colLine.match(/^(?:`|")?([A-Za-z0-9_]+)(?:`|")?\s+[A-Za-z0-9_()]+\s+.*REFERENCES\s+(?:`|")?([A-Za-z0-9_.]+)(?:`|")?\s*\((?:`|")?([A-Za-z0-9_]+)(?:`|")?\)/i);
                if (inlineFkMatch) {
                    const targetTable = inlineFkMatch[2].split('.').pop() || inlineFkMatch[2];
                    foreignKeys.push({
                        column: inlineFkMatch[1],
                        targetTable,
                        targetColumn: inlineFkMatch[3],
                    });
                    columns.push(inlineFkMatch[1]);
                    continue;
                }
                // Normal column definition: id INT PRIMARY KEY
                const colDefMatch = colLine.match(/^(?:`|")?([A-Za-z0-9_]+)(?:`|")?\s+([A-Za-z0-9_()]+)/);
                if (colDefMatch && !['PRIMARY', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'INDEX', 'KEY'].includes(colDefMatch[1].toUpperCase())) {
                    columns.push(colDefMatch[1]);
                }
            }
            nodes.push({
                id: tableNodeId,
                name: tableName,
                kind: 'class',
                filePath,
                startLine: lineNum,
                endLine,
                contentSnippet: lines.slice(lineNum - 1, Math.min(lineNum + 8, lines.length)).join('\n'),
                signature: `CREATE TABLE ${tableName}`,
                metadata: {
                    isSqlTable: true,
                    columnsCount: columns.length,
                    columns,
                    foreignKeys,
                },
            });
            edges.push({
                id: `edge:contains:${fileNodeId}:${tableNodeId}`,
                sourceId: fileNodeId,
                targetId: tableNodeId,
                kind: 'contains',
                filePath,
                line: lineNum,
            });
            // Create relational reference edges for foreign keys
            for (const fk of foreignKeys) {
                edges.push({
                    id: `edge:references:${tableNodeId}:${fk.targetTable}:${lineNum}`,
                    sourceId: tableNodeId,
                    targetId: `sym:${fk.targetTable}`,
                    targetName: fk.targetTable,
                    kind: 'references',
                    filePath,
                    line: lineNum,
                    metadata: {
                        isForeignKey: true,
                        sourceColumn: fk.column,
                        targetTable: fk.targetTable,
                        targetColumn: fk.targetColumn,
                    },
                });
            }
        }
    }
}
exports.SqlDdlParser = SqlDdlParser;
