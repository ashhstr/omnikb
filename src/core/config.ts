import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class GlobalConfig {
  private static readonly CONFIG_DIR = path.join(os.homedir(), '.omnikb');
  private static readonly CONFIG_FILE = path.join(GlobalConfig.CONFIG_DIR, 'config.json');

  public static getMemoryPath(): string {
    if (fs.existsSync(this.CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(this.CONFIG_FILE, 'utf-8');
        const config = JSON.parse(raw);
        if (config.memoryPath) {
          return config.memoryPath;
        }
      } catch (e) {
        // Fallback below
      }
    }
    return this.CONFIG_DIR;
  }

  public static setMemoryPath(memoryPath: string): void {
    if (!fs.existsSync(this.CONFIG_DIR)) {
      fs.mkdirSync(this.CONFIG_DIR, { recursive: true });
    }
    
    let config: any = {};
    if (fs.existsSync(this.CONFIG_FILE)) {
      try {
        config = JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf-8'));
      } catch (e) {}
    }
    
    config.memoryPath = memoryPath;
    fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    // Create the memory directory if it doesn't exist
    if (!fs.existsSync(memoryPath)) {
      fs.mkdirSync(memoryPath, { recursive: true });
    }
  }
}
