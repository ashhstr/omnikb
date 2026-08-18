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
exports.GlobalConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class GlobalConfig {
    static CONFIG_DIR = path.join(os.homedir(), '.omnikb');
    static CONFIG_FILE = path.join(GlobalConfig.CONFIG_DIR, 'config.json');
    static getMemoryPath() {
        if (fs.existsSync(this.CONFIG_FILE)) {
            try {
                const raw = fs.readFileSync(this.CONFIG_FILE, 'utf-8');
                const config = JSON.parse(raw);
                if (config.memoryPath) {
                    return config.memoryPath;
                }
            }
            catch (e) {
                // Fallback below
            }
        }
        return this.CONFIG_DIR;
    }
    static setMemoryPath(memoryPath) {
        if (!fs.existsSync(this.CONFIG_DIR)) {
            fs.mkdirSync(this.CONFIG_DIR, { recursive: true });
        }
        let config = {};
        if (fs.existsSync(this.CONFIG_FILE)) {
            try {
                config = JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf-8'));
            }
            catch (e) { }
        }
        config.memoryPath = memoryPath;
        fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
        // Create the memory directory if it doesn't exist
        if (!fs.existsSync(memoryPath)) {
            fs.mkdirSync(memoryPath, { recursive: true });
        }
    }
}
exports.GlobalConfig = GlobalConfig;
