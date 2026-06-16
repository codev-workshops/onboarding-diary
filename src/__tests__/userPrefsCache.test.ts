import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserPrefs,
  setUserPrefs,
  updateUserPrefs,
  clearUserPrefs,
  detectAddressingMode,
  getAddressingLabel,
  getReturningGreeting,
} from "@/lib/cache/userPrefsCache";
import type { AddressingMode, UserPrefs } from "@/lib/cache/userPrefsCache";

describe("userPrefsCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setUserPrefs / getUserPrefs", () => {
    it("stores and retrieves user preferences", () => {
      const prefs: UserPrefs = {
        addressingMode: "sir",
        preferredLanguage: "en",
        lastVisit: new Date().toISOString(),
      };
      setUserPrefs(prefs);
      const result = getUserPrefs();
      expect(result).not.toBeNull();
      expect(result!.addressingMode).toBe("sir");
      expect(result!.preferredLanguage).toBe("en");
    });

    it("returns null when no prefs are stored", () => {
      expect(getUserPrefs()).toBeNull();
    });

    it("persists under the 'aura_user_prefs' localStorage key", () => {
      setUserPrefs({
        addressingMode: "bro",
        preferredLanguage: "tanglish",
        lastVisit: new Date().toISOString(),
      });
      const raw = localStorage.getItem("aura_user_prefs");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data.addressingMode).toBe("bro");
    });

    it("stores optional name field", () => {
      setUserPrefs({
        addressingMode: "name",
        name: "Lahiru",
        preferredLanguage: "en",
        lastVisit: new Date().toISOString(),
      });
      const result = getUserPrefs();
      expect(result!.name).toBe("Lahiru");
    });
  });

  describe("updateUserPrefs", () => {
    it("creates prefs with defaults when none exist", () => {
      updateUserPrefs({ addressingMode: "madam" });
      const result = getUserPrefs();
      expect(result!.addressingMode).toBe("madam");
      expect(result!.preferredLanguage).toBe("en");
    });

    it("partially updates existing prefs", () => {
      setUserPrefs({
        addressingMode: "sir",
        preferredLanguage: "en",
        lastVisit: "2026-01-01T00:00:00.000Z",
      });
      updateUserPrefs({ preferredLanguage: "tanglish" });
      const result = getUserPrefs();
      expect(result!.addressingMode).toBe("sir");
      expect(result!.preferredLanguage).toBe("tanglish");
    });

    it("preserves name when updating other fields", () => {
      setUserPrefs({
        addressingMode: "name",
        name: "Lahiru",
        preferredLanguage: "en",
        lastVisit: "2026-01-01T00:00:00.000Z",
      });
      updateUserPrefs({ preferredLanguage: "tanglish" });
      const result = getUserPrefs();
      expect(result!.name).toBe("Lahiru");
    });

    it("updates lastVisit timestamp", () => {
      const before = new Date().toISOString();
      updateUserPrefs({ addressingMode: "boss" });
      const result = getUserPrefs();
      expect(new Date(result!.lastVisit).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
    });
  });

  describe("clearUserPrefs", () => {
    it("removes stored user preferences", () => {
      setUserPrefs({
        addressingMode: "sir",
        preferredLanguage: "en",
        lastVisit: new Date().toISOString(),
      });
      expect(getUserPrefs()).not.toBeNull();
      clearUserPrefs();
      expect(getUserPrefs()).toBeNull();
    });
  });

  describe("detectAddressingMode", () => {
    const standardModes: { message: string; expected: AddressingMode }[] = [
      { message: "Call me Sir", expected: "sir" },
      { message: "Call me Madam", expected: "madam" },
      { message: "Call me Bro", expected: "bro" },
      { message: "Call me Machan", expected: "machan" },
      { message: "Call me Sis", expected: "sis" },
    ];

    const sriLankanModes: { message: string; expected: AddressingMode }[] = [
      { message: "Call me Aiya", expected: "aiya" },
      { message: "Call me Akka", expected: "akka" },
      { message: "Call me Nangi", expected: "nangi" },
      { message: "Call me Malli", expected: "malli" },
      { message: "Call me Uncle", expected: "uncle" },
      { message: "Call me Aunty", expected: "aunty" },
      { message: "Call me Boss", expected: "boss" },
    ];

    it.each(standardModes)(
      "detects standard mode: '$message' → $expected",
      ({ message, expected }) => {
        expect(detectAddressingMode(message)).toBe(expected);
      }
    );

    it.each(sriLankanModes)(
      "detects Sri Lankan mode: '$message' → $expected",
      ({ message, expected }) => {
        expect(detectAddressingMode(message)).toBe(expected);
      }
    );

    it("detects 'Call me by my name' as name mode", () => {
      expect(detectAddressingMode("Call me by my name")).toBe("name");
    });

    it("is case-insensitive", () => {
      expect(detectAddressingMode("call me sir")).toBe("sir");
      expect(detectAddressingMode("CALL ME BRO")).toBe("bro");
      expect(detectAddressingMode("Call Me Aiya")).toBe("aiya");
    });

    it("returns null for unrecognized messages", () => {
      expect(detectAddressingMode("Hello there")).toBeNull();
      expect(detectAddressingMode("show me phones")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectAddressingMode("")).toBeNull();
    });

    it("detects 'Aunti' variant spelling", () => {
      expect(detectAddressingMode("Call me Aunti")).toBe("aunty");
    });
  });

  describe("getAddressingLabel", () => {
    it("capitalizes standard modes", () => {
      expect(getAddressingLabel("sir")).toBe("Sir");
      expect(getAddressingLabel("madam")).toBe("Madam");
      expect(getAddressingLabel("bro")).toBe("Bro");
    });

    it("capitalizes Sri Lankan modes", () => {
      expect(getAddressingLabel("aiya")).toBe("Aiya");
      expect(getAddressingLabel("akka")).toBe("Akka");
      expect(getAddressingLabel("nangi")).toBe("Nangi");
      expect(getAddressingLabel("malli")).toBe("Malli");
      expect(getAddressingLabel("uncle")).toBe("Uncle");
      expect(getAddressingLabel("aunty")).toBe("Aunty");
      expect(getAddressingLabel("boss")).toBe("Boss");
    });

    it("returns user name when mode is 'name' and name provided", () => {
      expect(getAddressingLabel("name", "Lahiru")).toBe("Lahiru");
    });

    it("returns 'Name' when mode is 'name' but no name provided", () => {
      expect(getAddressingLabel("name")).toBe("Name");
    });
  });

  describe("getReturningGreeting", () => {
    it("generates greeting for standard modes", () => {
      expect(
        getReturningGreeting({
          addressingMode: "sir",
          preferredLanguage: "en",
          lastVisit: new Date().toISOString(),
        })
      ).toBe("Welcome back, Sir!");
    });

    it("generates greeting for Sri Lankan modes", () => {
      expect(
        getReturningGreeting({
          addressingMode: "aiya",
          preferredLanguage: "en",
          lastVisit: new Date().toISOString(),
        })
      ).toBe("Welcome back, Aiya!");

      expect(
        getReturningGreeting({
          addressingMode: "boss",
          preferredLanguage: "en",
          lastVisit: new Date().toISOString(),
        })
      ).toBe("Welcome back, Boss!");
    });

    it("generates greeting with user name", () => {
      expect(
        getReturningGreeting({
          addressingMode: "name",
          name: "Lahiru",
          preferredLanguage: "en",
          lastVisit: new Date().toISOString(),
        })
      ).toBe("Welcome back, Lahiru!");
    });
  });
});
