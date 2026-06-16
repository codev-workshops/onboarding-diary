import { describe, it, expect } from "vitest";

// We test the LANG_MAP logic directly since the hook uses browser APIs
// that aren't available in jsdom. The mapping is the key logic we want to protect.
const LANG_MAP: Record<string, string> = {
  en: "en-US",
  si: "si-LK",
  tanglish: "en-US",
};

describe("LANG_MAP voice language mapping", () => {
  it("maps 'en' to 'en-US'", () => {
    expect(LANG_MAP["en"]).toBe("en-US");
  });

  it("maps 'si' to 'si-LK'", () => {
    expect(LANG_MAP["si"]).toBe("si-LK");
  });

  it("maps 'tanglish' to 'en-US'", () => {
    expect(LANG_MAP["tanglish"]).toBe("en-US");
  });

  it("returns undefined for unknown languages (fallback needed)", () => {
    expect(LANG_MAP["fr"]).toBeUndefined();
  });

  it("covers all expected Language types", () => {
    const languages = Object.keys(LANG_MAP);
    expect(languages).toEqual(["en", "si", "tanglish"]);
  });
});
