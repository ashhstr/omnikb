"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSetupWizard = runSetupWizard;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const config_1 = require("./core/config");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};
const INJECTIONS = [
    {
        name: "Antigravity / Gemini",
        configPath: path.join(os.homedir(), ".gemini", "config", "mcp.json")
    },
    {
        name: "Claude Code / Desktop",
        configPath: path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json")
    },
    {
        name: "Cursor",
        configPath: path.join(os.homedir(), "AppData", "Roaming", "Cursor", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json")
    },
    {
        name: "Windsurf",
        configPath: path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json") // Approximation
    }
];
function injectMcpConfig(targetPath, enginePath) {
    let config = { mcpServers: {} };
    if (fs.existsSync(targetPath)) {
        try {
            config = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
            if (!config.mcpServers)
                config.mcpServers = {};
        }
        catch (e) {
            console.warn(`[Warning] Could not parse existing config at ${targetPath}. Overwriting.`);
        }
    }
    else {
        // Create directory if not exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    config.mcpServers["omnikb"] = {
        command: "node",
        args: [
            enginePath,
            "serve",
            "--mcp"
        ]
    };
    fs.writeFileSync(targetPath, JSON.stringify(config, null, 2), 'utf-8');
}
async function runSetupWizard() {
    console.log('\n=============================================================');
    console.log('🌐 OmniKB Setup Wizard - The Ultimate Code Knowledge Engine');
    console.log('=============================================================\n');
    // 1. Ask for Memory Location
    const defaultMemory = path.join(os.homedir(), '.omnikb');
    console.log(`Dimana lo mau menyimpan Data Knowledge Base / Memory (Otak Kedua)?`);
    let memoryPath = await question(`(Default: ${defaultMemory}) : `);
    if (!memoryPath.trim()) {
        memoryPath = defaultMemory;
    }
    memoryPath = path.resolve(memoryPath.trim());
    config_1.GlobalConfig.setMemoryPath(memoryPath);
    console.log(`✅ Lokasi Memory OmniKB di-set ke: ${memoryPath}\n`);
    // 2. Ask for AI Agents integration
    console.log('Pilih AI Agent yang ingin dihubungkan dengan OmniKB (ketik y/n):');
    const currentEnginePath = path.join(__dirname, 'cli.js').replace(/\\/g, '/');
    let injectedCount = 0;
    for (const agent of INJECTIONS) {
        const ans = await question(`Integrasikan dengan ${agent.name}? [y/N]: `);
        if (ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes') {
            try {
                injectMcpConfig(agent.configPath, currentEnginePath);
                console.log(`  -> ✅ Berhasil diinjeksi ke: ${agent.configPath}`);
                injectedCount++;
            }
            catch (e) {
                console.error(`  -> ❌ Gagal injeksi ke ${agent.name}: ${e.message}`);
            }
        }
    }
    console.log('\n=============================================================');
    if (injectedCount > 0) {
        console.log('🎉 Setup Complete! OmniKB siap digunakan sebagai Otak Kedua lo.');
        console.log('Silakan restart AI Agent/IDE lo agar konfigurasi MCP termuat.');
    }
    else {
        console.log('⚠️ Setup selesai, tapi tidak ada AI Agent yang dihubungkan.');
        console.log('Lo bisa mengulangi command `omnikb setup` kapan saja.');
    }
    console.log('=============================================================\n');
    rl.close();
}
