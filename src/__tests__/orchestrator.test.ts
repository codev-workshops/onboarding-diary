import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the streamText function before importing orchestrator
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@/lib/agents/concierge", () => ({
  getSystemPromptForLanguage: vi.fn((lang: string) => `system-prompt-${lang}`),
  SHOPPER_SYSTEM_PROMPT: "shopper-prompt",
  LOGISTICS_SYSTEM_PROMPT: "logistics-prompt",
  ORDER_SYSTEM_PROMPT: "order-prompt",
}));

vi.mock("@/lib/agents/tools", () => ({
  getAllTools: vi.fn(() => ({ all: true })),
  getShopperTools: vi.fn(() => ({ shopper: true })),
  getLogisticsTools: vi.fn(() => ({ logistics: true })),
  getOrderTools: vi.fn(() => ({ order: true })),
}));

import { classifyIntent, classifyIntentByRules, orchestrate } from "@/lib/agents/orchestrator";
import { streamText } from "ai";
import type { LanguageModelV1 } from "ai";
import { getAllTools, getShopperTools, getLogisticsTools, getOrderTools } from "@/lib/agents/tools";

const mockStreamText = vi.mocked(streamText);

function createMockModel(): LanguageModelV1 {
  return {
    specificationVersion: "v1",
    provider: "test",
    modelId: "test-model",
    defaultObjectGenerationMode: "json" as const,
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  };
}

function makeTextStream(text: string): ReturnType<typeof streamText> {
  return {
    textStream: (async function* () {
      yield text;
    })(),
    text: Promise.resolve(text),
    toDataStreamResponse: vi.fn(),
  } as unknown as ReturnType<typeof streamText>;
}

describe("classifyIntentByRules", () => {
  it("detects shopping intent", () => {
    expect(classifyIntentByRules("show me birthday cakes")).toBe("shopping");
    expect(classifyIntentByRules("search for flowers")).toBe("shopping");
    expect(classifyIntentByRules("browse categories")).toBe("shopping");
    expect(classifyIntentByRules("find me a gift")).toBe("shopping");
    expect(classifyIntentByRules("compare prices")).toBe("shopping");
    expect(classifyIntentByRules("recommend something")).toBe("shopping");
  });

  it("detects logistics intent", () => {
    expect(classifyIntentByRules("can you deliver to Kandy?")).toBe("logistics");
    expect(classifyIntentByRules("check delivery to Colombo")).toBe("logistics");
    expect(classifyIntentByRules("show delivery cities")).toBe("logistics");
    expect(classifyIntentByRules("shipping cost to Galle")).toBe("logistics");
  });

  it("detects order intent", () => {
    expect(classifyIntentByRules("place my order")).toBe("order");
    expect(classifyIntentByRules("checkout")).toBe("order");
    expect(classifyIntentByRules("confirm order")).toBe("order");
  });

  it("returns null for ambiguous messages", () => {
    expect(classifyIntentByRules("hello")).toBeNull();
    expect(classifyIntentByRules("how are you today")).toBeNull();
    expect(classifyIntentByRules("tell me a joke")).toBeNull();
  });

  it("returns general for empty input", () => {
    expect(classifyIntentByRules("")).toBe("general");
    expect(classifyIntentByRules("   ")).toBe("general");
  });
});

describe("classifyIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses rule-based detection for shopping without LLM call", async () => {
    const model = createMockModel();
    const result = await classifyIntent(model, "Show me birthday cakes");
    expect(result).toBe("shopping");
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("uses rule-based detection for logistics without LLM call", async () => {
    const model = createMockModel();
    const result = await classifyIntent(model, "Can you deliver to Kandy?");
    expect(result).toBe("logistics");
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("falls back to LLM for ambiguous messages", async () => {
    mockStreamText.mockReturnValue(makeTextStream("general"));
    const model = createMockModel();
    const result = await classifyIntent(model, "Hello!");
    expect(result).toBe("general");
    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });

  it("returns 'general' when LLM throws an error", async () => {
    mockStreamText.mockImplementation(() => {
      throw new Error("API error");
    });
    const model = createMockModel();
    const result = await classifyIntent(model, "tell me something random");
    expect(result).toBe("general");
  });

  it("uses rule-based detection for order without LLM call", async () => {
    const model = createMockModel();
    const result = await classifyIntent(model, "Place my order with these items");
    expect(result).toBe("order");
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("falls back to LLM and trims/lowercases LLM output", async () => {
    mockStreamText.mockReturnValue(makeTextStream("  Shopping  "));
    const model = createMockModel();
    // This message doesn't match any rule patterns
    const result = await classifyIntent(model, "what do you have?");
    expect(result).toBe("shopping");
    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });
});

describe("orchestrate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes shopping intent to shopper tools (rule-based, no LLM classifier call)", async () => {
    // "Show me cakes" matches rule-based shopping, so only 1 streamText call (agent)
    mockStreamText
      .mockReturnValueOnce(makeTextStream("Here are some products"));

    const model = createMockModel();
    await orchestrate({
      classifierModel: model,
      agentModel: model,
      messages: [{ role: "user", content: "Show me cakes" }],
      language: "en",
    });

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    const agentCall = mockStreamText.mock.calls[0][0];
    expect(agentCall.system).toBe("shopper-prompt");
    expect(getShopperTools).toHaveBeenCalled();
  });

  it("routes logistics intent to logistics tools (rule-based)", async () => {
    mockStreamText
      .mockReturnValueOnce(makeTextStream("Delivery info"));

    const model = createMockModel();
    await orchestrate({
      classifierModel: model,
      agentModel: model,
      messages: [{ role: "user", content: "Check delivery to Colombo" }],
      language: "en",
    });

    const agentCall = mockStreamText.mock.calls[0][0];
    expect(agentCall.system).toBe("logistics-prompt");
    expect(getLogisticsTools).toHaveBeenCalled();
  });

  it("routes order intent to order tools (rule-based)", async () => {
    mockStreamText
      .mockReturnValueOnce(makeTextStream("Order placed!"));

    const model = createMockModel();
    await orchestrate({
      classifierModel: model,
      agentModel: model,
      messages: [{ role: "user", content: "Place my order with cake ID: cake123" }],
      language: "en",
    });

    const agentCall = mockStreamText.mock.calls[0][0];
    expect(agentCall.system).toBe("order-prompt");
    expect(getOrderTools).toHaveBeenCalled();
  });

  it("routes general intent to all tools with language prompt (LLM fallback)", async () => {
    // "Hello there" doesn't match any rule patterns -> LLM classifier + agent = 2 calls
    mockStreamText
      .mockReturnValueOnce(makeTextStream("general"))
      .mockReturnValueOnce(makeTextStream("Hello!"));

    const model = createMockModel();
    await orchestrate({
      classifierModel: model,
      agentModel: model,
      messages: [{ role: "user", content: "Hello there" }],
      language: "si",
    });

    expect(mockStreamText).toHaveBeenCalledTimes(2);
    const secondCall = mockStreamText.mock.calls[1][0];
    expect(secondCall.system).toBe("system-prompt-si");
    expect(getAllTools).toHaveBeenCalled();
  });

  it("extracts the last user message correctly", async () => {
    // "second message" doesn't match rules -> LLM fallback
    mockStreamText
      .mockReturnValueOnce(makeTextStream("shopping"))
      .mockReturnValueOnce(makeTextStream("result"));

    const model = createMockModel();
    await orchestrate({
      classifierModel: model,
      agentModel: model,
      messages: [
        { role: "user", content: "first message" },
        { role: "assistant", content: "response" },
        { role: "user", content: "second message" },
      ],
      language: "en",
    });

    // First call to streamText (classify) should use "second message"
    const classifyCall = mockStreamText.mock.calls[0][0];
    expect(classifyCall.messages).toEqual([{ role: "user", content: "second message" }]);
  });
});
