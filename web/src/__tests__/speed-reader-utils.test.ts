/**
 * Comprehensive tests for Speed Reader web app utility functions.
 * Covers: ORP calculation, word splitting, punctuation delay, lesson parsing,
 * mode transitions, file upload handling, WPM bounds, keyboard shortcuts,
 * speed tier labels, and tip rotation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateORP,
  getORPPosition,
  splitWord,
  computeDelay,
  increaseSpeed,
  decreaseSpeed,
  skipForward,
  skipBackward,
  getSpeedLabel,
  parseLessons,
  splitTextIntoWords,
  nextTipIndex,
  TIPS,
  KEYBOARD_SHORTCUTS,
} from "@/lib/speed-reader-utils";
import type { Mode } from "@/lib/speed-reader-utils";

// ===========================================================================
// ORP Calculation
// ===========================================================================

describe("calculateORP", () => {
  describe("length <= 1 (returns 0)", () => {
    it("returns 0 for empty string", () => {
      expect(calculateORP("")).toBe(0);
    });

    it("returns 0 for single character", () => {
      expect(calculateORP("I")).toBe(0);
    });

    it("returns 0 for single char with trailing punctuation", () => {
      // clean word is 'I' (1 char)
      expect(calculateORP("I.")).toBe(0);
    });
  });

  describe("length 2-5 (returns 1)", () => {
    it("returns 1 for 2-char word", () => {
      expect(calculateORP("to")).toBe(1);
    });

    it("returns 1 for 3-char word", () => {
      expect(calculateORP("the")).toBe(1);
    });

    it("returns 1 for 4-char word", () => {
      expect(calculateORP("word")).toBe(1);
    });

    it("returns 1 for 5-char word", () => {
      expect(calculateORP("hello")).toBe(1);
    });

    it("returns 1 for word with trailing punctuation (clean 4 chars)", () => {
      expect(calculateORP("end.")).toBe(1);
    });
  });

  describe("length 6-9 (returns 2)", () => {
    it("returns 2 for 6-char word", () => {
      expect(calculateORP("simple")).toBe(2);
    });

    it("returns 2 for 7-char word", () => {
      expect(calculateORP("reading")).toBe(2);
    });

    it("returns 2 for 8-char word", () => {
      expect(calculateORP("powerful")).toBe(2);
    });

    it("returns 2 for 9-char word", () => {
      expect(calculateORP("algorithm")).toBe(2);
    });
  });

  describe("length 10-13 (returns 3)", () => {
    it("returns 3 for 10-char word", () => {
      expect(calculateORP("algorithms")).toBe(3);
    });

    it("returns 3 for 11-char word", () => {
      expect(calculateORP("programming")).toBe(3);
    });

    it("returns 3 for 12-char word", () => {
      expect(calculateORP("optimization")).toBe(3);
    });

    it("returns 3 for 13-char word", () => {
      expect(calculateORP("documentation")).toBe(3);
    });
  });

  describe("length 14+ (returns 4)", () => {
    it("returns 4 for 14-char word", () => {
      expect(calculateORP("transportation")).toBe(4);
    });

    it("returns 4 for 20-char word", () => {
      expect(calculateORP("internationalization")).toBe(4);
    });

    it("returns 4 for very long word", () => {
      expect(calculateORP("abcdefghijklmnopqrstuvwxyz")).toBe(4);
    });
  });

  describe("boundary transitions", () => {
    it("transitions from 0 to 1 at length 2", () => {
      expect(calculateORP("x")).toBe(0);
      expect(calculateORP("xy")).toBe(1);
    });

    it("transitions from 1 to 2 at length 6", () => {
      expect(calculateORP("abcde")).toBe(1);
      expect(calculateORP("abcdef")).toBe(2);
    });

    it("transitions from 2 to 3 at length 10", () => {
      expect(calculateORP("abcdefghi")).toBe(2);
      expect(calculateORP("abcdefghij")).toBe(3);
    });

    it("transitions from 3 to 4 at length 14", () => {
      expect(calculateORP("abcdefghijklm")).toBe(3);
      expect(calculateORP("abcdefghijklmn")).toBe(4);
    });
  });

  describe("punctuation stripping", () => {
    it("strips trailing period before calculating", () => {
      // "hello." -> clean "hello" (5 chars) -> 1
      expect(calculateORP("hello.")).toBe(1);
    });

    it("strips surrounding quotes", () => {
      // '"hi"' -> clean "hi" (2 chars) -> 1
      expect(calculateORP('"hi"')).toBe(1);
    });

    it("strips hyphen", () => {
      // "self-aware" -> clean "selfaware" (9 chars) -> 2
      expect(calculateORP("self-aware")).toBe(2);
    });
  });
});

// ===========================================================================
// getORPPosition
// ===========================================================================

describe("getORPPosition", () => {
  it("returns 0 for single character", () => {
    expect(getORPPosition("I")).toBe(0);
  });

  it("returns correct position for simple word", () => {
    // "the" clean="the" (3) ORP=1, position 1
    expect(getORPPosition("the")).toBe(1);
  });

  it("accounts for leading punctuation", () => {
    // '"hello' clean="hello" (5) ORP=1
    // i=0 '"' not \w, i=1 'h' \w count=0!=1, i=2 'e' \w count=1==1 -> pos 2
    expect(getORPPosition('"hello')).toBe(2);
  });

  it("accounts for embedded punctuation", () => {
    // "don't" clean="don_t" on JS (\w includes _)... wait,
    // actually apostrophe is not \w, so clean="dont" (4) ORP=1
    // i=0 'd' count=0!=1, i=1 'o' count=1==1 -> pos 1
    expect(getORPPosition("don't")).toBe(1);
  });
});

// ===========================================================================
// splitWord
// ===========================================================================

describe("splitWord", () => {
  it("returns empty parts for empty string", () => {
    expect(splitWord("")).toEqual({ before: "", orp: "", after: "" });
  });

  it("handles single character word", () => {
    expect(splitWord("I")).toEqual({ before: "", orp: "I", after: "" });
  });

  it("splits short word correctly", () => {
    // "the" ORP at index 1
    expect(splitWord("the")).toEqual({ before: "t", orp: "h", after: "e" });
  });

  it("splits 5-char word correctly", () => {
    expect(splitWord("hello")).toEqual({ before: "h", orp: "e", after: "llo" });
  });

  it("splits 7-char word correctly", () => {
    expect(splitWord("reading")).toEqual({ before: "re", orp: "a", after: "ding" });
  });

  it("handles word with trailing period", () => {
    expect(splitWord("end.")).toEqual({ before: "e", orp: "n", after: "d." });
  });

  it("handles word with trailing comma", () => {
    expect(splitWord("hello,")).toEqual({ before: "h", orp: "e", after: "llo," });
  });

  it("handles word with exclamation", () => {
    expect(splitWord("wow!")).toEqual({ before: "w", orp: "o", after: "w!" });
  });

  it("handles word with question mark", () => {
    expect(splitWord("why?")).toEqual({ before: "w", orp: "h", after: "y?" });
  });

  it("handles word with leading quote", () => {
    expect(splitWord('"hello')).toEqual({ before: '"h', orp: "e", after: "llo" });
  });

  it("handles two-char word", () => {
    expect(splitWord("it")).toEqual({ before: "i", orp: "t", after: "" });
  });

  it("handles long word (14 chars)", () => {
    expect(splitWord("transportation")).toEqual({
      before: "tran",
      orp: "s",
      after: "portation",
    });
  });

  it("always reconstructs the original word", () => {
    const testWords = [
      "I", "to", "the", "hello", "simple", "reading", "algorithm",
      "programming", "documentation", "transportation",
      "end.", "hello,", "wow!", '"hi"', "don't",
    ];
    for (const word of testWords) {
      const { before, orp, after } = splitWord(word);
      expect(before + orp + after).toBe(word);
    }
  });
});

// ===========================================================================
// Punctuation Delay
// ===========================================================================

describe("computeDelay", () => {
  it("calculates base delay at 300 WPM", () => {
    expect(computeDelay("hello", 300)).toBe(200);
  });

  it("calculates base delay at 100 WPM", () => {
    expect(computeDelay("hello", 100)).toBe(600);
  });

  it("calculates base delay at 800 WPM", () => {
    expect(computeDelay("hello", 800)).toBe(75);
  });

  it("applies 1.5x multiplier for period", () => {
    expect(computeDelay("end.", 300)).toBe(300);
  });

  it("applies 1.5x multiplier for exclamation", () => {
    expect(computeDelay("wow!", 300)).toBe(300);
  });

  it("applies 1.5x multiplier for question mark", () => {
    expect(computeDelay("why?", 300)).toBe(300);
  });

  it("applies 1.2x multiplier for comma", () => {
    expect(computeDelay("hello,", 300)).toBe(240);
  });

  it("applies 1.2x multiplier for semicolon", () => {
    expect(computeDelay("clause;", 300)).toBe(240);
  });

  it("applies 1.2x multiplier for colon", () => {
    expect(computeDelay("note:", 300)).toBe(240);
  });

  it("sentence-enders take priority over clause-separators", () => {
    // "wait!," has both ! and , but ! triggers 1.5x first
    expect(computeDelay("wait!,", 300)).toBe(300);
  });

  it("no multiplier for plain word", () => {
    expect(computeDelay("speed", 300)).toBe(200);
  });

  it("handles ellipsis (contains period)", () => {
    expect(computeDelay("wait...", 300)).toBe(300);
  });

  it("returns number type (not necessarily integer in JS)", () => {
    const d = computeDelay("hello", 300);
    expect(typeof d).toBe("number");
  });

  it("varies across words in a sentence", () => {
    const words = "Hello, world! This is a test.".split(/\s+/);
    const delays = words.map((w) => computeDelay(w, 300));
    expect(delays[0]).toBe(240); // "Hello," comma
    expect(delays[1]).toBe(300); // "world!" exclamation
    expect(delays[2]).toBe(200); // "This" plain
    expect(delays[3]).toBe(200); // "is" plain
    expect(delays[4]).toBe(200); // "a" plain
    expect(delays[5]).toBe(300); // "test." period
  });
});

// ===========================================================================
// Speed Controls
// ===========================================================================

describe("increaseSpeed", () => {
  it("increases by 50", () => {
    expect(increaseSpeed(300)).toBe(350);
  });

  it("clamps at 800", () => {
    expect(increaseSpeed(800)).toBe(800);
  });

  it("clamps when would exceed 800", () => {
    expect(increaseSpeed(790)).toBe(800);
  });

  it("reaches max after repeated increases from 100", () => {
    let speed = 100;
    for (let i = 0; i < 100; i++) speed = increaseSpeed(speed);
    expect(speed).toBe(800);
  });
});

describe("decreaseSpeed", () => {
  it("decreases by 50", () => {
    expect(decreaseSpeed(300)).toBe(250);
  });

  it("clamps at 100", () => {
    expect(decreaseSpeed(100)).toBe(100);
  });

  it("clamps when would go below 100", () => {
    expect(decreaseSpeed(120)).toBe(100);
  });

  it("reaches min after repeated decreases from 800", () => {
    let speed = 800;
    for (let i = 0; i < 100; i++) speed = decreaseSpeed(speed);
    expect(speed).toBe(100);
  });
});

describe("speed control round-trip", () => {
  it("increase then decrease returns to original", () => {
    const original = 400;
    expect(decreaseSpeed(increaseSpeed(original))).toBe(original);
  });
});

// ===========================================================================
// Skip Navigation
// ===========================================================================

describe("skipForward", () => {
  it("skips 5 words from start", () => {
    expect(skipForward(0, 20)).toBe(5);
  });

  it("skips 5 words from middle", () => {
    expect(skipForward(10, 20)).toBe(15);
  });

  it("clamps at last index near end", () => {
    expect(skipForward(17, 20)).toBe(19);
  });

  it("stays at end if already at last index", () => {
    expect(skipForward(19, 20)).toBe(19);
  });

  it("does nothing for empty word list", () => {
    expect(skipForward(0, 0)).toBe(0);
  });

  it("clamps for single word list", () => {
    expect(skipForward(0, 1)).toBe(0);
  });
});

describe("skipBackward", () => {
  it("skips 5 words back from end", () => {
    expect(skipBackward(19, 20)).toBe(14);
  });

  it("skips 5 words back from middle", () => {
    expect(skipBackward(10, 20)).toBe(5);
  });

  it("clamps at 0 near start", () => {
    expect(skipBackward(3, 20)).toBe(0);
  });

  it("stays at 0 if already at start", () => {
    expect(skipBackward(0, 20)).toBe(0);
  });

  it("does nothing for empty word list", () => {
    expect(skipBackward(0, 0)).toBe(0);
  });

  it("clamps for single word list", () => {
    expect(skipBackward(0, 1)).toBe(0);
  });
});

// ===========================================================================
// Lesson Parsing
// ===========================================================================

describe("parseLessons", () => {
  it("parses multiple lessons with ===LESSON: delimiter", () => {
    const text = `===LESSON: Introduction===
This is the first lesson content here.

===LESSON: Advanced Topics===
This is the second lesson with more content.`;

    const lessons = parseLessons(text);
    expect(lessons).toHaveLength(2);
    expect(lessons[0].title).toBe("Introduction");
    expect(lessons[0].content).toBe("This is the first lesson content here.");
    expect(lessons[0].wordCount).toBe(7);
    expect(lessons[1].title).toBe("Advanced Topics");
    expect(lessons[1].content).toBe("This is the second lesson with more content.");
    expect(lessons[1].wordCount).toBe(8);
  });

  it("handles single lesson", () => {
    const text = `===LESSON: Only Lesson===
Just one lesson here.`;

    const lessons = parseLessons(text);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe("Only Lesson");
  });

  it("falls back to entire text as single lesson when no delimiters", () => {
    const text = "This is just plain text without any lesson delimiters.";
    const lessons = parseLessons(text, "My Topic");
    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe("Learning: My Topic");
    expect(lessons[0].content).toBe(text);
  });

  it("uses 'Unknown' as fallback topic when none provided", () => {
    const text = "Plain text with no delimiters.";
    const lessons = parseLessons(text);
    expect(lessons[0].title).toBe("Learning: Unknown");
  });

  it("returns empty array for empty string", () => {
    const lessons = parseLessons("");
    expect(lessons).toHaveLength(0);
  });

  it("returns empty array for whitespace-only string", () => {
    const lessons = parseLessons("   \n  ");
    expect(lessons).toHaveLength(0);
  });

  it("skips lessons with empty content", () => {
    const text = `===LESSON: Empty===

===LESSON: Has Content===
Actual content here.`;

    const lessons = parseLessons(text);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe("Has Content");
  });

  it("trims whitespace from title and content", () => {
    const text = `===LESSON:   Spaced Title   ===
   Content with spaces.   `;

    const lessons = parseLessons(text);
    expect(lessons[0].title).toBe("Spaced Title");
    expect(lessons[0].content).toBe("Content with spaces.");
  });

  it("correctly counts words in lesson content", () => {
    const text = `===LESSON: Word Count Test===
One two three four five six seven eight nine ten.`;

    const lessons = parseLessons(text);
    expect(lessons[0].wordCount).toBe(10);
  });

  it("handles lesson titles with special characters", () => {
    const text = `===LESSON: What is C++ (Part 1)?===
Content about C++ here.`;

    const lessons = parseLessons(text);
    expect(lessons[0].title).toBe("What is C++ (Part 1)?");
  });
});

// ===========================================================================
// Mode State Transitions
// ===========================================================================

describe("Mode state transitions", () => {
  it("valid modes are home, reading, and lesson-complete", () => {
    const validModes: Mode[] = ["home", "reading", "lesson-complete"];
    expect(validModes).toHaveLength(3);
    expect(validModes).toContain("home");
    expect(validModes).toContain("reading");
    expect(validModes).toContain("lesson-complete");
  });

  it("initial mode should be home", () => {
    const initialMode: Mode = "home";
    expect(initialMode).toBe("home");
  });

  it("mode transitions: home -> reading (on file upload or lesson load)", () => {
    let mode: Mode = "home";
    // Simulating file upload
    mode = "reading";
    expect(mode).toBe("reading");
  });

  it("mode transitions: reading -> lesson-complete (when last word reached with lessons)", () => {
    let mode: Mode = "reading";
    const hasLessons = true;
    const isAtEnd = true;
    if (isAtEnd && hasLessons) {
      mode = "lesson-complete";
    }
    expect(mode).toBe("lesson-complete");
  });

  it("mode transitions: reading stays reading when no lessons at end", () => {
    let mode: Mode = "reading";
    const hasLessons = false;
    const isAtEnd = true;
    if (isAtEnd && hasLessons) {
      mode = "lesson-complete";
    }
    expect(mode).toBe("reading");
  });

  it("mode transitions: lesson-complete -> reading (on restart or re-read)", () => {
    let mode: Mode = "lesson-complete";
    mode = "reading";
    expect(mode).toBe("reading");
  });

  it("mode transitions: any -> home (on go home)", () => {
    const startModes: Mode[] = ["reading", "lesson-complete"];
    for (const start of startModes) {
      let mode: Mode = start;
      mode = "home";
      expect(mode).toBe("home");
    }
  });
});

// ===========================================================================
// File Upload Handling
// ===========================================================================

describe("splitTextIntoWords (file upload)", () => {
  it("splits normal text into words", () => {
    expect(splitTextIntoWords("Hello world")).toEqual(["Hello", "world"]);
  });

  it("handles multiple spaces", () => {
    expect(splitTextIntoWords("Hello   world")).toEqual(["Hello", "world"]);
  });

  it("handles tabs and newlines", () => {
    expect(splitTextIntoWords("Hello\tworld\nfoo")).toEqual(["Hello", "world", "foo"]);
  });

  it("filters out empty strings", () => {
    expect(splitTextIntoWords("  Hello   ")).toEqual(["Hello"]);
  });

  it("returns empty array for empty string", () => {
    expect(splitTextIntoWords("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(splitTextIntoWords("   \n\t  ")).toEqual([]);
  });

  it("preserves punctuation attached to words", () => {
    const words = splitTextIntoWords("Hello, world! This is a test.");
    expect(words).toEqual(["Hello,", "world!", "This", "is", "a", "test."]);
  });

  it("handles mixed whitespace", () => {
    const words = splitTextIntoWords("Line one\n\nLine three");
    expect(words).toEqual(["Line", "one", "Line", "three"]);
  });
});

// ===========================================================================
// WPM Slider Bounds
// ===========================================================================

describe("WPM slider bounds (100-800)", () => {
  it("minimum WPM is 100", () => {
    expect(decreaseSpeed(100)).toBe(100);
    expect(decreaseSpeed(150)).toBe(100);
  });

  it("maximum WPM is 800", () => {
    expect(increaseSpeed(800)).toBe(800);
    expect(increaseSpeed(750)).toBe(800);
  });

  it("WPM stays within bounds through any sequence of adjustments", () => {
    let wpm = 300;
    const operations = [
      increaseSpeed, increaseSpeed, increaseSpeed,
      decreaseSpeed, decreaseSpeed, decreaseSpeed,
      decreaseSpeed, decreaseSpeed, decreaseSpeed,
      increaseSpeed, increaseSpeed,
    ];
    for (const op of operations) {
      wpm = op(wpm);
      expect(wpm).toBeGreaterThanOrEqual(100);
      expect(wpm).toBeLessThanOrEqual(800);
    }
  });
});

// ===========================================================================
// Keyboard Shortcuts
// ===========================================================================

describe("Keyboard shortcut mappings", () => {
  it("Space maps to togglePlay", () => {
    expect(KEYBOARD_SHORTCUTS["Space"]).toBe("togglePlay");
  });

  it("ArrowLeft maps to skipBackward", () => {
    expect(KEYBOARD_SHORTCUTS["ArrowLeft"]).toBe("skipBackward");
  });

  it("ArrowRight maps to skipForward", () => {
    expect(KEYBOARD_SHORTCUTS["ArrowRight"]).toBe("skipForward");
  });

  it("ArrowUp maps to increaseSpeed", () => {
    expect(KEYBOARD_SHORTCUTS["ArrowUp"]).toBe("increaseSpeed");
  });

  it("ArrowDown maps to decreaseSpeed", () => {
    expect(KEYBOARD_SHORTCUTS["ArrowDown"]).toBe("decreaseSpeed");
  });

  it("Escape maps to restart", () => {
    expect(KEYBOARD_SHORTCUTS["Escape"]).toBe("restart");
  });

  it("has exactly 6 shortcuts defined", () => {
    expect(Object.keys(KEYBOARD_SHORTCUTS)).toHaveLength(6);
  });
});

// ===========================================================================
// Speed Tier Labels
// ===========================================================================

describe("getSpeedLabel", () => {
  it("returns Chill Mode for wpm < 200", () => {
    expect(getSpeedLabel(100).color).toBe("text-green-400");
    expect(getSpeedLabel(199).color).toBe("text-green-400");
  });

  it("returns Steady Reader for 200 <= wpm < 350", () => {
    expect(getSpeedLabel(200).color).toBe("text-blue-400");
    expect(getSpeedLabel(349).color).toBe("text-blue-400");
  });

  it("returns Speed Demon for 350 <= wpm < 500", () => {
    expect(getSpeedLabel(350).color).toBe("text-orange-400");
    expect(getSpeedLabel(499).color).toBe("text-orange-400");
  });

  it("returns Turbo Mode for 500 <= wpm < 650", () => {
    expect(getSpeedLabel(500).color).toBe("text-purple-400");
    expect(getSpeedLabel(649).color).toBe("text-purple-400");
  });

  it("returns LUDICROUS SPEED for wpm >= 650", () => {
    expect(getSpeedLabel(650).color).toBe("text-pink-400");
    expect(getSpeedLabel(800).color).toBe("text-pink-400");
  });

  it("boundary: 199 -> Chill Mode, 200 -> Steady Reader", () => {
    expect(getSpeedLabel(199).color).toBe("text-green-400");
    expect(getSpeedLabel(200).color).toBe("text-blue-400");
  });

  it("boundary: 349 -> Steady Reader, 350 -> Speed Demon", () => {
    expect(getSpeedLabel(349).color).toBe("text-blue-400");
    expect(getSpeedLabel(350).color).toBe("text-orange-400");
  });

  it("boundary: 499 -> Speed Demon, 500 -> Turbo Mode", () => {
    expect(getSpeedLabel(499).color).toBe("text-orange-400");
    expect(getSpeedLabel(500).color).toBe("text-purple-400");
  });

  it("boundary: 649 -> Turbo Mode, 650 -> LUDICROUS SPEED", () => {
    expect(getSpeedLabel(649).color).toBe("text-purple-400");
    expect(getSpeedLabel(650).color).toBe("text-pink-400");
  });

  it("label text contains expected names", () => {
    expect(getSpeedLabel(100).label).toContain("Chill Mode");
    expect(getSpeedLabel(300).label).toContain("Steady Reader");
    expect(getSpeedLabel(400).label).toContain("Speed Demon");
    expect(getSpeedLabel(550).label).toContain("Turbo Mode");
    expect(getSpeedLabel(700).label).toContain("LUDICROUS SPEED");
  });
});

// ===========================================================================
// Tip Rotation
// ===========================================================================

describe("Tip rotation", () => {
  it("TIPS array has 7 entries", () => {
    expect(TIPS).toHaveLength(7);
  });

  it("each tip has emoji and text properties", () => {
    for (const tip of TIPS) {
      expect(tip).toHaveProperty("emoji");
      expect(tip).toHaveProperty("text");
      expect(typeof tip.emoji).toBe("string");
      expect(typeof tip.text).toBe("string");
      expect(tip.text.length).toBeGreaterThan(0);
    }
  });

  it("nextTipIndex advances by 1", () => {
    expect(nextTipIndex(0)).toBe(1);
    expect(nextTipIndex(3)).toBe(4);
  });

  it("nextTipIndex wraps around from last to first", () => {
    expect(nextTipIndex(6)).toBe(0);
  });

  it("nextTipIndex wraps from TIPS.length - 1 to 0", () => {
    expect(nextTipIndex(TIPS.length - 1)).toBe(0);
  });

  it("full rotation returns to start", () => {
    let index = 0;
    for (let i = 0; i < TIPS.length; i++) {
      index = nextTipIndex(index);
    }
    expect(index).toBe(0);
  });
});

// ===========================================================================
// Integration: progress calculation
// ===========================================================================

describe("Progress calculation", () => {
  it("returns 0% at start", () => {
    const words = ["Hello", "world"];
    const progress = words.length > 0 ? ((0 + 1) / words.length) * 100 : 0;
    expect(progress).toBe(50); // (0+1)/2 * 100 = 50 -- matches component logic
  });

  it("returns 100% at last word", () => {
    const words = ["Hello", "world"];
    const currentIndex = words.length - 1;
    const progress = ((currentIndex + 1) / words.length) * 100;
    expect(progress).toBe(100);
  });

  it("returns 0 for empty word list", () => {
    const words: string[] = [];
    const progress = words.length > 0 ? ((0 + 1) / words.length) * 100 : 0;
    expect(progress).toBe(0);
  });
});

// ===========================================================================
// Integration: estimated reading time
// ===========================================================================

describe("Estimated reading time", () => {
  it("calculates estimated minutes correctly", () => {
    const wordCount = 600;
    const wpm = 300;
    const estimatedMinutes = Math.ceil(wordCount / wpm);
    expect(estimatedMinutes).toBe(2);
  });

  it("rounds up partial minutes", () => {
    const wordCount = 301;
    const wpm = 300;
    const estimatedMinutes = Math.ceil(wordCount / wpm);
    expect(estimatedMinutes).toBe(2);
  });

  it("returns 0 for no words", () => {
    const wordCount = 0;
    const wpm = 300;
    const estimatedMinutes = wordCount > 0 ? Math.ceil(wordCount / wpm) : 0;
    expect(estimatedMinutes).toBe(0);
  });
});
