"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Scene {
  sceneNumber: number;
  duration: number;
  visual: string;
  voiceover: string;
  audioCue: string;
}

export default function VideoPipelinePage() {
  const [step, setStep] = useState<"setup" | "storyboard">("setup");
  
  // Setup inputs
  const [password, setPassword] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [videoFormat, setVideoFormat] = useState("TikTok/Shorts (60s)");
  const [videoTone, setVideoTone] = useState("Tech Influencer");
  
  // Loading & status states
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  
  // Active session script
  const [script, setScript] = useState<Scene[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  
  // Teleprompter player state
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(130); // Words per minute
  const [fontSize, setFontSize] = useState(28); // px
  const [isPlaying, setIsPlaying] = useState(false);
  
  const prompterContentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);

  // Generate Script from API
  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("Drafting video storyboard outline...");
    
    try {
      const res = await fetch("/api/video-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          projectDescription,
          videoFormat,
          videoTone,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate video script");
      }
      
      const data = await res.json();
      const generatedScript = data.script as Scene[];
      setScript(generatedScript);
      setActiveSceneIndex(0);
      setStep("storyboard");
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  // Compile full script text for teleprompter scroll
  const getFullScriptText = () => {
    return script.map((s) => `[Scene ${s.sceneNumber}] \n${s.voiceover}`).join("\n\n");
  };

  // Scroll loop for teleprompter animation
  // Trigger scroll play/pause
  useEffect(() => {
    const scrollLoop = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }
      const delta = (time - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = time;

      if (prompterContentRef.current) {
        const scrollHeight = prompterContentRef.current.scrollHeight;
        const clientHeight = prompterContentRef.current.clientHeight;
        const maxScroll = scrollHeight - clientHeight;

        // WPM Scroll Calculation:
        const pixelsPerWord = fontSize * 0.75;
        const speedPxPerSec = (scrollSpeed / 60) * pixelsPerWord;

        scrollPosRef.current += speedPxPerSec * delta;
        
        if (scrollPosRef.current >= maxScroll) {
          scrollPosRef.current = maxScroll;
          setIsPlaying(false);
        } else {
          prompterContentRef.current.scrollTop = scrollPosRef.current;
          animationRef.current = requestAnimationFrame(scrollLoop);
        }
      }
    };

    if (isPlaying && showTeleprompter) {
      lastTimeRef.current = null;
      animationRef.current = requestAnimationFrame(scrollLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, showTeleprompter, scrollSpeed, fontSize]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleResetPrompter = () => {
    setIsPlaying(false);
    scrollPosRef.current = 0;
    if (prompterContentRef.current) {
      prompterContentRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-rose-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-rose-600/10 dark:bg-rose-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 dark:bg-pink-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Video Suite v1.0</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Setup Script Form */}
        {step === "setup" && (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white pb-1 leading-tight">
                Video Pipeline Showcase
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Generate highly structured, engaging video storyboards and voiceover scripts for showcasing your portfolio projects.
              </p>
            </header>

            <form onSubmit={handleGenerateScript} className="flex flex-col gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg">
              
              {/* Password Protection input */}
              <div className="flex flex-col gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                <label htmlFor="password" className="font-semibold text-sm text-zinc-500">Decryption Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm animate-pulse-once"
                  placeholder="Enter your CV password to access Video Pipeline"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label htmlFor="format" className="font-semibold text-sm text-zinc-500">Video Format</label>
                  <select
                    id="format"
                    value={videoFormat}
                    onChange={(e) => setVideoFormat(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm cursor-pointer"
                  >
                    <option value="TikTok/Shorts (60s)">TikTok / YouTube Shorts (60s)</option>
                    <option value="LinkedIn Showcase (2m)">LinkedIn Video Presentation (2m)</option>
                    <option value="YouTube Explainer (5m)">Full Architectural Explainer (5m)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-64">
                  <label htmlFor="tone" className="font-semibold text-sm text-zinc-500">Narration Tone</label>
                  <select
                    id="tone"
                    value={videoTone}
                    onChange={(e) => setVideoTone(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm cursor-pointer"
                  >
                    <option value="Tech Influencer">Tech Influencer (Fast-paced, Energetic)</option>
                    <option value="Corporate Professional">Corporate Executive (Structured, Formal)</option>
                    <option value="Casual Builder">Indie Hacker (Raw, Build-in-public, Calm)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="project" className="font-semibold text-sm text-zinc-500">Project Showcase Details</label>
                <textarea
                  id="project"
                  required
                  rows={8}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-rose-500 outline-none transition-all resize-y text-sm leading-relaxed"
                  placeholder="Paste details of the project you want to present (what problems it solves, technical stack used, notable architecture, outcomes)..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !projectDescription || !password}
                className="w-full sm:w-auto self-start px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {status}
                  </>
                ) : (
                  "Create Storyboard Script &rarr;"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Interactive Storyboard & Teleprompter Entry */}
        {step === "storyboard" && script.length > 0 && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-extrabold tracking-tight">Showcase Storyboard</h2>
                <p className="text-sm text-zinc-500">Format: {videoFormat} | Tone: {videoTone}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTeleprompter(true)}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-md flex items-center gap-2"
                >
                  🚀 Open Teleprompter Player
                </button>
                <button
                  onClick={() => setStep("setup")}
                  className="px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150/35 text-zinc-600 dark:text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Start New
                </button>
              </div>
            </header>

            {/* Split Storyboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              
              {/* Scene List Sidebar (1/3) */}
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {script.map((s, index) => (
                  <button
                    key={s.sceneNumber}
                    onClick={() => setActiveSceneIndex(index)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      activeSceneIndex === index
                        ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 shadow-md"
                        : "bg-white/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-100/50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-rose-500">Scene {s.sceneNumber}</span>
                      <span className="text-xs text-zinc-400 font-semibold">{s.duration}s</span>
                    </div>
                    <p className="text-xs font-semibold line-clamp-2 text-zinc-700 dark:text-zinc-300 leading-snug">
                      {s.voiceover}
                    </p>
                  </button>
                ))}
              </div>

              {/* Selected Scene Card Panel (2/3) */}
              <div className="md:col-span-2 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg flex flex-col gap-6 min-h-[350px] justify-between">
                <div className="flex flex-col gap-6">
                  {/* Scene details */}
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
                    <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-black uppercase tracking-wider">
                      Scene {script[activeSceneIndex].sceneNumber}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      Suggested Duration: {script[activeSceneIndex].duration} seconds
                    </span>
                  </div>

                  {/* Visual Instruction */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Visual Storyboard Action</h4>
                    <p className="text-sm font-semibold p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-900/50 leading-relaxed">
                      📷 {script[activeSceneIndex].visual}
                    </p>
                  </div>

                  {/* Voiceover Script */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Narration Voiceover (Speak this)</h4>
                    <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                      🎙️ &ldquo;{script[activeSceneIndex].voiceover}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Audio and Navigation Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-5 mt-4">
                  <div className="text-xs text-zinc-500 font-medium">
                    🎵 <span className="font-semibold text-zinc-400 uppercase tracking-wider">Audio Cue:</span> {script[activeSceneIndex].audioCue}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={activeSceneIndex === 0}
                      onClick={() => setActiveSceneIndex((prev) => prev - 1)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold disabled:opacity-30 cursor-pointer"
                    >
                      &larr; Previous Scene
                    </button>
                    <button
                      disabled={activeSceneIndex === script.length - 1}
                      onClick={() => setActiveSceneIndex((prev) => prev + 1)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-30 cursor-pointer"
                    >
                      Next Scene &rarr;
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* FULLSCREEN TELEPROMPTER OVERLAY MODAL */}
      {showTeleprompter && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in">
          
          {/* Prompter Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Scrolling Teleprompter</span>
              <span className="text-[10px] text-zinc-500 font-medium">Speed: {scrollSpeed} WPM | Font: {fontSize}px</span>
            </div>
            <button
              onClick={() => {
                setIsPlaying(false);
                setShowTeleprompter(false);
              }}
              className="text-zinc-500 hover:text-white font-bold text-sm tracking-wide bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Exit Teleprompter
            </button>
          </div>

          {/* Scrolling Core Screen */}
          <div 
            ref={prompterContentRef}
            className="flex-1 overflow-y-auto my-8 px-4 sm:px-12 text-center flex flex-col items-center select-text font-semibold leading-relaxed tracking-wide scroll-smooth"
            style={{ 
              fontSize: `${fontSize}px`,
              fontFamily: "system-ui, -apple-system, sans-serif" 
            }}
          >
            {/* Top spacer to allow centering first line */}
            <div className="h-[25vh] shrink-0" />
            
            <div className="max-w-2xl text-zinc-300 whitespace-pre-wrap select-text leading-[1.6]">
              {getFullScriptText()}
            </div>

            {/* Bottom spacer to allow scrolling last line past center */}
            <div className="h-[35vh] shrink-0" />
          </div>

          {/* Overlay speed line indicator */}
          <div className="absolute inset-x-0 top-1/2 h-[2px] bg-rose-600/35 border-t border-b border-rose-600/50 pointer-events-none z-10" />

          {/* Prompter Controls Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-t border-zinc-800 pt-5">
            
            {/* Speed slider */}
            <div className="flex items-center gap-4 flex-1 max-w-sm">
              <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase shrink-0">WPM: {scrollSpeed}</span>
              <input
                type="range"
                min="90"
                max="240"
                step="5"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
            </div>

            {/* Core Play/Pause controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleResetPrompter}
                className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Reset to Top"
              >
                ⏮
              </button>
              <button
                onClick={handleTogglePlay}
                className="px-8 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-base transition-colors cursor-pointer shadow-lg hover:shadow-rose-600/20 active:scale-95"
              >
                {isPlaying ? "PAUSE ⏸" : "START PLAY ▶"}
              </button>
            </div>

            {/* Font Size controls */}
            <div className="flex items-center justify-end gap-3 flex-1 max-w-sm">
              <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase shrink-0">Size: {fontSize}px</span>
              <button
                onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize((f) => Math.min(48, f + 2))}
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
