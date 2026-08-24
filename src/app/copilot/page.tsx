"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CopilotResponse } from "@/app/api/copilot/route";

// Web Speech API Native Interfaces (Strict Typing)
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
}

interface SpeechRecognitionEventList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionEventList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function CopilotPage() {
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [step, setStep] = useState<"setup" | "copilot">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live Listening & Transcribing State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualQuestionInput, setManualQuestionInput] = useState("");

  // Stealth HUD Customization State
  const [isStealthHud, setIsStealthHud] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [copied, setCopied] = useState(false);

  // Copilot Response State
  const [copilotData, setCopilotData] = useState<CopilotResponse | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const instance = new SpeechRecognition();
        instance.continuous = true;
        instance.interimResults = true;
        instance.lang = "en-US";

        instance.onresult = (event: SpeechRecognitionEvent) => {
          let currentText = "";
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          setLiveTranscript(currentText);
        };

        instance.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech Recognition Error:", event.error);
        };

        instance.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = instance;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition API is not supported in this browser. You can type questions manually.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setLiveTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleLaunchCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Decryption password is required");
      return;
    }
    setError("");
    setStep("copilot");
  };

  // Trigger Gemini Copilot Answer Fetch
  const handleFetchCopilotAnswer = async (queryText?: string) => {
    const questionToAsk = queryText || liveTranscript || manualQuestionInput;
    if (!questionToAsk.trim()) {
      setError("Please speak or type a question to get AI copilot answer");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          companyName,
          targetRole,
          jobDescription,
          liveQuestionText: questionToAsk.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch copilot answer");
      }

      const data = await res.json();
      setCopilotData(data as CopilotResponse);
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!copilotData) return;
    const fullText = `Talking Points:\n${copilotData.talkingPoints.map((tp) => `- ${tp}`).join("\n")}\n\nModel Answer:\n${copilotData.modelAnswer}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case "sm":
        return "text-xs";
      case "base":
        return "text-sm";
      case "lg":
        return "text-base";
      case "xl":
        return "text-lg font-medium";
      default:
        return "text-sm";
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 transition-colors ${
      isStealthHud
        ? "bg-zinc-950/90 text-zinc-100 p-4"
        : "bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50"
    }`}>
      
      {!isStealthHud && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 dark:bg-emerald-600/20 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-teal-600/10 dark:bg-teal-600/20 blur-[120px]" />
        </div>
      )}

      <main className={`relative z-10 mx-auto flex flex-col gap-6 ${isStealthHud ? "max-w-xl" : "max-w-5xl px-4 sm:px-6 py-12"}`}>
        
        {!isStealthHud && (
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
              &larr; Back to Dashboard
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">⚡ Real-Time AI Copilot</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: SETUP ROOM */}
        {step === "setup" && (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white pb-1 leading-tight">
                Live AI Interview Copilot
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Stealth sidecar assistant for Zoom/Meet. Listens to interviewer questions and generates instant talking points (under 2 seconds).
              </p>
            </header>

            <form onSubmit={handleLaunchCopilot} className="flex flex-col gap-6 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-500">Master Password *</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter password"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="company" className="text-xs font-semibold text-zinc-500">Company Name</label>
                  <input
                    id="company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Google"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="role" className="text-xs font-semibold text-zinc-500">Target Role Title</label>
                  <input
                    id="role"
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Senior AI Architect"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="jd" className="text-xs font-semibold text-zinc-500">Job Description Context (Optional)</label>
                <textarea
                  id="jd"
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-y"
                  placeholder="Paste JD requirements to optimize AI talking points..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                🚀 Launch Live Copilot HUD &rarr;
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: LIVE COPILOT & STEALTH HUD ROOM */}
        {step === "copilot" && (
          <div className="flex flex-col gap-6">
            
            {/* Header Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/60 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    isListening
                      ? "bg-red-600 text-white animate-pulse shadow-md"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  }`}
                >
                  {isListening ? "⏹️ Stop Listening" : "🎙️ Start Live Listening"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsStealthHud(!isStealthHud)}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer"
                >
                  {isStealthHud ? "🔲 Full View" : "👓 Stealth HUD"}
                </button>
              </div>

              {/* Font Size Scaling */}
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 px-1">Font:</span>
                {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      fontSize === sz ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE SPEECH TRANSCRIPT BOX */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  {isListening && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                  Live Interviewer Question
                </span>
                {liveTranscript && (
                  <button
                    type="button"
                    onClick={() => handleFetchCopilotAnswer(liveTranscript)}
                    disabled={loading}
                    className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                  >
                    ⚡ Fetch Answer for Transcript
                  </button>
                )}
              </div>

              <p className="text-sm font-medium italic min-h-[3rem] text-zinc-700 dark:text-zinc-300">
                {liveTranscript || (isListening ? "Listening to interviewer voice..." : "Click 'Start Live Listening' or type question below.")}
              </p>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={manualQuestionInput}
                  onChange={(e) => setManualQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleFetchCopilotAnswer(manualQuestionInput))}
                  placeholder="Or type interviewer question manually..."
                  className="flex-1 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleFetchCopilotAnswer(manualQuestionInput)}
                  disabled={loading || !manualQuestionInput.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
                >
                  Ask Copilot
                </button>
              </div>
            </div>

            {/* COPILOT OUTPUT HUD DISPLAY */}
            {copilotData && (
              <div className="flex flex-col gap-4 p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/40 shadow-2xl backdrop-blur-2xl animate-fade-in">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <span>⚡ Gold Talking Points</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAnswer}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
                  >
                    {copied ? "✅ Copied!" : "📋 1-Click Copy"}
                  </button>
                </div>

                {/* Keywords Badges */}
                {copilotData.keyKeywords && (
                  <div className="flex flex-wrap gap-1.5">
                    {copilotData.keyKeywords.map((kw) => (
                      <span key={kw} className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-300 dark:border-emerald-800">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Talking Points Bullets */}
                <div className="flex flex-col gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Key Highlights to Speak</span>
                  <ul className={`list-disc list-inside flex flex-col gap-2 leading-relaxed font-semibold text-zinc-800 dark:text-zinc-100 ${getFontSizeClass()}`}>
                    {copilotData.talkingPoints.map((tp, i) => (
                      <li key={i}>{tp}</li>
                    ))}
                  </ul>
                </div>

                {/* Full Model Answer */}
                <div className="flex flex-col gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Suggested Spoken Response</span>
                  <p className={`leading-relaxed text-zinc-700 dark:text-zinc-300 ${getFontSizeClass()}`}>
                    {copilotData.modelAnswer}
                  </p>
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
