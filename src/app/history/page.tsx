"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  email: string;
  phone?: string;
  website?: string;
}

interface Experience {
  company: string;
  role: string;
  date?: string;
  startDate?: string;
  bullets?: string[];
  highlights?: string[];
}

interface Project {
  name: string;
  type?: string;
  date?: string;
  bullets?: string[];
  highlights?: string[];
}

interface TailoredResume {
  personalInfo?: PersonalInfo;
  summary?: string;
  experience?: Experience[];
  projects?: Project[];
  skills?: string[];
}

interface HistoryItem {
  id: string;
  timestamp: string;
  companyName: string;
  targetRole: string;
  theme: string;
  matchScore: number | null;
  jobDescription: string;
  tailoredResume: TailoredResume;
  coverLetterText: string;
  missingKeywords?: string[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load history from localStorage on mount (asynchronously to avoid eslint warnings)
  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem("my-agent-history");
      if (historyRaw) {
        const parsed = JSON.parse(historyRaw) as HistoryItem[];
        setTimeout(() => {
          setHistory(parsed);
        }, 0);
      }
    } catch (err) {
      console.error("Failed to load application history:", err);
    }
  }, []);

  // Delete item from history
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this application record from history?")) return;

    try {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      localStorage.setItem("my-agent-history", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Preload details into sessionStorage and redirect to generator
  const handleLoadInGenerator = (item: HistoryItem) => {
    try {
      sessionStorage.setItem("preload-ats", JSON.stringify(item));
      router.push("/ats-generate");
    } catch (err) {
      console.error("Failed to preload history item:", err);
      alert("Failed to preload item: " + String(err));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 dark:bg-amber-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-600/10 dark:bg-orange-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Application CRM v1.0</span>
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-750 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
            Application History
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Track and manage your customized resumes, cover letters, and scores for every job application.
          </p>
        </header>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-16 rounded-3xl border border-dashed border-zinc-350 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/10 backdrop-blur-md gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-650 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg">No Applications Saved Yet</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
                Tailor a new CV using the ATS Generator, and save it to history when pre-viewing the PDF.
              </p>
            </div>
            <Link href="/ats-generate" className="mt-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-md">
              Start Tailoring Now
            </Link>
          </div>
        ) : (
          /* History List */
          <div className="flex flex-col gap-4">
            {history.map((item) => {
              const isExpanded = expandedId === item.id;
              const dateStr = new Date(item.timestamp).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              
              return (
                <div key={item.id} className="bg-white/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-sm">
                  
                  {/* Item Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 text-left transition-colors hover:bg-zinc-155/30 dark:hover:bg-zinc-900/20 cursor-pointer gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-lg text-zinc-900 dark:text-zinc-50">
                          {item.companyName}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                          {item.theme} theme
                        </span>
                      </div>
                      <span className="text-sm text-zinc-500 font-medium leading-tight">
                        {item.targetRole}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="flex flex-col items-end">
                        {item.matchScore !== null && (
                          <span className={`text-sm font-black px-2.5 py-1 rounded-xl bg-zinc-50 dark:bg-zinc-950 border ${
                            item.matchScore >= 80
                              ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : item.matchScore >= 50
                              ? "text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}>
                            {item.matchScore}% Match
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-zinc-400 mt-1">{dateStr}</span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                          title="Delete Application"
                        >
                          🗑
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-800 text-sm flex items-center">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content Details */}
                  {isExpanded && (
                    <div className="p-6 border-t border-zinc-155/40 dark:border-zinc-850 flex flex-col gap-6 bg-zinc-50/15 dark:bg-zinc-950/10">
                      
                      {/* Load button */}
                      <button
                        onClick={() => handleLoadInGenerator(item)}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer self-start shadow-sm flex items-center gap-1.5"
                      >
                        📂 Restore &amp; Load in Editor
                      </button>

                      {/* Cover letter text */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Tailored Cover Letter</h4>
                        <div className="p-4 rounded-xl bg-zinc-100/50 dark:bg-zinc-950/50 border border-zinc-200/50 dark:border-zinc-850/50 font-mono text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {item.coverLetterText}
                        </div>
                      </div>

                      {/* Job Description */}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Job Description</h4>
                        <div className="p-4 rounded-xl bg-zinc-100/30 dark:bg-zinc-950/20 border border-zinc-200/35 dark:border-zinc-850/30 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-h-[150px] overflow-y-auto">
                          {item.jobDescription}
                        </div>
                      </div>

                      {/* Keywords checkoff summary */}
                      {item.missingKeywords && item.missingKeywords.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Keywords Target Checklist</h4>
                          <div className="flex flex-wrap gap-2">
                            {item.missingKeywords.map((kw, i) => (
                              <span key={i} className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold border border-zinc-200/40 dark:border-zinc-800">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
