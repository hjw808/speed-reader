"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  RotateCcw,
  Upload,
  Zap,
  Brain,
  Eye,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Download,
  BookOpen,
  Wand2,
  Loader2,
} from "lucide-react";
import {
  TIPS,
  splitWord,
  computeDelay,
  parseLessons,
  getSpeedLabel,
  type Lesson,
  type Mode,
} from "@/lib/speed-reader-utils";

// Puter.js types
declare global {
  interface Window {
    puter?: {
      auth: {
        isSignedIn: () => boolean;
        signIn: () => Promise<unknown>;
      };
      ai: {
        chat: (
          prompt: string,
          options?: { stream?: boolean; model?: string }
        ) => Promise<unknown>;
      };
    };
  }
}

const STYLE_PRESETS = [
  { id: "eli5", label: "Explain like I'm 5", description: "Simple, fun, no jargon", emoji: "💖" },
  { id: "summary", label: "Quick summary", description: "Just the key points", emoji: "⚡" },
  { id: "technical", label: "Technical deep-dive", description: "Detailed and precise", emoji: "🔬" },
  { id: "examples", label: "With examples", description: "Learn by seeing it in action", emoji: "💡" },
];

const WORD_OPTIONS = [50, 100, 150, 200, 300];

export function SpeedReader() {
  // Content state
  const [words, setWords] = useState<string[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [mode, setMode] = useState<Mode>("home");

  // Generator state
  const [topic, setTopic] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [style, setStyle] = useState("eli5");
  const [wordsPerLesson, setWordsPerLesson] = useState(200);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState("");

  // UI state
  const [currentTip, setCurrentTip] = useState(0);
  const [showGenerator, setShowGenerator] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load Puter.js script
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("puter-script")) {
      const script = document.createElement("script");
      script.id = "puter-script";
      script.src = "https://js.puter.com/v2/";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const currentWord = words[currentIndex] || "";
  const { before, orp, after } = splitWord(currentWord);
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  const currentLesson = lessons[currentLessonIndex];

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const newWords = text.split(/\s+/).filter((w) => w.length > 0);
      setWords(newWords);
      setLessons([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setFileName(file.name);
      setMode("reading");
      setShowGenerator(false);
          };
    reader.readAsText(file);

    // Reset input so same file can be uploaded again
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const newWords = text.split(/\s+/).filter((w) => w.length > 0);
        setWords(newWords);
        setLessons([]);
        setCurrentIndex(0);
        setIsPlaying(false);
        setFileName(file.name);
        setMode("reading");
        setShowGenerator(false);
              };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // Helper to extract text from various Puter response formats
  const extractTextFromResponse = (response: unknown): string => {
    if (typeof response === "string") return response;
    if (response && typeof response === "object") {
      const obj = response as Record<string, unknown>;
      // Try common response properties
      if (typeof obj.message === "string") return obj.message;
      if (typeof obj.text === "string") return obj.text;
      if (typeof obj.content === "string") return obj.content;
      if (typeof obj.response === "string") return obj.response;
      // If it has a toString that's not the default object one
      if (obj.toString && obj.toString() !== "[object Object]") return obj.toString();
    }
    return String(response || "");
  };

  // Generate lessons with AI
  const generateLessons = async () => {
    if (!topic.trim() || !learningGoals.trim()) {
      setGenerationError("Please fill in both the topic and learning goals.");
      return;
    }

    if (!window.puter) {
      setGenerationError("AI is still loading. Please wait a moment and try again.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress("Starting generation...");

    const styleDescriptions: Record<string, string> = {
      eli5: "Explain in very simple terms, like explaining to a 5-year-old. Use analogies and fun comparisons. No jargon.",
      summary: "Give concise, to-the-point explanations. Focus only on the essential information.",
      technical: "Provide detailed, technically accurate explanations. Include proper terminology and precise details.",
      examples: "Explain concepts primarily through practical examples. Show how things work in practice.",
    };

    const prompt = `You are creating a series of short lessons for a speed reading app. The user wants to learn about:

TOPIC: ${topic}

SPECIFIC THINGS TO LEARN: ${learningGoals}

STYLE: ${styleDescriptions[style]}

IMPORTANT RULES:
- Create separate lessons, one for each concept/goal mentioned
- Each lesson MUST be approximately ${wordsPerLesson} words (can be slightly under, never over)
- Each lesson should be self-contained and focused on ONE concept
- Use clear, readable prose (no bullet points or lists)
- Write in a flowing, engaging style perfect for speed reading

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (this is critical):
===LESSON: [Title of Lesson 1]===
[Content of lesson 1, approximately ${wordsPerLesson} words]

===LESSON: [Title of Lesson 2]===
[Content of lesson 2, approximately ${wordsPerLesson} words]

(continue for all lessons needed)

Generate the lessons now:`;

    try {
      setGenerationProgress("Generating with AI (this may take a moment)...");

      // Use streaming for better UX
      const response = await window.puter.ai.chat(prompt, { stream: true });

      let fullText = "";

      // Check if response is async iterable (streaming)
      if (response && typeof response === "object" && Symbol.asyncIterator in response) {
        const stream = response as AsyncIterable<{ text?: string }>;
        for await (const chunk of stream) {
          if (chunk?.text) {
            fullText += chunk.text;
            // Update progress with word count
            const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
            setGenerationProgress(`Generating... (${wordCount} words so far)`);
          }
        }
      } else {
        // Non-streaming response
        fullText = extractTextFromResponse(response);
      }

      // Parse lessons from response
      const parsedLessons = parseLessons(fullText, topic);

      if (parsedLessons.length === 0) {
        setGenerationError("No content was generated. Please try again.");
        return;
      }

      // Set state in correct order
      const firstLesson = parsedLessons[0];
      const firstLessonWords = firstLesson.content.split(/\s+/).filter((w) => w.length > 0);

      if (firstLessonWords.length === 0) {
        setGenerationError("Generated lesson has no readable content. Please try again.");
        return;
      }

      setLessons(parsedLessons);
      setCurrentLessonIndex(0);
      setWords(firstLessonWords);
      setCurrentIndex(0);
      setIsPlaying(false);
      setShowGenerator(false);
      setMode("reading");
      setGenerationProgress("");
      
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(
        "Failed to generate lessons. Make sure you're signed into Puter, then try again."
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  // Load a specific lesson into the reader
  const loadLesson = (lesson: Lesson) => {
    const newWords = lesson.content.split(/\s+/).filter((w) => w.length > 0);
    setWords(newWords);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  // Playback controls
  const togglePlay = useCallback(() => {
    if (words.length === 0) return;
    if (mode === "lesson-complete") {
      setMode("reading");
    }
    setIsPlaying((prev) => !prev);
  }, [words.length, mode]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    if (mode === "lesson-complete") {
      setMode("reading");
    }
  }, [mode]);

  const skipForward = useCallback(() => {
    if (words.length > 0) {
      setCurrentIndex((prev) => Math.min(words.length - 1, prev + 5));
    }
  }, [words.length]);

  const skipBackward = useCallback(() => {
    if (words.length > 0) {
      setCurrentIndex((prev) => Math.max(0, prev - 5));
    }
  }, [words.length]);

  const increaseSpeed = useCallback(() => {
    setWpm((prev) => Math.min(800, prev + 50));
  }, []);

  const decreaseSpeed = useCallback(() => {
    setWpm((prev) => Math.max(100, prev - 50));
  }, []);

  // Lesson navigation
  const goToNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextIndex = currentLessonIndex + 1;
      setCurrentLessonIndex(nextIndex);
      loadLesson(lessons[nextIndex]);
      setMode("reading");
    }
  };

  const goToPreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const prevIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(prevIndex);
      loadLesson(lessons[prevIndex]);
      setMode("reading");
    }
  };

  const goHome = () => {
    setMode("home");
    setWords([]);
    setLessons([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    setFileName(null);
    setShowGenerator(false);
  };

  // Download lessons
  const downloadLessons = () => {
    if (lessons.length === 0) return;

    let content = `# ${topic}\n\nGenerated Lessons\n\n`;
    lessons.forEach((lesson, index) => {
      content += `## Lesson ${index + 1}: ${lesson.title}\n\n`;
      content += `${lesson.content}\n\n`;
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.toLowerCase().replace(/\s+/g, "-")}-lessons.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showGenerator) return; // Disable shortcuts when generator is open

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skipBackward();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skipForward();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        increaseSpeed();
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        decreaseSpeed();
      } else if (e.code === "Escape") {
        e.preventDefault();
        if (showGenerator) {
          setShowGenerator(false);
        } else {
          restart();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skipBackward, skipForward, increaseSpeed, decreaseSpeed, restart, showGenerator]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const showNextWord = () => {
      setCurrentIndex((prev) => {
        if (prev >= words.length - 1) {
          setIsPlaying(false);
          if (lessons.length > 0) {
            setMode("lesson-complete");
          }
          return prev;
        }
        return prev + 1;
      });
    };

    timeoutRef.current = setTimeout(showNextWord, computeDelay(currentWord, wpm));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, currentIndex, words, wpm, currentWord, lessons.length]);

  const estimatedMinutes = words.length > 0 ? Math.ceil(words.length / wpm) : 0;

  const speedInfo = getSpeedLabel(wpm);
  const isLastLesson = currentLessonIndex >= lessons.length - 1;
  const isFirstLesson = currentLessonIndex === 0;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent cursor-pointer"
            onClick={goHome}
          >
            Speed Reader
          </h1>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            RSVP + ORP Magic
            <Zap className="w-4 h-4 text-yellow-400" />
          </p>
        </div>

        {/* Main Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* HOME MODE */}
          {mode === "home" && !showGenerator && (
            <>
              <div className="flex items-center justify-center min-h-[180px] mb-6">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">📚</div>
                  <p className="text-xl text-slate-300 mb-2">Ready to speed read?</p>
                  <p className="text-slate-500 text-sm">Upload a file or generate lessons with AI</p>
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> No eye movement</span>
                    <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Pure focus</span>
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> ADHD friendly</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />
                <div className="w-full sm:w-auto">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl px-6 py-6 text-lg border border-white/20"
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    Upload Text File
                  </Button>
                </div>
                <div className="w-full sm:w-auto flex flex-col items-center gap-2">
                  <Button
                    onClick={async () => {
                      if (window.puter && !window.puter.auth.isSignedIn()) {
                        try {
                          await window.puter.auth.signIn();
                        } catch {
                          // User closed popup — still open generator
                        }
                      }
                      setShowGenerator(true);
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl px-6 py-6 text-lg border-0"
                  >
                    <Wand2 className="w-5 h-5 mr-3" />
                    Generate with AI
                  </Button>
                  <p className="text-xs text-amber-400">
                    &#9888;&#65039; Requires a free Puter.js account (opens sign-up popup)
                  </p>
                </div>
              </div>

              {/* Puter AI signup note — collapsible */}
              <details className="group mb-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 hover:bg-amber-500/15 transition-colors">
                    <span className="text-base">⚠️</span>
                    <span className="text-amber-300 text-sm font-medium flex-1">
                      First-time AI setup — free, one-time only
                    </span>
                    <span className="text-amber-500 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-slate-300 mb-3">
                    Powered by{" "}
                    <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline font-medium">
                      Puter.js
                    </a>
                    {" "}— <span className="text-white font-medium">no API keys, no payment, no backend</span>. Just a free account.
                  </p>
                  <div className="bg-black/30 rounded-lg p-3 text-xs text-slate-400 space-y-1.5">
                    <p><span className="text-amber-400 font-bold">1.</span> Click <span className="text-white font-medium">&quot;Generate with AI&quot;</span>, fill in a topic, click &quot;Generate Lessons&quot;</p>
                    <p><span className="text-amber-400 font-bold">2.</span> A sign-up popup opens in your default browser — create your free account, then close it</p>
                    <p><span className="text-amber-400 font-bold">3.</span> <span className="text-white font-medium">Refresh this page</span> and generate again — enter the email verification code when prompted</p>
                    <p><span className="text-amber-400 font-bold">4.</span> Close the popup and wait 15–30 seconds. Done — works instantly from now on ✓</p>
                  </div>
                </div>
              </details>

              {/* Tips */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TIPS[currentTip].emoji}</span>
                  <div>
                    <p className="text-sm text-slate-300 font-medium">Pro tip</p>
                    <p className="text-slate-400 text-sm">{TIPS[currentTip].text}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* GENERATOR MODE */}
          {showGenerator && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-purple-400" />
                  Generate Lessons
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowGenerator(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., JavaScript Promises, Quantum Physics, French Revolution"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Learning Goals */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What do you want to learn?
                </label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g., What they are, how to create them, error handling, async/await, chaining promises"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Style Presets */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Explanation Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setStyle(preset.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        style === preset.id
                          ? "bg-purple-500/20 border-purple-500"
                          : "bg-slate-900/30 border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{preset.emoji}</span>
                        <span className="font-medium text-white">{preset.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Words per Lesson */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Words per Lesson: <span className="text-purple-400 font-bold">~{wordsPerLesson}</span>
                </label>
                <div className="flex gap-2">
                  {WORD_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setWordsPerLesson(option)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        wordsPerLesson === option
                          ? "bg-purple-500 text-white"
                          : "bg-slate-900/50 text-slate-400 hover:text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {generationError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm">
                  {generationError}
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={generateLessons}
                disabled={isGenerating || !topic.trim() || !learningGoals.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl py-6 text-lg border-0 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {generationProgress || "Generating Lessons..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Lessons
                  </>
                )}
              </Button>
            </div>
          )}

          {/* READING MODE */}
          {mode === "reading" && (
            <>
              {/* Lesson Header */}
              {lessons.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-400">
                      Lesson {currentLessonIndex + 1} of {lessons.length}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-purple-300">{currentLesson?.title}</h3>
                </div>
              )}

              {/* Word Display */}
              <div className="flex items-center justify-center min-h-[180px] mb-6 relative">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center blur-2xl opacity-30">
                    <span className="text-6xl md:text-7xl lg:text-8xl font-mono font-black text-pink-500">
                      {currentWord}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-center font-mono text-5xl md:text-6xl lg:text-7xl font-black tracking-tight">
                    <span className="text-white">{before}</span>
                    <span className="text-transparent bg-gradient-to-b from-red-400 to-pink-600 bg-clip-text drop-shadow-[0_0_20px_rgba(255,100,100,0.8)]">
                      {orp}
                    </span>
                    <span className="text-white">{after}</span>
                  </div>
                </div>
              </div>

              {/* Focus Line */}
              <div className="w-64 h-0.5 mx-auto mb-6 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Word {currentIndex + 1}</span>
                  <span>{Math.round(progress)}%</span>
                  <span>{words.length} total</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-150 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Lesson Navigation (during reading) */}
              {lessons.length > 1 && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={isFirstLesson}
                    className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev Lesson
                  </Button>
                  <div className="flex items-center gap-2">
                    {lessons.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentLessonIndex(index);
                          loadLesson(lessons[index]);
                          setMode("reading");
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index < currentLessonIndex
                            ? "bg-green-500"
                            : index === currentLessonIndex
                            ? "bg-purple-500 ring-2 ring-purple-300"
                            : "bg-slate-600"
                        }`}
                        title={lessons[index].title}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={goToNextLesson}
                    disabled={isLastLesson}
                    className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl disabled:opacity-30"
                  >
                    Next Lesson
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <Button
                  variant="outline"
                  onClick={goHome}
                  className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Home
                </Button>
                <Button
                  onClick={togglePlay}
                  className={`rounded-xl px-6 ${
                    isPlaying
                      ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  } text-white border-0`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {currentIndex > 0 ? "Resume" : "Start"}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={restart}
                  className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
              </div>

              {/* Speed Control */}
              <div className="bg-slate-900/50 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-sm">Speed</span>
                  <span className={`text-sm font-medium ${speedInfo.color}`}>{speedInfo.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 text-xs w-8">100</span>
                  <Slider
                    value={[wpm]}
                    onValueChange={([value]) => setWpm(value)}
                    min={100}
                    max={800}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-slate-500 text-xs w-8">800</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {wpm}
                  </span>
                  <span className="text-slate-500 text-sm ml-1">WPM</span>
                </div>
              </div>

              {/* Info */}
              <div className="text-center text-slate-400 text-sm">
                {fileName && <span className="text-purple-400">{fileName}</span>}
                {fileName && <span className="mx-2">•</span>}
                <span>~{estimatedMinutes} min remaining</span>
              </div>
            </>
          )}

          {/* LESSON COMPLETE MODE */}
          {mode === "lesson-complete" && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">Lesson Complete!</h2>
              {currentLesson && (
                <p className="text-slate-400 mb-6">
                  You finished: <span className="text-white">{currentLesson.title}</span>
                </p>
              )}

              {/* Lesson Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                <Button
                  variant="outline"
                  onClick={goToPreviousLesson}
                  disabled={isFirstLesson}
                  className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous Lesson
                </Button>
                {!isLastLesson ? (
                  <Button
                    onClick={goToNextLesson}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl px-6 border-0"
                  >
                    Next Lesson
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <div className="text-green-400 font-medium px-4">
                    🏆 All lessons complete!
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={restart}
                  className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Re-read Lesson
                </Button>
                {lessons.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={downloadLessons}
                    className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All Lessons
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={goHome}
                  className="bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-white rounded-xl"
                >
                  Home
                </Button>
              </div>

              {/* Lesson Progress Dots */}
              {lessons.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {lessons.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentLessonIndex(index);
                        loadLesson(lessons[index]);
                        setMode("reading");
                      }}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index < currentLessonIndex
                          ? "bg-green-500"
                          : index === currentLessonIndex
                          ? "bg-purple-500 ring-2 ring-purple-300"
                          : "bg-slate-600"
                      }`}
                      title={lessons[index].title}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts - only show in reading mode */}
        {(mode === "reading" || mode === "home") && !showGenerator && (
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
            <Shortcut keys={["Space"]} action="Play/Pause" />
            <Shortcut keys={["←", "→"]} action="Skip 5 words" />
            <Shortcut keys={["↑", "↓"]} action="Speed" />
            <Shortcut keys={["Esc"]} action="Restart" />
          </div>
        )}

        {/* How it works */}
        {mode === "home" && !showGenerator && (
          <details className="mt-8 group">
            <summary className="text-center text-slate-500 text-sm cursor-pointer hover:text-slate-300 transition-colors list-none">
              <span className="inline-flex items-center gap-2">
                <Brain className="w-4 h-4" />
                How does this work?
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </span>
            </summary>
            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              <InfoCard
                emoji="📍"
                title="RSVP"
                description="Rapid Serial Visual Presentation shows one word at a time in the exact same spot. No more eyes bouncing around!"
              />
              <InfoCard
                emoji="🎯"
                title="ORP"
                description="The red letter is the Optimal Recognition Point - where your eye naturally focuses. It's slightly left of center."
              />
              <InfoCard
                emoji="⚡"
                title="Result"
                description="Traditional reading is 80% eye movement, 20% reading. We flip that ratio. Your brain does the work, not your eyes."
              />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function Shortcut({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500">
      {keys.map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-0.5">/</span>}
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono text-xs">
            {key}
          </kbd>
        </span>
      ))}
      <span className="text-slate-600">{action}</span>
    </div>
  );
}

function InfoCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="text-2xl mb-2">{emoji}</div>
      <h3 className="font-bold text-white mb-1">{title}</h3>
      <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
