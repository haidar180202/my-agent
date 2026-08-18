"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SavedApplication, exportApplicationZip } from "@/utils/zipExporter";

type PipelineStatus = "Draft" | "Applied" | "Screening" | "Interviewing" | "Offer" | "Archived";

const PIPELINE_STAGES: { id: PipelineStatus; label: string; icon: string; color: string }[] = [
  { id: "Draft", label: "Draft / Saved", icon: "📝", color: "border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30" },
  { id: "Applied", label: "Applied", icon: "📤", color: "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" },
  { id: "Screening", label: "Screening / HR Call", icon: "📞", color: "border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20" },
  { id: "Interviewing", label: "Interviewing", icon: "🎯", color: "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "Offer", label: "Offer Received", icon: "🎉", color: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" },
  { id: "Archived", label: "Archived", icon: "📁", color: "border-zinc-300 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/20" },
];

export default function ApplicationHistoryPage() {
  const [history, setHistory] = useState<SavedApplication[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Edit Notes & Follow-up Modal State
  const [activeEditItem, setActiveEditItem] = useState<SavedApplication | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");

  // Load and migrate saved applications from localStorage
  useEffect(() => {
    // Wrap in setTimeout to shift out of synchronous React effect lifecycle
    const timer = setTimeout(() => {
      try {
        const savedRaw = localStorage.getItem("ats_application_history");
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw) as SavedApplication[];
          // Data Migration: Ensure status, notes, followUpDate are set
          const migrated = parsed.map((item) => ({
            ...item,
            status: item.status || "Applied",
            notes: item.notes || "",
            followUpDate: item.followUpDate || "",
            updatedAt: item.updatedAt || item.dateSaved || new Date().toISOString(),
          }));
          setHistory(migrated);
        }
      } catch (err) {
        console.error("Failed to load application history:", err);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save history state back to localStorage
  const saveHistoryToStorage = (updatedList: SavedApplication[]) => {
    setHistory(updatedList);
    try {
      localStorage.setItem("ats_application_history", JSON.stringify(updatedList));
    } catch (err) {
      console.error("Failed to save application history to localStorage:", err);
    }
  };

  // Move card to a new pipeline status
  const handleUpdateStatus = (id: string, newStatus: PipelineStatus) => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item,
    );
    saveHistoryToStorage(updated);
  };

  // Open Edit Notes / Follow-up Modal
  const handleOpenEditModal = (item: SavedApplication) => {
    setActiveEditItem(item);
    setEditNotes(item.notes || "");
    setEditFollowUpDate(item.followUpDate || "");
  };

  // Save Notes & Follow-up Changes
  const handleSaveNotes = () => {
    if (!activeEditItem) return;
    const updated = history.map((item) =>
      item.id === activeEditItem.id
        ? {
            ...item,
            notes: editNotes,
            followUpDate: editFollowUpDate,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    saveHistoryToStorage(updated);
    setActiveEditItem(null);
  };

  // Delete Application Entry
  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this application entry from your history?")) {
      const updated = history.filter((item) => item.id !== id);
      saveHistoryToStorage(updated);
    }
  };

  // Restore Draft to ATS Generator
  const handleRestoreDraft = (item: SavedApplication) => {
    try {
      sessionStorage.setItem(
        "preload_ats_draft",
        JSON.stringify({
          tailoredResume: item.tailoredResume,
          coverLetterText: item.coverLetterText,
          jobDescription: `${item.jobTitle} at ${item.companyName}`,
          targetRole: item.targetRole || item.jobTitle,
          matchScore: item.matchScore,
          missingKeywords: item.missingKeywords || [],
        }),
      );
      window.location.href = "/ats-generate";
    } catch (err) {
      console.error("Failed to preload draft into sessionStorage:", err);
    }
  };

  // 1-Click ZIP Exporter Handler
  const handleExportZip = async (item: SavedApplication) => {
    setExportingId(item.id);
    try {
      await exportApplicationZip(item);
    } catch (err) {
      console.error(err);
      alert("Failed to export ZIP package. Check console for details.");
    } finally {
      setExportingId(null);
    }
  };

  // Filtered applications based on search query
  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.companyName || "").toLowerCase().includes(q) ||
      (item.jobTitle || "").toLowerCase().includes(q) ||
      (item.targetRole || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-amber-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-amber-600/10 dark:bg-amber-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-600/10 dark:bg-orange-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Job Search CRM v2.0</span>
          </div>
        </div>

        {/* Header & Controls Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
              Application Pipeline CRM
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage your job search funnel, track follow-up dates, edit interview notes, and export 1-click ZIP packages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex bg-zinc-200/80 dark:bg-zinc-900/80 p-1 rounded-xl border border-zinc-300 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
              >
                📊 Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                }`}
              >
                📑 List View
              </button>
            </div>

            <Link
              href="/ats-generate"
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
            >
              + Tailor New Application
            </Link>
          </div>
        </header>

        {/* Search Bar */}
        <div className="w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications by company, role title, or notes..."
            className="w-full p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all backdrop-blur-md"
          />
        </div>

        {/* KANBAN BOARD VIEW */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
            {PIPELINE_STAGES.map((stage) => {
              const stageItems = filteredHistory.filter((item) => (item.status || "Applied") === stage.id);

              return (
                <div
                  key={stage.id}
                  className={`flex flex-col gap-3 p-4 rounded-3xl border backdrop-blur-md min-h-[450px] ${stage.color}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-1.5 font-extrabold text-xs tracking-wide">
                      <span>{stage.icon}</span>
                      <span>{stage.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                      {stageItems.length}
                    </span>
                  </div>

                  {/* Cards in Column */}
                  <div className="flex flex-col gap-3">
                    {stageItems.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-400 font-medium italic border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
                        No applications in {stage.label}
                      </div>
                    ) : (
                      stageItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-md hover:shadow-lg transition-all gap-3"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100">
                                {item.companyName}
                              </h3>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  item.matchScore >= 80
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : item.matchScore >= 60
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {item.matchScore}% ATS
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium">{item.targetRole || item.jobTitle}</p>
                          </div>

                          {/* Follow-up Date Badge & Notes Snippet */}
                          {item.followUpDate && (
                            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
                              📅 Follow-up: {item.followUpDate}
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 italic bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}

                          {/* Quick Status Selector */}
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                            <span>Stage:</span>
                            <select
                              value={item.status || "Applied"}
                              onChange={(e) => handleUpdateStatus(item.id, e.target.value as PipelineStatus)}
                              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold p-1 rounded-lg outline-none cursor-pointer text-[10px]"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Actions Bar */}
                          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleExportZip(item)}
                              disabled={exportingId === item.id}
                              className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
                              title="Export Full Package (.zip)"
                            >
                              {exportingId === item.id ? "Packing..." : "📦 ZIP"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-semibold text-[11px] cursor-pointer"
                            >
                              📝 Notes
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRestoreDraft(item)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px] cursor-pointer"
                              title="Load in ATS Generator"
                            >
                              🚀 Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-500 hover:text-red-700 text-[11px] cursor-pointer"
                              title="Delete entry"
                            >
                              ✕
                            </button>
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETAILED LIST VIEW */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-4">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500 bg-white/60 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60">
                No application history records found.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{item.companyName}</h3>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {item.matchScore}% ATS Score
                      </span>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {item.status || "Applied"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      {item.targetRole || item.jobTitle} &bull; <span className="text-xs text-zinc-400 font-normal">Saved {item.dateSaved}</span>
                    </p>
                    {item.notes && <p className="text-xs text-zinc-500 italic">&ldquo;{item.notes}&rdquo;</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleExportZip(item)}
                      disabled={exportingId === item.id}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                    >
                      {exportingId === item.id ? "Packing ZIP..." : "📦 Export Bundle (.zip)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 text-xs font-semibold cursor-pointer"
                    >
                      📝 Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestoreDraft(item)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      🚀 Edit in Generator
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-3 py-2 rounded-xl bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900/60 text-xs font-semibold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* EDIT NOTES & FOLLOW-UP MODAL */}
      {activeEditItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col gap-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-lg">Application Notes & Follow-up</h3>
              <button
                type="button"
                onClick={() => setActiveEditItem(null)}
                className="text-zinc-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {activeEditItem.companyName}
              </span>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {activeEditItem.targetRole || activeEditItem.jobTitle}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="followup" className="font-semibold text-xs text-zinc-400">Scheduled Follow-up Date</label>
              <input
                id="followup"
                type="date"
                value={editFollowUpDate}
                onChange={(e) => setEditFollowUpDate(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notes" className="font-semibold text-xs text-zinc-400">Interview Notes & Recruiter Contacts</label>
              <textarea
                id="notes"
                rows={5}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed resize-y"
                placeholder="Log contact names, HR feedback, salary discussions, or key interview preparation points..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveEditItem(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Save Notes & Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
