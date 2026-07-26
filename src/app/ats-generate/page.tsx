"use client";

import { useState } from "react";

export default function AtsGeneratePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ cvUrl?: string; coverLetterUrl?: string } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setStatus("Analyzing Job Description...");

    try {
      const res = await fetch("/api/generate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, targetRole }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate documents");
      }

      setStatus("Generating PDFs...");
      const data = await res.json();
      setResult(data);
      setStatus("Done!");
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8 sm:p-20 font-sans text-zinc-900 dark:text-zinc-50">
      <main className="max-w-4xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">ATS Generator</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Paste a Job Description to automatically tailor your Master CV and generate ATS-friendly PDFs.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            <label htmlFor="targetRole" className="font-medium text-sm">Target Role (e.g. Senior Frontend Engineer)</label>
            <input
              id="targetRole"
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter the role you are applying for"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="jd" className="font-medium text-sm">Job Description</label>
            <textarea
              id="jd"
              required
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y"
              placeholder="Paste the full job description here..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !jobDescription || !targetRole}
            className="w-full sm:w-auto self-start px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              "Generate Documents"
            )}
          </button>
        </form>

        {result && (
          <div className="flex flex-col gap-4 bg-green-50 dark:bg-green-900/20 p-8 rounded-2xl border border-green-200 dark:border-green-800">
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300">✅ Generation Complete</h2>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              {result.cvUrl && (
                <a
                  href={result.cvUrl}
                  download="Tailored_CV.pdf"
                  className="px-5 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  📄 Download CV (PDF)
                </a>
              )}
              {result.coverLetterUrl && (
                <a
                  href={result.coverLetterUrl}
                  download="Tailored_CoverLetter.pdf"
                  className="px-5 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  ✉️ Download Cover Letter (PDF)
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
