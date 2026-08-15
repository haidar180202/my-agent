"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface DialogueTurn {
  sender: "ai" | "user";
  text: string;
}

interface ReportData {
  overallScore: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

export default function AIInterviewPage() {
  const [step, setStep] = useState<"lobby" | "call" | "report">("lobby");

  // Setup inputs
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState("Full-Stack AI Engineer");
  const [jobDescription, setJobDescription] = useState("");

  // Media permissions
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Call session state
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DialogueTurn[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Report state
  const [report, setReport] = useState<ReportData | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize camera preview
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to access camera/mic:", err);
      setError("Unable to access camera or microphone. Please check browser permissions.");
    }
  };

  // Toggle camera track
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  // Toggle mic track
  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Speech Synthesis Helper (TTS AI Voice)
  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available English voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")) && v.lang.startsWith("en"),
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Speech Recognition Helper (STT Candidate Voice)
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech Recognition API is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript;
        }
        setUserTranscript(finalTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
    } catch {
      // Recognition might already be running
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, []);

  // Call timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "call") {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  // Start Meeting Handler
  const handleStartCall = async () => {
    if (!password) {
      setError("Please enter your CV decryption password.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusText("Connecting to AI Interview Room...");

    try {
      await startCamera();

      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start-session",
          password,
          targetRole,
          jobDescription,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start interview session");
      }

      const data = await res.json();
      const firstAiMessage = data.aiMessage as string;

      setHistory([{ sender: "ai", text: firstAiMessage }]);
      setStep("call");
      setCallDurationSeconds(0);

      // Trigger AI Speech
      setTimeout(() => {
        speakText(firstAiMessage);
        startSpeechRecognition();
      }, 500);
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer & Next Turn
  const handleSubmitAnswer = async () => {
    if (!userTranscript.trim()) return;

    const currentAnswerText = userTranscript.trim();
    setUserTranscript("");
    stopSpeechRecognition();

    const updatedHistory: DialogueTurn[] = [
      ...history,
      { sender: "user", text: currentAnswerText },
    ];
    setHistory(updatedHistory);

    setLoading(true);
    setStatusText("AI is processing your answer...");

    try {
      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next-turn",
          password,
          targetRole,
          jobDescription,
          history: updatedHistory,
          userAnswer: currentAnswerText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process answer");
      }

      const data = await res.json();
      const nextAiMessage = data.aiMessage as string;

      const newTurnHistory: DialogueTurn[] = [
        ...updatedHistory,
        { sender: "ai", text: nextAiMessage },
      ];
      setHistory(newTurnHistory);

      // Trigger AI Speech and restart recognition
      speakText(nextAiMessage);
      startSpeechRecognition();
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  // End Call & Generate Scorecard Report
  const handleEndCall = async () => {
    window.speechSynthesis.cancel();
    stopSpeechRecognition();
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    setLoading(true);
    setStatusText("Evaluating interview performance and generating scorecard...");

    try {
      const res = await fetch("/api/ai-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-report",
          password,
          targetRole,
          jobDescription,
          history,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await res.json();
      setReport(data.report as ReportData);
      setStep("report");
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  // Format seconds into 00:00
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      
      {/* LOBBY STEP */}
      {step === "lobby" && (
        <main className="max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold transition-colors">
              &larr; Back to Dashboard
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/40 border border-purple-700/50">
              <span className="flex h-2.5 w-2.5 rounded-full bg-purple-400 animate-ping" />
              <span className="text-xs font-semibold text-purple-300">Live Zoom AI Room</span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 font-medium text-sm">
              ⚠️ {error}
            </div>
          )}

          <header className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
              AI Live Video Call Room
            </h1>
            <p className="text-zinc-400">
              Practice real-time technical & behavioral mock interviews over a simulated Zoom call with speech synthesis and live voice recognition.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Setup Inputs */}
            <div className="flex flex-col gap-5 p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
              <h3 className="text-lg font-bold border-b border-zinc-800 pb-3">Session Configuration</h3>
              
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="font-semibold text-xs text-zinc-400">Decryption Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  placeholder="Enter your CV password"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="role" className="font-semibold text-xs text-zinc-400">Target Role Title</label>
                <input
                  id="role"
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  placeholder="e.g. Senior Full-Stack Engineer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="jd" className="font-semibold text-xs text-zinc-400">Job Description (Context)</label>
                <textarea
                  id="jd"
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-y leading-relaxed"
                  placeholder="Paste target job requirements, key technical skills, or responsibilities..."
                />
              </div>
            </div>

            {/* Camera Preview */}
            <div className="flex flex-col gap-5 p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl items-center text-center">
              <h3 className="text-lg font-bold border-b border-zinc-800 pb-3 w-full">Equipment & Camera Test</h3>
              
              <div className="relative w-full aspect-video rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!mediaStream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-zinc-950/80">
                    <span className="text-3xl">📷</span>
                    <p className="text-xs text-zinc-400">Click below to test your webcam framing before joining</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Test Camera & Mic
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleStartCall}
                disabled={loading || !password}
                className="w-full py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {statusText}
                  </>
                ) : (
                  "🎥 Join Video Meeting Room &rarr;"
                )}
              </button>
            </div>

          </div>
        </main>
      )}

      {/* CALL ROOM STEP */}
      {step === "call" && (
        <div className="fixed inset-0 bg-zinc-950 flex flex-col justify-between p-4 sm:p-6 select-none animate-fade-in z-50">
          
          {/* Header */}
          <header className="flex items-center justify-between border-b border-zinc-800/80 pb-3 px-2">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">LIVE INTERVIEW</span>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                {formatTime(callDurationSeconds)}
              </span>
            </div>
            <div className="text-xs font-semibold text-purple-300 bg-purple-950/40 border border-purple-800/50 px-3 py-1 rounded-full">
              Target: {targetRole}
            </div>
            <button
              onClick={() => setShowSubtitles((prev) => !prev)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                showSubtitles ? "bg-zinc-800 border-zinc-700 text-white" : "bg-transparent border-zinc-800 text-zinc-500"
              }`}
            >
              💬 Subtitles: {showSubtitles ? "ON" : "OFF"}
            </button>
          </header>

          {/* Main Video Call Tiles (Grid) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            
            {/* Tile 1: AI Interviewer */}
            <div className="relative rounded-3xl bg-zinc-900/80 border border-zinc-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-xl">
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-4xl shadow-2xl mb-4">
                🤖
                {aiSpeaking && (
                  <div className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-75" />
                )}
              </div>

              <h3 className="font-bold text-lg text-white">AI Executive Interviewer</h3>
              <p className="text-xs text-zinc-400 font-medium">
                {aiSpeaking ? "🔊 Speaking to you..." : "👂 Listening to your response..."}
              </p>

              {/* Waveform Bars */}
              <div className="flex items-center gap-1.5 my-4 h-8">
                {[40, 70, 30, 90, 50, 80, 20].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      aiSpeaking ? "bg-purple-500 animate-pulse" : "bg-zinc-800"
                    }`}
                    style={{ height: aiSpeaking ? `${h}%` : "20%" }}
                  />
                ))}
              </div>

              {/* AI Subtitle Overlay */}
              {showSubtitles && history.length > 0 && history[history.length - 1].sender === "ai" && (
                <div className="absolute bottom-4 inset-x-4 p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-zinc-800 text-xs font-semibold text-purple-200 leading-relaxed max-h-24 overflow-y-auto">
                  💬 &ldquo;{history[history.length - 1].text}&rdquo;
                </div>
              )}
            </div>

            {/* Tile 2: Candidate Video Stream */}
            <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col justify-between shadow-xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity ${isCameraOn ? "opacity-100" : "opacity-0"}`}
              />

              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
                  <span className="text-4xl mb-2">📷</span>
                  <p className="text-xs">Camera is Off</p>
                </div>
              )}

              {/* Name Tag */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-xs font-semibold text-white border border-white/10">
                👤 You (Candidate)
              </div>

              {/* Live STT Transcript Preview Box */}
              <div className="absolute bottom-4 inset-x-4 p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-zinc-800 text-xs leading-relaxed flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  <span>🎙️ Live Speech Transcript</span>
                  <span>{isMicOn ? "Mic Active" : "Mic Muted"}</span>
                </div>
                <p className="text-zinc-200 min-h-[2.5rem] max-h-20 overflow-y-auto italic">
                  {userTranscript || "Speak your answer into your microphone..."}
                </p>
              </div>
            </div>

          </div>

          {/* Controls Bar */}
          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-zinc-800/80 pt-4 px-2">
            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                  isMicOn ? "bg-zinc-900 border-zinc-800 text-white" : "bg-red-950/60 border-red-800 text-red-400"
                }`}
                title="Toggle Microphone"
              >
                {isMicOn ? "🎙️ Mic On" : "🎙️ Mic Muted"}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                  isCameraOn ? "bg-zinc-900 border-zinc-800 text-white" : "bg-red-950/60 border-red-800 text-red-400"
                }`}
                title="Toggle Camera"
              >
                {isCameraOn ? "📷 Cam On" : "📷 Cam Off"}
              </button>
            </div>

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={loading || !userTranscript.trim()}
                className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-30 shadow-md"
              >
                {loading ? "Processing..." : "Submit Answer &rarr;"}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                🛑 End Call & Report
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* REPORT STEP */}
      {step === "report" && report && (
        <main className="max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-semibold transition-colors">
              &larr; Back to Dashboard
            </Link>
            <button
              onClick={() => setStep("lobby")}
              className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold cursor-pointer"
            >
              Start New Call
            </button>
          </div>

          <header className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight">Interview Performance Scorecard</h1>
            <p className="text-zinc-400">Target Role: {targetRole}</p>
          </header>

          {/* Score Gauge */}
          <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-8 justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Executive Assessment</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{report.feedback}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-purple-950/40 border border-purple-800/50 shrink-0">
              <span className="text-5xl font-black text-purple-300">{report.overallScore}/10</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase mt-1">Overall Match Score</span>
            </div>
          </div>

          {/* Strengths & Gaps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-900/50 flex flex-col gap-3">
              <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Demonstrated Strengths</h3>
              <ul className="flex flex-col gap-2">
                {report.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-emerald-200 flex items-start gap-2">
                    <span>✓</span> <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-900/50 flex flex-col gap-3">
              <h3 className="font-bold text-sm text-rose-400 uppercase tracking-wider">Key Missing Gaps & Keywords</h3>
              <ul className="flex flex-col gap-2">
                {report.gaps.map((g, idx) => (
                  <li key={idx} className="text-xs text-rose-200 flex items-start gap-2">
                    <span>⚠️</span> <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Transcribed Dialogue History */}
          <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Complete Transcript Dialogue Record</h3>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-2">
              {history.map((turn, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                    turn.sender === "ai"
                      ? "bg-purple-950/20 border-purple-900/40 text-purple-200"
                      : "bg-zinc-950 border-zinc-800 text-zinc-200"
                  }`}
                >
                  <span className="font-bold uppercase block mb-1 text-[10px] text-zinc-500">
                    {turn.sender === "ai" ? "🤖 AI INTERVIEWER" : "👤 YOU"}
                  </span>
                  {turn.text}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

    </div>
  );
}
