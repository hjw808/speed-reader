/**
 * Pure utility functions extracted from the SpeedReader component
 * for independent testing. These mirror the logic in speed-reader.tsx exactly.
 */

// ---- Tips data ----
export const TIPS = [
  { emoji: "\u{1F9E0}", text: "Your brain processes the red letter first - it's the Optimal Recognition Point!" },
  { emoji: "\u{1F440}", text: "No more eye gymnastics! Words come to YOU now." },
  { emoji: "\u{1F680}", text: "Start at 300 WPM, then go full speed demon when ready." },
  { emoji: "\u23F8\uFE0F", text: "Hit SPACE to pause - your brain needs snack breaks too." },
  { emoji: "\u{1F3AF}", text: "The red letter is where your eye naturally wants to look. Science!" },
  { emoji: "\u2615", text: "Reading at 500+ WPM? You're basically a superhero now." },
  { emoji: "\u{1F3AE}", text: "Use arrow keys like a pro gamer. \u2190 \u2192 to skip, \u2191 \u2193 for speed." },
];

// ---- ORP Calculation ----

/**
 * Calculate the Optimal Recognition Point (ORP) index for a clean word.
 * The ORP is slightly left of center - where the eye naturally focuses.
 */
export function calculateORP(word: string): number {
  const cleanWord = word.replace(/[^\w]/g, "");
  const length = cleanWord.length;
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

/**
 * Get the actual character position of the ORP in the original word
 * (accounting for punctuation characters that are skipped).
 */
export function getORPPosition(word: string): number {
  const cleanWord = word.replace(/[^\w]/g, "");
  const orpIndex = calculateORP(cleanWord);
  let actualORP = 0;
  let letterCount = 0;
  for (let i = 0; i < word.length; i++) {
    if (/\w/.test(word[i])) {
      if (letterCount === orpIndex) {
        actualORP = i;
        break;
      }
      letterCount++;
    }
  }
  return actualORP;
}

/**
 * Split a word into three parts around its ORP character.
 */
export function splitWord(word: string): { before: string; orp: string; after: string } {
  if (!word) return { before: "", orp: "", after: "" };
  const orpPos = getORPPosition(word);
  return {
    before: word.slice(0, orpPos),
    orp: word[orpPos] || "",
    after: word.slice(orpPos + 1),
  };
}

// ---- Delay / Timing ----

/**
 * Calculate the display delay (in ms) for a word given the current WPM.
 * Punctuation at sentence-ends (.!?) gets a 1.5x multiplier,
 * clause-separators (,;:) get a 1.2x multiplier.
 */
export function computeDelay(word: string, wpm: number): number {
  let baseDelay = 60000 / wpm;
  if (/[.!?]/.test(word)) baseDelay *= 1.5;
  else if (/[,;:]/.test(word)) baseDelay *= 1.2;
  return baseDelay;
}

// ---- Speed Controls ----

export function increaseSpeed(current: number): number {
  return Math.min(800, current + 50);
}

export function decreaseSpeed(current: number): number {
  return Math.max(100, current - 50);
}

// ---- Skip Navigation ----

export function skipForward(currentIndex: number, wordCount: number): number {
  if (wordCount > 0) {
    return Math.min(wordCount - 1, currentIndex + 5);
  }
  return currentIndex;
}

export function skipBackward(currentIndex: number, wordCount: number): number {
  if (wordCount > 0) {
    return Math.max(0, currentIndex - 5);
  }
  return currentIndex;
}

// ---- Speed Label ----

export function getSpeedLabel(wpm: number): { label: string; color: string } {
  if (wpm < 200) return { label: "Chill Mode \u{1F422}", color: "text-green-400" };
  if (wpm < 350) return { label: "Steady Reader \u{1F4D6}", color: "text-blue-400" };
  if (wpm < 500) return { label: "Speed Demon \u{1F525}", color: "text-orange-400" };
  if (wpm < 650) return { label: "Turbo Mode \u{1F680}", color: "text-purple-400" };
  return { label: "LUDICROUS SPEED \u{1F4A5}", color: "text-pink-400" };
}

// ---- Lesson Parsing ----

export interface Lesson {
  title: string;
  content: string;
  wordCount: number;
}

/**
 * Parse AI-generated text into individual lessons using the
 * ===LESSON: [Title]=== delimiter pattern.
 */
export function parseLessons(fullText: string, fallbackTopic?: string): Lesson[] {
  const lessonRegex = /===LESSON:\s*(.+?)===\s*([\s\S]*?)(?====LESSON:|$)/g;
  const parsedLessons: Lesson[] = [];
  let match;

  while ((match = lessonRegex.exec(fullText)) !== null) {
    const title = match[1].trim();
    const content = match[2].trim();
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    if (content.length > 0) {
      parsedLessons.push({ title, content, wordCount });
    }
  }

  if (parsedLessons.length === 0 && fullText.trim().length > 0) {
    const content = fullText.trim();
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    parsedLessons.push({
      title: `Learning: ${fallbackTopic || "Unknown"}`,
      content,
      wordCount,
    });
  }

  return parsedLessons;
}

// ---- File upload word splitting ----

/**
 * Split uploaded text content into words (same logic as the component).
 */
export function splitTextIntoWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

// ---- Tip rotation ----

/**
 * Get the next tip index given the current one (wraps around).
 */
export function nextTipIndex(current: number): number {
  return (current + 1) % TIPS.length;
}

// ---- Keyboard shortcut mapping ----

export const KEYBOARD_SHORTCUTS: Record<string, string> = {
  Space: "togglePlay",
  ArrowLeft: "skipBackward",
  ArrowRight: "skipForward",
  ArrowUp: "increaseSpeed",
  ArrowDown: "decreaseSpeed",
  Escape: "restart",
};

// ---- Mode types ----

export type Mode = "home" | "reading" | "lesson-complete";
