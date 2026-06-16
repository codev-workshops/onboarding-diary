import type { Language } from "@/types";
import { SINGLISH_WORDS } from "@/data/sinhalaWordMap";

// Sinhala Unicode block: U+0D80 to U+0DFF
const SINHALA_REGEX = /[\u0D80-\u0DFF]/;

// Explicit requests for Sinhala language (romanized keywords)
const SINHALA_REQUEST_PATTERNS =
  /\b(sinhalen|sinhala|sinhalese|sinhala\s+walata|sinhala\s+karanawa)\b/i;

// Manually curated Sinhala words that use informal romanization not present in
// the SinhalaSinglish-DB dictionary, plus high-frequency conversational words
// extracted from a 34K-sentence Sinhala↔English parallel corpus.
const EXTRA_SINHALA_WORDS = new Set([
  // Common greetings & courtesy (informal romanization)
  "kohomada", "mokada", "ayubowan", "isthuthi", "sthuthi", "subha", "dawasak",
  "sthuthiyi", "samawenna",
  // Pronouns & particles (informal + corpus-derived formal forms)
  "mama", "oya", "mage", "oyage", "eyage", "magey", "eya", "meka",
  "api", "umba", "mang", "oyata", "eyata", "mata",
  "oba", "obata", "ohu", "ohuta", "ohuge", "obawa", "obe",
  "meya", "eyawa", "oyawa", "owun",
  // Common verbs (informal romanization)
  "ganna", "kiyanna", "danna", "balanna", "denna", "karanna", "hadanna",
  "kiyanawa", "karanawa", "wenawa", "innawa", "yanawa",
  "huganawa", "araganna", "kanna", "bonna", "yamu", "gamu",
  "kiyala", "kiyanawada", "balamu", "dannawa", "hadamu",
  "karapu", "giya", "aawa", "keruwa", "dunna", "gatte", "ahanna", "yawanna",
  // Corpus-derived verb forms (high frequency)
  "karanne", "karana", "kala", "kara", "kale",
  "kireemata", "geneemata", "sitina", "yanne",
  "danne", "kiwwa", "laba",
  // Common adjectives & responses
  "hoda", "hondai", "narkai", "narakay", "hodai",
  "puluwanda", "puluwan", "bari", "epa",
  "honda", "hondin", "hekiya", "heki",
  "eththatama", "wishwasa", "kemathi", "yuthu",
  // Question words
  "monawada", "kawuda", "kavuda", "kavda", "kohe",
  "mokakda", "koheda",
  // Common modifiers & connectors
  "godak", "tikak", "ithin", "thamai", "nemei", "neda", "onna",
  "hariyata", "hondatama", "ikmanin", "pamanak", "witharai",
  "vadi", "gaana", "kiyada", "aduvata", "ikmanata", "parakkuda",
  "ganan", "vidiyata", "wisthara", "thaggak", "gedarata",
  // Corpus-derived connectors (high frequency)
  "namuth", "ethi", "saha", "lesa", "wage", "sandaha",
  "samanga", "athara", "bawa", "apata", "ona", "adahas",
  // Negation
  "nehe", "netha", "nethi", "nowe",
  // Size words
  "podi", "loku",
  // Slang & expressions
  "machang", "machan", "aney", "aiyo", "ado", "shaa", "ela",
  "gindara", "patta", "supiri", "maru", "niyamai", "aniwa",
  "saththai", "elakiri",
  // Difficulty/trouble words
  "aulk", "aulak", "olk", "gediya", "karadara",
  // Emotional words
  "dukai", "sathutu", "kopaya",
  "waira", "ridena", "mahansi", "baya",
  "saththuta", "duka", "santhosha",
  // Language request
  "sinhalen",
  // Common nouns
  "eka", "ekak", "nisa", "hari",
  "katha", "deyak", "wada",
  // Other informal forms not in dictionary
  "bohoma",
]);

// Words that exist in the dictionary but are also common English words — exclude from detection
const ENGLISH_OVERLAP = new Set([
  "one", "can", "come", "go", "give", "take", "see", "look", "find",
  "help", "know", "think", "like", "work", "make", "do", "get", "have",
  "be", "say", "tell", "ask", "try", "use", "show", "call", "send",
  "bring", "keep", "start", "stop", "wait", "run", "walk", "sit",
  "stand", "talk", "read", "write", "play", "sing", "dance", "cook",
  "wash", "fix", "break", "change", "pick", "check", "close", "open",
  "some", "all", "more", "less", "most", "same", "both", "each",
  "every", "other", "few", "different", "only", "still", "just",
  "again", "near", "far", "much", "many", "little", "too", "very",
  "really", "also", "here", "there", "now", "soon", "later", "early",
  "late", "always", "never", "sometimes", "often", "usually", "already",
  "last", "next", "first", "double", "half",
]);

/**
 * Check if a word is a known Singlish romanized Sinhala word.
 * Uses the comprehensive 2700+ word dictionary from SinhalaSinglish-DB
 * plus manually curated slang words, excluding English overlaps.
 */
function isSinhalaWord(word: string): boolean {
  const lower = word.toLowerCase();
  if (ENGLISH_OVERLAP.has(lower)) return false;
  return SINGLISH_WORDS.has(lower) || EXTRA_SINHALA_WORDS.has(lower);
}

/**
 * Check if the message is predominantly romanized Sinhala (no English mixing).
 * Split the message into words, count how many are known Sinhala words vs unknown.
 * If ALL/nearly all words are Sinhala → pure Sinhala. If any English mixed in → Tanglish.
 */
function isPureSinhala(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  let sinhalaCount = 0;
  for (const word of words) {
    if (isSinhalaWord(word)) {
      sinhalaCount++;
    }
  }

  // If ALL words are recognized Sinhala, or only very short unknown words remain
  // (like "ta", "da" which are particles), treat as pure Sinhala
  const unknownCount = words.length - sinhalaCount;
  if (unknownCount === 0) return true;

  // Allow only known Sinhala particles that aren't in our main vocabulary
  const SINHALA_PARTICLES = new Set(["ta", "da", "ne", "ko", "nam", "ge", "ka", "pa", "den", "neh", "ban"]);
  if (unknownCount <= 1) {
    const unknownWords = words.filter(w => !isSinhalaWord(w));
    return unknownWords.every(w => SINHALA_PARTICLES.has(w));
  }

  return false;
}

/**
 * Detect language from user input text.
 * Uses a comprehensive 2700+ word Singlish dictionary (from SinhalaSinglish-DB)
 * plus manually curated Sri Lankan slang for accurate detection.
 *
 * - If ANY Sinhala unicode characters are present → "si"
 * - If user explicitly asks for Sinhala (e.g. "sinhalen") → "si"
 * - If message is predominantly romanized Sinhala with no/minimal English → "si"
 * - If message mixes Sinhala words with English words → "tanglish"
 * - Default → "en"
 */
export function detectLanguage(text: string): Language {
  // Actual Sinhala Unicode script
  if (SINHALA_REGEX.test(text)) {
    return "si";
  }

  // Explicit Sinhala request keywords
  if (SINHALA_REQUEST_PATTERNS.test(text)) {
    return "si";
  }

  // Check if any romanized Sinhala words are present using the comprehensive dictionary
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const hasSinhalaWords = words.some(w => isSinhalaWord(w));

  if (hasSinhalaWords) {
    // If the message is predominantly Sinhala → respond in Sinhala
    // If mixed with English → respond in Tanglish
    return isPureSinhala(text) ? "si" : "tanglish";
  }

  return "en";
}
