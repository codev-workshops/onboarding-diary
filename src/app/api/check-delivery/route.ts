import { callMcpTool } from "@/lib/mcp/client";

export async function POST(req: Request) {
  try {
    const { city, delivery_date, product_id } = await req.json();

    if (!city || typeof city !== "string") {
      return Response.json(
        { error: "city is required" },
        { status: 400 }
      );
    }

    const args: Record<string, unknown> = {
      city,
      response_format: "json",
    };
    if (delivery_date) args.delivery_date = delivery_date;
    if (product_id) args.product_id = product_id;

    const result = await callMcpTool("kapruka_check_delivery", { params: args });

    // Extract structured delivery info from MCP response
    const mcpResult = result as { content?: Array<{ type: string; text?: string }> };
    if (mcpResult?.content?.[0]?.text) {
      try {
        const data = JSON.parse(mcpResult.content[0].text);
        return Response.json({
          available: data.available ?? data.deliverable ?? true,
          date: data.estimated_delivery ?? data.delivery_date ?? data.date ?? "2–3 business days",
          rate: data.delivery_rate ?? data.rate ?? data.shipping_cost ?? null,
          city: data.city ?? city,
        });
      } catch {
        // If text isn't JSON, still return what we can
        return Response.json({
          available: true,
          date: "2–3 business days",
          rate: null,
          city,
          raw: mcpResult.content[0].text,
        });
      }
    }

    return Response.json({
      available: true,
      date: "2–3 business days",
      rate: null,
      city,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: message, available: false },
      { status: 500 }
    );
  }
}
