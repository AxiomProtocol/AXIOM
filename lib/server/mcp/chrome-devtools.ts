import { spawn, ChildProcess } from "child_process";
import { getEnvConfig } from "../envConfig";

let mcpProcess: ChildProcess | null = null;

export interface MCPConfig {
  browserUrl?: string;
  autoConnect?: boolean;
  port?: number;
}

export function startChromeDevToolsMCP(config: MCPConfig = {}): ChildProcess {
  const envConfig = getEnvConfig();
  
  if (envConfig.isProduction) {
    throw new Error("Chrome DevTools MCP is not available in production environment");
  }

  if (mcpProcess && !mcpProcess.killed) {
    console.log("[MCP] Chrome DevTools MCP already running");
    return mcpProcess;
  }

  const args = ["chrome-devtools-mcp@latest"];
  
  if (config.browserUrl) {
    args.push(`--browser-url=${config.browserUrl}`);
  }
  
  if (config.autoConnect) {
    args.push("--autoConnect");
  }

  console.log("[MCP] Starting Chrome DevTools MCP server...");
  
  mcpProcess = spawn("npx", args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  mcpProcess.stdout?.on("data", (data) => {
    console.log(`[MCP stdout] ${data.toString().trim()}`);
  });

  mcpProcess.stderr?.on("data", (data) => {
    console.error(`[MCP stderr] ${data.toString().trim()}`);
  });

  mcpProcess.on("close", (code) => {
    console.log(`[MCP] Chrome DevTools MCP exited with code ${code}`);
    mcpProcess = null;
  });

  mcpProcess.on("error", (err) => {
    console.error("[MCP] Failed to start Chrome DevTools MCP:", err);
    mcpProcess = null;
  });

  return mcpProcess;
}

export function stopChromeDevToolsMCP(): void {
  if (mcpProcess && !mcpProcess.killed) {
    console.log("[MCP] Stopping Chrome DevTools MCP server...");
    mcpProcess.kill("SIGTERM");
    mcpProcess = null;
  }
}

export function isMCPRunning(): boolean {
  return mcpProcess !== null && !mcpProcess.killed;
}

export function getMCPStatus(): { running: boolean; pid?: number } {
  if (mcpProcess && !mcpProcess.killed) {
    return { running: true, pid: mcpProcess.pid };
  }
  return { running: false };
}

export const chromeDevToolsMCPConfig = {
  name: "chrome-devtools",
  command: "npx",
  args: ["chrome-devtools-mcp@latest"],
  description: "Chrome DevTools MCP server for AI agent browser debugging",
  capabilities: [
    "navigate_page - Load URLs",
    "click - Click elements",
    "fill / fill_form - Enter text",
    "hover - Trigger hover effects",
    "take_screenshot - Capture visuals",
    "take_snapshot - Get accessibility tree with unique element IDs",
    "get_console_logs - Read browser console",
    "get_network_requests - Inspect HTTP traffic",
    "performance_start_trace - Record performance trace",
    "performance_analyze_insight - Get LCP, CLS, document latency breakdowns",
  ],
};
