#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function detectNodePath() {
  try {
    // First try to get current Node.js path
    const nodeVersion = process.version;
    console.log(`${colors.green}✓ Detected Node.js version: ${nodeVersion}${colors.reset}`);
    
    // Check if using nvm
    const nvmDir = process.env.NVM_DIR;
    if (nvmDir) {
      // Try to get the current version from nvm
      try {
        const currentVersion = execSync('nvm current', { encoding: 'utf8' }).trim();
        const nodePath = path.join(nvmDir, 'versions', 'node', currentVersion, 'bin', 'node');
        if (fs.existsSync(nodePath)) {
          console.log(`${colors.green}✓ Using nvm Node.js at: ${nodePath}${colors.reset}`);
          return nodePath;
        }
      } catch (e) {
        // Fall through to process.execPath
      }
    }
    
    // Use the current Node.js executable path
    console.log(`${colors.green}✓ Using Node.js at: ${process.execPath}${colors.reset}`);
    return process.execPath;
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not detect Node.js path, using default${colors.reset}`);
    return 'node';
  }
}

async function main() {
  console.log(`${colors.bright}${colors.blue}🚀 MCP Google Sheets Configuration Setup${colors.reset}\n`);

  // Get project path
  const projectPath = path.resolve(__dirname, '..');
  const distIndexPath = path.join(projectPath, 'dist', 'index.js');

  // Check if we need to build first
  const srcIndexPath = path.join(projectPath, 'src', 'index.ts');
  if (!fs.existsSync(distIndexPath) && fs.existsSync(srcIndexPath)) {
    console.log(`${colors.yellow}⚠️  Dist file not found. Building project...${colors.reset}`);
    try {
      execSync('npm run build', { cwd: projectPath, stdio: 'inherit' });
      console.log(`${colors.green}✓ Build completed${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ Build failed. Please run 'npm run build' manually${colors.reset}`);
      process.exit(1);
    }
  }

  if (!fs.existsSync(distIndexPath)) {
    console.log(`${colors.red}❌ Dist file not found at: ${distIndexPath}${colors.reset}`);
    console.log(`${colors.yellow}Please run 'npm run build' first${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Found server dist at: ${distIndexPath}${colors.reset}\n`);

  // Get Google Cloud info
  console.log(`${colors.bright}Google Cloud Setup:${colors.reset}`);
  const projectId = await question('Google Cloud Project ID: ');
  const credentialsPath = await question('Path to service account JSON file: ');

  // Validate credentials file
  const absoluteCredPath = path.resolve(credentialsPath);
  if (!fs.existsSync(absoluteCredPath)) {
    console.log(`${colors.red}❌ Credentials file not found: ${absoluteCredPath}${colors.reset}`);
    process.exit(1);
  }

  // Read service account email
  let serviceAccountEmail = '';
  try {
    const credentials = JSON.parse(fs.readFileSync(absoluteCredPath, 'utf8'));
    serviceAccountEmail = credentials.client_email;
    console.log(`${colors.green}✓ Service account: ${serviceAccountEmail}${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not read service account email${colors.reset}\n`);
  }

  // Detect Node.js path
  const nodePath = detectNodePath();
  
  // Ask user about Node.js configuration
  console.log(`\n${colors.bright}Node.js Configuration:${colors.reset}`);
  console.log(`1. Use detected Node.js: ${nodePath}`);
  console.log(`2. Specify custom Node.js path`);
  console.log(`3. Use system default (node)`);
  
  const nodeChoice = await question('\nSelect option (1-3): ');
  let finalNodePath = nodePath;
  
  switch (nodeChoice) {
    case '2':
      finalNodePath = await question('Enter full path to Node.js executable: ');
      if (!fs.existsSync(finalNodePath)) {
        console.log(`${colors.yellow}⚠️  Path not found, using detected path${colors.reset}`);
        finalNodePath = nodePath;
      }
      break;
    case '3':
      finalNodePath = 'node';
      break;
  }

  // Create MCP config
  const mcpConfig = {
    mcpServers: {
      "mcp-gsheets": {
        command: finalNodePath,
        args: [distIndexPath],
        env: {
          GOOGLE_PROJECT_ID: projectId,
          GOOGLE_APPLICATION_CREDENTIALS: absoluteCredPath
        }
      }
    }
  };

  // Determine config path
  const platform = os.platform();
  let configPath;
  let configDir;

  if (platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  } else {
    configDir = path.join(os.homedir(), '.config', 'claude');
    configPath = path.join(configDir, 'claude_desktop_config.json');
  }

  console.log(`${colors.bright}Configuration Options:${colors.reset}`);
  console.log('1. Save to Claude Desktop config');
  console.log('2. Display config (copy manually)');
  console.log('3. Save to custom file');
  
  const choice = await question('\nSelect option (1-3): ');

  switch (choice) {
    case '1':
      // Check if config exists
      let existingConfig = {};
      if (fs.existsSync(configPath)) {
        try {
          existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (existingConfig.mcpServers && (existingConfig.mcpServers.gsheets || existingConfig.mcpServers['mcp-gsheets'])) {
            const overwrite = await question(`\n${colors.yellow}⚠️  'mcp-gsheets' server already exists. Overwrite? (y/n): ${colors.reset}`);
            if (overwrite.toLowerCase() !== 'y') {
              console.log('Cancelled.');
              process.exit(0);
            }
            // Remove old gsheets entry if exists
            if (existingConfig.mcpServers.gsheets) {
              delete existingConfig.mcpServers.gsheets;
            }
          }
        } catch (error) {
          console.log(`${colors.yellow}⚠️  Could not read existing config, will create new one${colors.reset}`);
        }
      }

      // Merge configs
      const finalConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingConfig.mcpServers,
          ...mcpConfig.mcpServers
        }
      };

      // Create directory if needed
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write config
      fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2));
      console.log(`\n${colors.green}✅ Configuration saved to: ${configPath}${colors.reset}`);
      console.log(`\n${colors.yellow}⚠️  Restart Claude Desktop to apply changes${colors.reset}`);
      break;

    case '2':
      console.log(`\n${colors.bright}Copy this configuration to your Claude Desktop config:${colors.reset}\n`);
      console.log(JSON.stringify(mcpConfig, null, 2));
      break;

    case '3':
      const customPath = await question('Enter file path: ');
      fs.writeFileSync(customPath, JSON.stringify(mcpConfig, null, 2));
      console.log(`\n${colors.green}✅ Configuration saved to: ${customPath}${colors.reset}`);
      break;

    default:
      console.log(`${colors.red}Invalid option${colors.reset}`);
  }

  // Show next steps
  console.log(`\n${colors.bright}${colors.blue}Next Steps:${colors.reset}`);
  console.log(`1. Share your Google Sheets with: ${colors.green}${serviceAccountEmail}${colors.reset}`);
  console.log(`2. Restart Claude Desktop`);
  console.log(`3. Test with: "Read data from spreadsheet [YOUR_SPREADSHEET_ID]"`);

  // Create .env file option
  const createEnv = await question(`\n${colors.yellow}Create .env file for development? (y/n): ${colors.reset}`);
  if (createEnv.toLowerCase() === 'y') {
    const envContent = `# Google Cloud configuration
GOOGLE_PROJECT_ID=${projectId}
GOOGLE_APPLICATION_CREDENTIALS=${absoluteCredPath}

# Test spreadsheet ID (optional)
TEST_SPREADSHEET_ID=

# Service account email (for reference)
SERVICE_ACCOUNT_EMAIL=${serviceAccountEmail}
`;
    
    const envPath = path.join(projectPath, '.env');
    fs.writeFileSync(envPath, envContent);
    console.log(`\n${colors.green}✅ Created .env file for development${colors.reset}`);
  }

  rl.close();
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});