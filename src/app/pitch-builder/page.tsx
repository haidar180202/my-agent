"use client";

import { useState } from "react";
import Link from "next/link";
import { PitchOutput } from "@/app/api/pitch-builder/route";

export default function PitchBuilderPage() {
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pitches, setPitches] = useState<PitchOutput | null>(null);

  // Copy Feedback Toast state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Decryption password is required");
      return;
    }
    if (!companyName || !jobDescription) {
      setError("Company Name and Job Description are required");
      return;
    }

    setLoading(true);
    setError("");
    setPitches(null);

    try {
      const res = await fetch("/api/pitch-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          companyName,
          targetRole,
          recruiterName,
          jobDescription,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate outreach pitches");
      }

      const data = await res.json();
      setPitches(data.pitches as PitchOutput);
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-pink-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-600/10 dark:bg-pink-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-rose-600/10 dark:bg-rose-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-950/60 border border-pink-300 dark:border-pink-800">
            <span className="text-xs font-bold text-pink-700 dark:text-pink-300">✉️ Recruiter Pitch Engine</span>
          </div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white pb-1 leading-tight">
            Cold Outreach &amp; Pitch Builder
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generate high-conversion cold emails, punchy LinkedIn connection notes, and viral showcase posts tailored to any job opening.
          </p>
        </header>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Setup Form Card */}
        <form onSubmit={handleGenerate} className="flex flex-col gap-6 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-500">Master Password *</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Enter password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="company" className="text-xs font-semibold text-zinc-500">Target Company *</label>
              <input
                id="company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g. Google, Stripe"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-xs font-semibold text-zinc-500">Target Role Title</label>
              <input
                id="role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g. Senior AI Engineer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="recruiter" className="text-xs font-semibold text-zinc-500">Recruiter Name (Optional)</label>
              <input
                id="recruiter"
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="jd" className="text-xs font-semibold text-zinc-500">Job Description / Role Requirements *</label>
            <textarea
              id="jd"
              rows={5}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-pink-500 leading-relaxed resize-y"
              placeholder="Paste the target job description or requirements here..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !companyName || !jobDescription}
            className="w-full py-4 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Crafting High-Conversion Outreach Pitches...
              </span>
            ) : (
              "🚀 Generate Outreach Pitches &rarr;"
            )}
          </button>
        </form>

        {/* GENERATED OUTREACH PITCHES DISPLAY */}
        {pitches && (
          <div className="flex flex-col gap-8 animate-fade-in">
            
            {/* ASSET 1: COLD EMAIL */}
            <div className="flex flex-col gap-4 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-2">
                <div className="flex items-center gap-2 font-extrabold text-base text-pink-600 dark:text-pink-400">
                  <span>✉️</span> Cold Recruiter Email
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`Subject: ${pitches.coldEmail.subject}\n\n${pitches.coldEmail.body}`, "cold-email")}
                  className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors self-start sm:self-auto"
                >
                  {copiedKey === "cold-email" ? "✅ Copied Full Email!" : "📋 1-Click Copy Full Email"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subject Line</span>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <span>{pitches.coldEmail.subject}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(pitches.coldEmail.subject, "email-subject")}
                      className="text-pink-500 hover:underline text-[10px] font-bold shrink-0 ml-2"
                    >
                      {copiedKey === "email-subject" ? "Copied!" : "Copy Subject"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Email Body</span>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {pitches.coldEmail.body}
                  </pre>
                </div>
              </div>
            </div>

            {/* ASSET 2: LINKEDIN CONNECTION NOTE */}
            <div className="flex flex-col gap-4 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-2">
                <div className="flex items-center gap-2 font-extrabold text-base text-blue-600 dark:text-blue-400">
                  <span>💬</span> LinkedIn Connection Note
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {pitches.linkedInNote.length} / 300 chars
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(pitches.linkedInNote, "linkedin-note")}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
                  >
                    {copiedKey === "linkedin-note" ? "✅ Copied Note!" : "📋 1-Click Copy Note"}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                &ldquo;{pitches.linkedInNote}&rdquo;
              </div>
            </div>

            {/* ASSET 3: LINKEDIN SHOWCASE POST */}
            <div className="flex flex-col gap-4 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-2">
                <div className="flex items-center gap-2 font-extrabold text-base text-purple-600 dark:text-purple-400">
                  <span>🚀</span> LinkedIn Project Showcase Post
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(pitches.linkedInPost, "linkedin-post")}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors self-start sm:self-auto"
                >
                  {copiedKey === "linkedin-post" ? "✅ Copied Post!" : "📋 1-Click Copy Post"}
                </button>
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {pitches.linkedInPost}
                </pre>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
