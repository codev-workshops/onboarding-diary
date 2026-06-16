import { describe, it, expect } from "vitest";
import { detectLanguage } from "@/lib/detectLanguage";

describe("detectLanguage", () => {
  describe("Pure Sinhala → 'si' (respond in Sinhala Unicode script)", () => {
    it("detects Sinhala Unicode characters", () => {
      expect(detectLanguage("මට උදව් කරන්න")).toBe("si");
    });

    it("detects 'kohomada' as pure Sinhala", () => {
      expect(detectLanguage("kohomada")).toBe("si");
    });

    it("detects 'mokada' as pure Sinhala", () => {
      expect(detectLanguage("mokada")).toBe("si");
    });

    it("detects 'ayubowan' as pure Sinhala", () => {
      expect(detectLanguage("ayubowan")).toBe("si");
    });

    it("detects 'mata dukai' as pure Sinhala", () => {
      expect(detectLanguage("mata dukai")).toBe("si");
    });

    it("detects 'sinhalen kiyanna' as Sinhala request", () => {
      expect(detectLanguage("sinhalen kiyanna")).toBe("si");
    });

    it("detects 'oya kohomada' as pure Sinhala", () => {
      expect(detectLanguage("oya kohomada")).toBe("si");
    });

    it("detects 'mama hondai' as pure Sinhala", () => {
      expect(detectLanguage("mama hondai")).toBe("si");
    });

    it("detects 'mage eka denna' as pure Sinhala", () => {
      expect(detectLanguage("mage eka denna")).toBe("si");
    });

    it("detects 'bohoma isthuthi' as pure Sinhala", () => {
      expect(detectLanguage("bohoma isthuthi")).toBe("si");
    });
  });

  describe("Tanglish/Code-switching → 'tanglish' (mix Sinhala script with English)", () => {
    it("detects 'mama phone ekak ganna one' as Tanglish", () => {
      expect(detectLanguage("mama phone ekak ganna one, budget eka 50k")).toBe("tanglish");
    });

    it("detects 'mage laptop ekak repair karanna one' as Tanglish", () => {
      expect(detectLanguage("mage laptop ekak repair karanna one")).toBe("tanglish");
    });

    it("detects 'birthday gift ekak ganna one' as Tanglish", () => {
      expect(detectLanguage("birthday gift ekak ganna one")).toBe("tanglish");
    });

    it("detects 'mage girlfriend ta gift ekak' as Tanglish", () => {
      expect(detectLanguage("mage girlfriend ta gift ekak")).toBe("tanglish");
    });

    it("detects 'camera ekak balanna one under 50000' as Tanglish", () => {
      expect(detectLanguage("camera ekak balanna one under 50000")).toBe("tanglish");
    });

    it("detects 'podi aulk bro' as Tanglish (mixed with English 'bro')", () => {
      expect(detectLanguage("podi aulk bro")).toBe("tanglish");
    });

    it("detects 'gf case machan' as Tanglish", () => {
      expect(detectLanguage("gf case machan")).toBe("tanglish");
    });
  });

  describe("English → 'en' (respond in English)", () => {
    it("detects plain English", () => {
      expect(detectLanguage("show me birthday cakes")).toBe("en");
    });

    it("detects 'I need a gift for my friend' as English", () => {
      expect(detectLanguage("I need a gift for my friend")).toBe("en");
    });

    it("detects 'what are the best phones under 50000' as English", () => {
      expect(detectLanguage("what are the best phones under 50000")).toBe("en");
    });

    it("detects 'hello' as English", () => {
      expect(detectLanguage("hello")).toBe("en");
    });

    it("detects 'track my order' as English", () => {
      expect(detectLanguage("track my order")).toBe("en");
    });
  });

  describe("Edge cases", () => {
    it("handles empty string as English", () => {
      expect(detectLanguage("")).toBe("en");
    });

    it("handles single Sinhala word 'hari' as pure Sinhala", () => {
      expect(detectLanguage("hari")).toBe("si");
    });

    it("handles 'mage gf' as Tanglish (Sinhala + English abbreviation)", () => {
      expect(detectLanguage("mage gf")).toBe("tanglish");
    });

    it("handles numbers-only as English", () => {
      expect(detectLanguage("50000")).toBe("en");
    });
  });
});
