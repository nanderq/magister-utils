import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerMagisterTools } from "./server";

describe("MCP server", () => {
  test("advertises exactly the nine read-only tools", async () => {
    const server = new McpServer({ name: "test-magister", version: "1.0.0" });
    registerMagisterTools(server as unknown as import("./server").ToolServer);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const result = await client.listTools();
    expect(result.tools.map((tool) => tool.name).sort()).toEqual([
      "get_account",
      "get_assignment",
      "get_grades",
      "get_message",
      "get_schedule",
      "get_study_guide",
      "list_assignments",
      "list_messages",
      "list_study_guides",
    ]);
    expect(result.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    await Promise.all([client.close(), server.close()]);
  });
});
