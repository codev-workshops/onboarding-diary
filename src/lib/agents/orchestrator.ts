import { streamText } from "ai";
import type { LanguageModelV1, CoreMessage } from "ai";
import { getSystemPromptForLanguage, SHOPPER_SYSTEM_PROMPT, LOGISTICS_SYSTEM_PROMPT, ORDER_SYSTEM_PROMPT } from "./concierge";
import { getAllTools, getShopperTools, getLogisticsTools, getOrderTools } from "./tools";

type Intent = "shopping" | "logistics" | "order" | "general";

// Rule-based intent patterns to avoid an LLM call for common queries
const SHOPPING_PATTERNS =
  /\b(show me|search|find|browse|look for|products?|items?|cakes?|flowers?|chocolates?|gifts?|buy|shop|categories|catalog|compare|cheaper|expensive|price|similar|recommend|suggest)\b/i;
const LOGISTICS_PATTERNS =
  /\b(deliver(y|ies)?|shipping|ship to|cities|city list|available.*(deliver|ship)|deliver.*(date|time|rate|cost|charge)|can you deliver|where.*(deliver|ship))\b/i;
const ORDER_PATTERNS =
  /\b(place.*(my|the)?\s*order|checkout|confirm.*order|complete.*purchase|cart.*order)\b/i;

/**
 * Fast rule-based intent detection. Returns null when uncertain so we can
 * fall back to the LLM classifier only when needed.
 */
export function classifyIntentByRules(message: string): Intent | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) return "general";

  // Order patterns are very specific, check first
  if (ORDER_PATTERNS.test(trimmed)) return "order";
  if (LOGISTICS_PATTERNS.test(trimmed)) return "logistics";
  if (SHOPPING_PATTERNS.test(trimmed)) return "shopping";

  return null; // uncertain -> fall back to LLM
}

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a Sri Lankan e-commerce shopping assistant.
Given a user message, classify the intent into exactly one of these categories:
- "shopping": product search, browse, compare, view details, list categories
- "logistics": delivery cities, delivery check, shipping availability, delivery date/rate
- "order": placing an order, "place my order", checkout with items and delivery details
- "general": order tracking, greetings, emotional messages, anything else

Respond with ONLY the intent word, nothing else.`;

export async function classifyIntent(
  model: LanguageModelV1,
  lastMessage: string
): Promise<Intent> {
  // Try rule-based classification first to save an LLM call
  const ruleResult = classifyIntentByRules(lastMessage);
  if (ruleResult !== null) return ruleResult;

  try {
    const result = await streamText({
      model,
      system: INTENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: lastMessage }],
      maxTokens: 10,
    });

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    const cleaned = text.trim().toLowerCase();
    if (cleaned === "shopping" || cleaned === "logistics" || cleaned === "order") {
      return cleaned;
    }
    return "general";
  } catch {
    return "general";
  }
}

interface OrchestrateParams {
  classifierModel: LanguageModelV1;
  agentModel: LanguageModelV1;
  messages: CoreMessage[];
  language: string;
}

export async function orchestrate({
  classifierModel,
  agentModel,
  messages,
  language,
}: OrchestrateParams) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserMsg = lastUserMessage
    ? typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : ""
    : "";

  const intent = await classifyIntent(classifierModel, lastUserMsg);

  let systemPrompt: string;
  let tools: ReturnType<typeof getAllTools>;

  switch (intent) {
    case "shopping":
      systemPrompt = SHOPPER_SYSTEM_PROMPT;
      tools = getShopperTools() as ReturnType<typeof getAllTools>;
      break;
    case "logistics":
      systemPrompt = LOGISTICS_SYSTEM_PROMPT;
      tools = getLogisticsTools() as ReturnType<typeof getAllTools>;
      break;
    case "order":
      systemPrompt = ORDER_SYSTEM_PROMPT;
      tools = getOrderTools() as ReturnType<typeof getAllTools>;
      break;
    default:
      systemPrompt = getSystemPromptForLanguage(language);
      tools = getAllTools();
      break;
  }

  return streamText({
    model: agentModel,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 3,
    maxTokens: 1024,
  });
}
