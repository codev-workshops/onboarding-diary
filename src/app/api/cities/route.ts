import { callMcpTool } from "@/lib/mcp/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return Response.json({ cities: [] });
    }

    const result = await callMcpTool("kapruka_list_delivery_cities", {
      params: { search: query, response_format: "json" },
    });

    const mcpResult = result as {
      content?: Array<{ type: string; text?: string }>;
    };

    if (mcpResult?.content?.[0]?.text) {
      try {
        const data = JSON.parse(mcpResult.content[0].text);
        // The MCP may return an array of cities or an object with a cities field
        const cityList: string[] = Array.isArray(data)
          ? data.map((c: string | { name: string }) =>
              typeof c === "string" ? c : c.name
            )
          : Array.isArray(data.cities)
            ? data.cities.map((c: string | { name: string }) =>
                typeof c === "string" ? c : c.name
              )
            : [];

        // Filter by the query client-side as well for extra safety
        const filtered = cityList
          .filter((name: string) =>
            name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 15);

        return Response.json({ cities: filtered });
      } catch {
        // If the text isn't valid JSON, try splitting by newlines
        const lines = mcpResult.content[0].text
          .split("\n")
          .map((l: string) => l.trim())
          .filter(
            (l: string) =>
              l.length > 0 &&
              l.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 15);
        return Response.json({ cities: lines });
      }
    }

    return Response.json({ cities: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message, cities: [] }, { status: 500 });
  }
}
