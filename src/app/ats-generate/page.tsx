"use client";

import { useState } from "react";

export default function AtsGeneratePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ cvUrl?: string; coverLetterUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"cv" | "coverLetter">("cv");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setStatus("Analyzing Job Description...");

    try {
      const res = await fetch("/api/generate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, targetRole, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate documents");
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
            Paste a Job Description to tailor your Master CV and generate ATS-friendly PDFs.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-medium text-sm">Decryption Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter password to decrypt your Master CV"
            />
          </div>

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
            disabled={loading || !jobDescription || !targetRole || !password}
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
          <div className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("cv")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === "cv"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  📄 CV Document
                </button>
                <button
                  onClick={() => setActiveTab("coverLetter")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === "coverLetter"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  ✉️ Cover Letter
                </button>
              </div>

              <div className="flex gap-2">
                {activeTab === "cv" && result.cvUrl && (
                  <a
                    href={result.cvUrl}
                    download="Tailored_CV.pdf"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors flex items-center gap-1.5"
                  >
                    📥 Download CV
                  </a>
                )}
                {activeTab === "coverLetter" && result.coverLetterUrl && (
                  <a
                    href={result.coverLetterUrl}
                    download="Tailored_CoverLetter.pdf"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors flex items-center gap-1.5"
                  >
                    📥 Download Letter
                  </a>
                )}
              </div>
            </div>

            <div className="w-full h-[650px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-950">
              <iframe
                src={activeTab === "cv" ? result.cvUrl : result.coverLetterUrl}
                className="w-full h-full border-none"
                title="Document Preview"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
