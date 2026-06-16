import { z } from "zod";
import { generateObject } from "ai";
import type { LanguageModelV1 } from "ai";
import { SINGLISH_TO_ENGLISH, ENGLISH_TO_SINHALA } from "@/data/sinhalaWordMap";
import { SENTENCE_PAIRS } from "@/data/sinhalaSentencePairs";

// ─── Structured output schema for Sinhala slang parsing ──────────────────────
// Uses OpenAI structured outputs (via Vercel AI SDK's generateObject) to convert
// colloquial Sinhala/Singlish/Tanglish text into structured tokens the agent can
// understand correctly.
export const SinhalaIntentTokensSchema = z.object({
  normalizedIntent: z
    .string()
    .describe("The underlying intent: greeting, emotional, shopping, question, farewell, relationship_issue, celebration, complaint"),
  slangDetected: z
    .array(z.string())
    .describe("List of Sri Lankan slang words/phrases detected in the input"),
  englishEquivalent: z
    .string()
    .describe("Natural English translation preserving the emotional tone and true meaning"),
  emotionalTone: z
    .enum(["neutral", "happy", "sad", "angry", "stressed", "excited", "romantic", "confused"])
    .describe("The emotional tone of the message"),
  isProductRequest: z
    .boolean()
    .describe("true ONLY if the user is genuinely asking for a physical product to buy"),
});

export type SinhalaIntentTokens = z.infer<typeof SinhalaIntentTokensSchema>;

const NORMALIZER_SYSTEM_PROMPT = `You are a Sri Lankan Sinhala/Singlish/Tanglish text normalizer. Your job is to parse colloquial Sri Lankan text into structured tokens.

CRITICAL Sri Lankan slang meanings:
- "case" (with gf/bf/relationship context) = romantic situation, relationship problem, or affair — NOT a phone case
- "scene" = situation, drama, or event
- "party" = person (not a celebration)
- "block" = neighbourhood
- "signal" = flirting hints
- "cut" / "cut kala" = ghosted, stopped talking
- "set" / "set ekak" = plan, scheme, hookup arrangement
- "tight" = drunk
- "hotel" = restaurant
- "short eats" = snacks
- "propose" = confess romantic feelings
- "patch up" = reconcile after breakup
- "timepass" = casual/waste of time
- "machan" / "machang" = bro/dude
- "case karanawa" = pursuing someone romantically
- "ela" / "elakiri" = cool/awesome (male slang)
- "maru" = great/confirmed
- "kohomada" = how are you (greeting)
- "mokada" / "moko" = what/what's up
- "aulk" / "aulak" / "olk" = trouble, difficulty, problem
- "podi aulk" / "podi aulak" = a small problem/difficulty (NOT a product request)
- "gediya" = tough/difficult situation
- "karadara" = trouble/hassle
- "shaa" = wow/excitement (ONLY positive) — NEVER use for sad/difficult situations

RULES:
1. If "case"/"scene" appears near gf/bf/girlfriend/boyfriend/crush/ex → it's a RELATIONSHIP issue, NOT a product
2. "phone case" or "case ekak phone ekata" = literal phone case (product)
3. Always consider the full context before determining intent
4. isProductRequest should be true ONLY for genuine shopping requests`;

/**
 * Builds dictionary-backed translation context for the words in a message.
 * Looks up each word in the SinhalaSinglish-DB dictionary and returns
 * translation hints the LLM can use for accurate interpretation.
 */
function buildDictionaryContext(message: string): string {
  const words = message.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const translations: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    if (seen.has(word)) continue;
    seen.add(word);

    const englishMeaning = SINGLISH_TO_ENGLISH[word];
    if (englishMeaning) {
      const sinhalaForms = ENGLISH_TO_SINHALA[englishMeaning];
      const sinhala = sinhalaForms ? ` (${sinhalaForms[0]})` : "";
      translations.push(`"${word}" = ${englishMeaning}${sinhala}`);
    }
  }

  // Find similar sentence pairs as few-shot examples
  const exampleLines: string[] = [];
  for (const pair of SENTENCE_PAIRS) {
    const pairWords = pair.singlish.toLowerCase().split(/\s+/);
    const overlap = words.filter(w => pairWords.includes(w));
    if (overlap.length >= 2) {
      exampleLines.push(`"${pair.singlish}" → "${pair.english}"`);
      if (exampleLines.length >= 3) break;
    }
  }

  const parts: string[] = [];
  if (translations.length > 0) {
    parts.push(`Dictionary translations:\n${translations.join("\n")}`);
  }
  if (exampleLines.length > 0) {
    parts.push(`Similar sentence examples:\n${exampleLines.join("\n")}`);
  }

  if (parts.length === 0) return "";
  return "\n" + parts.join("\n\n");
}

/**
 * Normalizes a Sinhala/Singlish/Tanglish message into structured tokens.
 * Only call this for messages detected as non-English (tanglish or si).
 * Uses a 2700+ word SinhalaSinglish dictionary for word-level translations
 * as context for the LLM structured output parser.
 * Returns null if parsing fails (caller should proceed without normalization).
 */
export async function normalizeSlang(
  model: LanguageModelV1,
  userMessage: string
): Promise<SinhalaIntentTokens | null> {
  try {
    const dictContext = buildDictionaryContext(userMessage);
    const result = await generateObject({
      model,
      schema: SinhalaIntentTokensSchema,
      system: NORMALIZER_SYSTEM_PROMPT + dictContext,
      prompt: userMessage,
      maxTokens: 200,
    });

    return result.object;
  } catch (error) {
    console.error("Sinhala slang normalizer failed:", error);
    return null;
  }
}
