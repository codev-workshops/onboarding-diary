import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { withRetry } from "@/lib/utils/retry";

const MCP_URL = process.env.KAPRUKA_MCP_URL || "https://mcp.kapruka.com/mcp";

let mcpClient: Client | null = null;
let connectionPromise: Promise<Client> | null = null;

// Rate limit queue for 429 handling
let rateLimitedUntil = 0;
const RATE_LIMIT_COOLDOWN = 10_000; // 10s

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  if (now < rateLimitedUntil) {
    await new Promise((r) => setTimeout(r, rateLimitedUntil - now));
  }
}

async function getClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
    const client = new Client({
      name: "aura-agent",
      version: "1.0.0",
    });
    await client.connect(transport);
    mcpClient = client;
    return client;
  })();

  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  await waitForRateLimit();

  return withRetry(async () => {
    try {
      const client = await getClient();
      const result = await client.callTool({ name: toolName, arguments: args });
      return result;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("429")
      ) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN;
      }
      // Reset client on connection errors
      if (
        error instanceof Error &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("fetch failed"))
      ) {
        mcpClient = null;
        connectionPromise = null;
      }
      throw error;
    }
  });
}

export async function listMcpTools() {
  const client = await getClient();
  return client.listTools();
}
