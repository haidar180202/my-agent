"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
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
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
    };
  }
}

type CopilotMode = "general" | "coding" | "behavioral-star" | "system-design";
type HudStyle = "full" | "stealth-card" | "floating-top-bar";
type WidgetOpacity = "100" | "70" | "40" | "20";

export default function CopilotPage() {
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [step, setStep] = useState<"setup" | "copilot">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // React 19 Hydration-Safe Desktop Mode Detection via useSyncExternalStore
  const isDesktopMode = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;
      const urlParams = new URLSearchParams(window.location.search);
      const desktopParam = urlParams.get("desktop");
      const userAgent = navigator.userAgent.toLowerCase();
      return desktopParam === "true" || userAgent.includes("electron");
    },
    () => false,
  );

  // Mode & Widget Style State
  const [copilotMode, setCopilotMode] = useState<CopilotMode>("general");
  const [hudStyle, setHudStyle] = useState<HudStyle>("full");
  const [isWidgetHidden, setIsWidgetHidden] = useState(false);

  // Glass Stealth Opacity State (Default to 40% Glass Mode)
  const [widgetOpacity, setWidgetOpacity] = useState<WidgetOpacity>("40");

  // OS Document Picture-in-Picture State
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Meeting Timer Counter State
  const [meetingSeconds, setMeetingSeconds] = useState(0);

  // Live STT Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualQuestionInput, setManualQuestionInput] = useState("");

  // Screen Share & Vision OCR State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);

  // Stealth HUD Customization State
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Copilot Response State
  const [copilotData, setCopilotData] = useState<CopilotResponse | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toggle HTML/Body transparent background class for Desktop Electron mode
  useEffect(() => {
    if (isDesktopMode && typeof document !== "undefined") {
      document.documentElement.classList.add("desktop-transparent");
      document.body.classList.add("desktop-transparent");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("desktop-transparent");
        document.body.classList.remove("desktop-transparent");
      }
    };
  }, [isDesktopMode]);

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

  // Meeting Timer Ticker
  useEffect(() => {
    if (step !== "copilot") return;

    const interval = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech Recognition API is not supported in this environment. You can type questions or use Screen Capture.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      setIsListening(false);
    } else {
      setLiveTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
        setIsListening(false);
        alert("Speech Recognition (STT) cloud engine is not available in Chromium embedded apps. You can use Screen Capture (Alt+S) or type questions manually.");
      }
    }
  }, [isListening]);

  // Start HTML5 Screen Share Stream
  const handleStartScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen Capture is not supported in this browser environment.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      setIsScreenSharing(true);

      mediaStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        streamRef.current = null;
      };
    } catch (err) {
      console.error("Failed to start screen share:", err);
    }
  }, []);

  // Stop Screen Share Stream
  const handleStopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScreenSharing(false);
  }, []);

  // Trigger Gemini Copilot Answer Fetch
  const handleFetchCopilotAnswer = useCallback(
    async (queryText?: string, screenImageBase64?: string) => {
      const questionToAsk = queryText || liveTranscript || manualQuestionInput;
      if (!questionToAsk.trim() && !screenImageBase64) {
        setError("Please speak, type a question, or capture a screen image to get AI copilot answer");
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
            screenImageBase64: screenImageBase64 || null,
            copilotMode,
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
    },
    [password, companyName, targetRole, jobDescription, liveTranscript, manualQuestionInput, copilotMode],
  );

  // Take Snapshot from Video Stream & Send to Gemini Vision
  const handleSnapAndSolveScreen = useCallback(async () => {
    if (!videoRef.current || !isScreenSharing) {
      alert("Please click 'Start Screen Share' or press [Alt+S] first before snapping screen.");
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Screen video stream is not ready yet. Please wait a moment.");
      return;
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const screenImageBase64 = canvas.toDataURL("image/png");
    setCapturedImagePreview(screenImageBase64);

    await handleFetchCopilotAnswer(undefined, screenImageBase64);
  }, [isScreenSharing, handleFetchCopilotAnswer]);

  // Launch OS-Level Always-On-Top Picture-in-Picture Window
  const handleLaunchOsPipWindow = async () => {
    if (typeof window === "undefined" || !window.documentPictureInPicture) {
      alert("Document Picture-in-Picture API is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 780,
        height: 240,
      });

      // Copy Document Styles (Tailwind CSS & Next.js Styles) to PiP Window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
          const style = document.createElement("style");
          style.textContent = cssRules;
          pipWin.document.head.appendChild(style);
        } catch {
          if (styleSheet.href) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            pipWin.document.head.appendChild(link);
          }
        }
      });

      pipWin.document.body.className = "bg-transparent text-zinc-100 p-2 font-sans selection:bg-emerald-500/30 overflow-hidden";

      pipWin.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(pipWin);
      setHudStyle("floating-top-bar");
    } catch (err) {
      console.error("Failed to launch OS PiP Window:", err);
    }
  };

  // Keyboard Hotkeys Event Listener (Alt+S, Alt+L, Alt+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== "copilot") return;

      // Alt + S: Snap & Solve Screen
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (isScreenSharing) {
          handleSnapAndSolveScreen();
        } else {
          handleStartScreenShare();
        }
      }

      // Alt + L: Toggle Audio Listening
      if (e.altKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        toggleListening();
      }

      // Alt + H: Toggle Stealth HUD / PiP Window
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (!pipWindow) {
          handleLaunchOsPipWindow();
        } else {
          pipWindow.close();
          setPipWindow(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, isScreenSharing, handleSnapAndSolveScreen, handleStartScreenShare, toggleListening, pipWindow]);

  const handleLaunchCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Decryption password is required");
      return;
    }
    setError("");
    setStep("copilot");
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleClearAll = () => {
    setLiveTranscript("");
    setManualQuestionInput("");
    setCopilotData(null);
    setCapturedImagePreview(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} mins`;
  };

  // Glass Stealth Style Resolver
  const getGlassStyles = () => {
    switch (widgetOpacity) {
      case "100":
        return "bg-zinc-950/95 border-zinc-700/80 backdrop-blur-2xl opacity-100 shadow-2xl";
      case "70":
        return "bg-zinc-950/50 border-zinc-700/50 backdrop-blur-xl opacity-85 hover:opacity-100 shadow-xl";
      case "40":
        return "bg-zinc-950/25 border-zinc-700/30 backdrop-blur-md opacity-60 hover:opacity-100 shadow-lg";
      case "20":
        return "bg-zinc-950/10 border-zinc-800/20 backdrop-blur-sm opacity-35 hover:opacity-100 shadow-sm";
      default:
        return "bg-zinc-950/30 border-zinc-700/40 backdrop-blur-md opacity-70 hover:opacity-100 shadow-xl";
    }
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

  // Render Teleprompter Widget JSX Helper Component
  const renderTeleprompterWidget = (isInsidePip = false) => (
    <div className={`flex flex-col rounded-2xl border text-zinc-100 overflow-hidden transition-all duration-300 ${getGlassStyles()} ${
      isInsidePip || isDesktopMode ? "w-full" : "fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl animate-fade-in"
    }`}>
      
      {/* Top Bar Header Row (Draggable in Electron Desktop Mode) */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-black/40 border-b border-zinc-800/40 text-xs select-none backdrop-blur-md"
        style={isDesktopMode ? ({ WebkitAppRegion: "drag" } as React.CSSProperties) : undefined}
      >
        
        {/* Left Brand Badge & Hide Toggle */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <span className="flex items-center gap-1.5 font-extrabold text-white bg-emerald-950/60 border border-emerald-700/60 px-2.5 py-1 rounded-xl">
            <span>🦜</span>
            <span className="tracking-tight">ParakeetAI Copilot</span>
          </span>

          <button
            type="button"
            onClick={() => setIsWidgetHidden(!isWidgetHidden)}
            className="px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold cursor-pointer transition-colors"
          >
            {isWidgetHidden ? "Show" : "Hide"}
          </button>
        </div>

        {/* Middle Domain & Live Meeting Timer */}
        <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
          <span className="hidden sm:inline-block font-semibold text-zinc-300">meet.google.com / Zoom</span>
          <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/30">
            ⏰ {formatTimer(meetingSeconds)}
          </span>
        </div>

        {/* Right Glass Opacity Switcher & Control Buttons */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Glass Opacity Switcher */}
          <div className="flex items-center gap-1 bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-700/50">
            <span className="text-[9px] font-bold text-zinc-400 px-1">Glass:</span>
            {(["100", "70", "40", "20"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setWidgetOpacity(op)}
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                  widgetOpacity === op ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                {op}%
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
              isListening
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            }`}
          >
            {isListening ? "Stop Listening 🔴" : "Listen 🎙️"}
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-bold cursor-pointer text-[11px]"
          >
            Clear
          </button>

          {!isInsidePip && !isDesktopMode && (
            <button
              type="button"
              onClick={() => setHudStyle("full")}
              className="px-2.5 py-1 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold cursor-pointer text-[11px]"
            >
              Exit
            </button>
          )}
        </div>

      </div>

      {/* Middle Teleprompter Text Row (Collapsed when Hidden) */}
      {!isWidgetHidden && (
        <div className="flex flex-col gap-2 p-3 bg-black/20 text-sm backdrop-blur-sm">
          
          {/* Spoken Question or Live Transcript Teleprompter */}
          <div className="text-xs font-semibold text-zinc-200 leading-relaxed italic border-l-2 border-emerald-500 pl-3">
            {liveTranscript || copilotData?.modelAnswer || "Listening for interviewer questions or click 'Analyse Screen'..."}
          </div>

          {/* Bullets Talking Points inside Teleprompter */}
          {copilotData && copilotData.talkingPoints && (
            <div className="flex flex-col gap-1 pt-1.5 border-t border-zinc-800/50 text-xs">
              <span className="text-[10px] font-black uppercase text-emerald-400">⚡ Gold Talking Points:</span>
              <ul className="list-disc list-inside flex flex-col gap-1 font-semibold text-emerald-200">
                {copilotData.talkingPoints.map((tp, idx) => (
                  <li key={idx}>{tp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sub-Bar Action Buttons Row */}
          <div className="flex items-center justify-center gap-3 pt-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <button
              type="button"
              onClick={() => handleFetchCopilotAnswer()}
              disabled={loading}
              className="px-3.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-white font-extrabold text-xs cursor-pointer border border-zinc-700/60 shadow-md disabled:opacity-50"
            >
              ⚡ Answer Question
            </button>

            <button
              type="button"
              onClick={isScreenSharing ? handleSnapAndSolveScreen : handleStartScreenShare}
              disabled={loading}
              className="px-3.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer shadow-md disabled:opacity-50"
            >
              📸 Analyse Screen
            </button>
          </div>

        </div>
      )}

    </div>
  );

  return (
    <div suppressHydrationWarning className={`min-h-screen font-sans selection:bg-emerald-500/30 transition-colors ${
      isDesktopMode
        ? "bg-transparent text-zinc-100 p-2 overflow-hidden"
        : hudStyle === "stealth-card" || hudStyle === "floating-top-bar"
        ? "bg-zinc-950/95 text-zinc-100 p-4"
        : "bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50"
    }`}>
      
      {/* Hidden Video and Canvas Elements for HTML5 Screen Capture */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {hudStyle === "full" && !isDesktopMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 dark:bg-emerald-600/20 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-teal-600/10 dark:bg-teal-600/20 blur-[120px]" />
        </div>
      )}

      {/* RENDER PARAKEET TELEPROMPTER WIDGET INSIDE NATIVE WINDOWS OS PiP WINDOW */}
      {pipWindow && createPortal(renderTeleprompterWidget(true), pipWindow.document.body)}

      {/* RENDER IN-PAGE FLOATING BAR IF PIP WINDOW OR ELECTRON DESKTOP MODE IS ACTIVE */}
      {(step === "copilot" || isDesktopMode) && (hudStyle === "floating-top-bar" || isDesktopMode) && !pipWindow && renderTeleprompterWidget(false)}

      {!isDesktopMode && (
        <main className={`relative z-10 mx-auto flex flex-col gap-6 ${
          hudStyle === "stealth-card" || hudStyle === "floating-top-bar" ? "max-w-2xl pt-24" : "max-w-5xl px-4 sm:px-6 py-12"
        }`}>
          
          {hudStyle === "full" && (
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
                &larr; Back to Dashboard
              </Link>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">⚡ Real-Time AI Copilot &amp; Vision OCR</span>
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
                  Live AI Interview Copilot &amp; Vision OCR
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Stealth sidecar assistant for Zoom/Meet. Listens to interviewer questions &amp; captures LeetCode/HackerRank screen problems with instant Gemini Vision solutions.
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
              
              {/* RESPONSE MODE SELECTOR & OS WINDOW LAUNCHER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
                
                {/* Response Mode Selector */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mr-1">Mode:</span>
                  {[
                    { id: "general", label: "⚡ General" },
                    { id: "coding", label: "💻 Coding Test" },
                    { id: "behavioral-star", label: "🎯 STAR Method" },
                    { id: "system-design", label: "🏗️ System Design" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCopilotMode(m.id as CopilotMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        copilotMode === m.id
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* OS FLOATING WINDOW LAUNCHER BUTTON */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLaunchOsPipWindow}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                  >
                    🪟 Launch OS Floating Window (Always-on-Top)
                  </button>
                </div>

              </div>

              {/* Header Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/60 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Audio Listening Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      isListening
                        ? "bg-red-600 text-white animate-pulse shadow-md"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    }`}
                  >
                    {isListening ? "⏹️ Stop Listening [Alt+L]" : "🎙️ Listen Audio [Alt+L]"}
                  </button>

                  {/* Screen Share / Vision OCR Buttons */}
                  {!isScreenSharing ? (
                    <button
                      type="button"
                      onClick={handleStartScreenShare}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      🖥️ Start Screen Share [Alt+S]
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSnapAndSolveScreen}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/30 flex items-center gap-1.5 animate-bounce"
                      >
                        📸 Snap Screen [Alt+S]
                      </button>
                      <button
                        type="button"
                        onClick={handleStopScreenShare}
                        className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-red-500 text-xs font-bold cursor-pointer"
                      >
                        Stop Share
                      </button>
                    </div>
                  )}
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
                    Live Interviewer Question / Audio Transcript
                  </span>
                  {liveTranscript && (
                    <button
                      type="button"
                      onClick={() => handleFetchCopilotAnswer(liveTranscript)}
                      disabled={loading}
                      className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                    >
                      ⚡ Fetch Answer for Audio
                    </button>
                  )}
                </div>

                <p className="text-sm font-medium italic min-h-[2.5rem] text-zinc-700 dark:text-zinc-300">
                  {liveTranscript || (isListening ? "Listening to interviewer voice..." : "Click 'Listen Audio' [Alt+L], 'Start Screen Share' [Alt+S], or type question below.")}
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

              {/* SCREEN CAPTURE PREVIEW THUMBNAIL */}
              {capturedImagePreview && (
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <Image
                    src={capturedImagePreview}
                    alt="Captured Screen Snapshot"
                    width={112}
                    height={64}
                    unoptimized
                    className="w-28 h-16 object-cover rounded-xl border border-zinc-700"
                  />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-emerald-400">📸 Screen Frame Captured &amp; Processed</span>
                    <span className="text-zinc-400 text-[11px]">Gemini Vision Engine scanned text &amp; code from this frame.</span>
                  </div>
                </div>
              )}

              {/* COPILOT OUTPUT HUD DISPLAY */}
              {copilotData && (
                <div className="flex flex-col gap-4 p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/40 shadow-2xl backdrop-blur-2xl animate-fade-in">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span>⚡ Gold Talking Points ({copilotMode.toUpperCase()})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(`Talking Points:\n${copilotData.talkingPoints.map((tp) => `- ${tp}`).join("\n")}\n\nModel Answer:\n${copilotData.modelAnswer}`, "all-copilot")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
                    >
                      {copiedKey === "all-copilot" ? "✅ Copied All!" : "📋 1-Click Copy"}
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

                  {/* BEHAVIORAL STAR FRAMEWORK CARDS (When STAR Mode is Active) */}
                  {copilotData.starFramework && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="flex flex-col gap-1 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">📌 Situation</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{copilotData.starFramework.situation}</p>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">🎯 Task</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{copilotData.starFramework.task}</p>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">⚡ Action</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{copilotData.starFramework.action}</p>
                      </div>

                      <div className="flex flex-col gap-1 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">🎉 Result</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{copilotData.starFramework.result}</p>
                      </div>
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

                  {/* CODE SOLUTION CONTAINER (When Code / Algorithm Test is Solved from Screen) */}
                  {copilotData.codeSolution && (
                    <div className="flex flex-col gap-2 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-zinc-100">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">💻 Optimal Code Solution (Gemini Vision OCR)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(copilotData.codeSolution || "", "code-solution")}
                          className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          {copiedKey === "code-solution" ? "Copied Code!" : "Copy Code"}
                        </button>
                      </div>
                      <pre className="overflow-x-auto font-mono text-xs text-emerald-300 p-2 leading-relaxed whitespace-pre">
                        {copilotData.codeSolution}
                      </pre>
                    </div>
                  )}

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
      )}

    </div>
  );
}
