"use client";

import { useState } from "react";

export default function AtsGeneratePage() {
  const [step, setStep] = useState<"input" | "edit" | "preview">("input");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // AI Tailored Data
  const [tailoredResume, setTailoredResume] = useState<any>(null);
  const [coverLetterText, setCoverLetterText] = useState("");

  // Resulting PDF URLs
  const [result, setResult] = useState<{ cvUrl?: string; coverLetterUrl?: string } | null>(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"cv" | "coverLetter">("cv");
  const [editorTab, setEditorTab] = useState<"resume" | "coverLetter">("resume");

  // Step 1: Request tailored text from Gemini
  const handleGenerateText = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setStatus("Analyzing Job Description & Tailoring Resume...");

    try {
      const res = await fetch("/api/generate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-text",
          jobDescription,
          targetRole,
          password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate tailored documents");
      }

      const data = await res.json();
      setTailoredResume(data.tailoredResume);
      setCoverLetterText(data.coverLetter);
      setStep("edit");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Request PDF Compilation from Puppeteer using edited data
  const handleGeneratePdf = async () => {
    setLoading(true);
    setError("");
    setStatus("Generating PDF Documents...");

    try {
      const res = await fetch("/api/generate-ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-pdf",
          tailoredResume,
          coverLetterText,
          theme,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to compile PDFs");
      }

      const data = await res.json();
      setResult(data);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resume Editors Helpers
  const handlePersonalInfoChange = (field: string, value: string) => {
    setTailoredResume((prev: any) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const handleSummaryChange = (value: string) => {
    setTailoredResume((prev: any) => ({
      ...prev,
      summary: value,
    }));
  };

  const handleExperienceChange = (index: number, field: string, value: string) => {
    setTailoredResume((prev: any) => {
      const updatedExp = [...prev.experience];
      updatedExp[index] = { ...updatedExp[index], [field]: value };
      return { ...prev, experience: updatedExp };
    });
  };

  const handleExperienceBulletChange = (expIndex: number, bulletIndex: number, value: string) => {
    setTailoredResume((prev: any) => {
      const updatedExp = [...prev.experience];
      const bulletKey = updatedExp[expIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedExp[expIndex][bulletKey] || [])];
      updatedBullets[bulletIndex] = value;
      updatedExp[expIndex] = { ...updatedExp[expIndex], [bulletKey]: updatedBullets };
      return { ...prev, experience: updatedExp };
    });
  };

  const handleAddExperienceBullet = (expIndex: number) => {
    setTailoredResume((prev: any) => {
      const updatedExp = [...prev.experience];
      const bulletKey = updatedExp[expIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedExp[expIndex][bulletKey] || []), ""];
      updatedExp[expIndex] = { ...updatedExp[expIndex], [bulletKey]: updatedBullets };
      return { ...prev, experience: updatedExp };
    });
  };

  const handleDeleteExperienceBullet = (expIndex: number, bulletIndex: number) => {
    setTailoredResume((prev: any) => {
      const updatedExp = [...prev.experience];
      const bulletKey = updatedExp[expIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedExp[expIndex][bulletKey] || [])];
      updatedBullets.splice(bulletIndex, 1);
      updatedExp[expIndex] = { ...updatedExp[expIndex], [bulletKey]: updatedBullets };
      return { ...prev, experience: updatedExp };
    });
  };

  const handleProjectChange = (index: number, field: string, value: string) => {
    setTailoredResume((prev: any) => {
      const updatedProj = [...prev.projects];
      updatedProj[index] = { ...updatedProj[index], [field]: value };
      return { ...prev, projects: updatedProj };
    });
  };

  const handleProjectBulletChange = (projIndex: number, bulletIndex: number, value: string) => {
    setTailoredResume((prev: any) => {
      const updatedProj = [...prev.projects];
      const bulletKey = updatedProj[projIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedProj[projIndex][bulletKey] || [])];
      updatedBullets[bulletIndex] = value;
      updatedProj[projIndex] = { ...updatedProj[projIndex], [bulletKey]: updatedBullets };
      return { ...prev, projects: updatedProj };
    });
  };

  const handleAddProjectBullet = (projIndex: number) => {
    setTailoredResume((prev: any) => {
      const updatedProj = [...prev.projects];
      const bulletKey = updatedProj[projIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedProj[projIndex][bulletKey] || []), ""];
      updatedProj[projIndex] = { ...updatedProj[projIndex], [bulletKey]: updatedBullets };
      return { ...prev, projects: updatedProj };
    });
  };

  const handleDeleteProjectBullet = (projIndex: number, bulletIndex: number) => {
    setTailoredResume((prev: any) => {
      const updatedProj = [...prev.projects];
      const bulletKey = updatedProj[projIndex].bullets ? "bullets" : "highlights";
      const updatedBullets = [...(updatedProj[projIndex][bulletKey] || [])];
      updatedBullets.splice(bulletIndex, 1);
      updatedProj[projIndex] = { ...updatedProj[projIndex], [bulletKey]: updatedBullets };
      return { ...prev, projects: updatedProj };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8 sm:p-20 font-sans text-zinc-900 dark:text-zinc-50">
      <main className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Progress Stepper */}
        <div className="flex items-center justify-center gap-4 mb-4 text-sm font-semibold tracking-wide uppercase">
          <div className={`flex items-center gap-2 ${step === "input" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step === "input" ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-300 dark:border-zinc-800"}`}>1</span>
            <span>Input JD</span>
          </div>
          <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
          <div className={`flex items-center gap-2 ${step === "edit" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step === "edit" ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-300 dark:border-zinc-800"}`}>2</span>
            <span>Review &amp; Edit</span>
          </div>
          <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
          <div className={`flex items-center gap-2 ${step === "preview" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step === "preview" ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-300 dark:border-zinc-800"}`}>3</span>
            <span>Preview PDF</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Input Job Description & Role */}
        {step === "input" && (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="text-4xl font-bold tracking-tight">ATS Generator</h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Paste a Job Description to tailor your Master CV and Cover Letter.
              </p>
            </header>

            <form onSubmit={handleGenerateText} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
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

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-2 flex-1">
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

                <div className="flex flex-col gap-2 w-full sm:w-64">
                  <label htmlFor="theme" className="font-medium text-sm">Resume Theme</label>
                  <select
                    id="theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="classic">Classic (Black &amp; White)</option>
                    <option value="modern-blue">Modern Blue (Tech / Fintech)</option>
                    <option value="emerald">Emerald Green (Creative / Startup)</option>
                  </select>
                </div>
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
                  "Tailor CV & Cover Letter"
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: Review & Edit the texts */}
        {step === "edit" && tailoredResume && (
          <>
            <header className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Review &amp; Edit Drafts</h1>
                <button
                  onClick={() => setStep("input")}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm transition-colors"
                >
                  &larr; Back to Input
                </button>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                AI has tailored your resume and cover letter. Tweak the details below before compiling the final PDFs.
              </p>
            </header>

            <div className="flex flex-col gap-6 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              
              {/* Tab Selector */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-4">
                <button
                  onClick={() => setEditorTab("resume")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    editorTab === "resume"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  📄 Edit Resume Details
                </button>
                <button
                  onClick={() => setEditorTab("coverLetter")}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    editorTab === "coverLetter"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  ✉️ Edit Cover Letter Text
                </button>
              </div>

              {/* EDITOR PANEL: RESUME */}
              {editorTab === "resume" && (
                <div className="flex flex-col gap-8">
                  
                  {/* Personal Info */}
                  <div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-6">
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Personal Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-500">Name</label>
                        <input
                          type="text"
                          value={tailoredResume.personalInfo?.name || ""}
                          onChange={(e) => handlePersonalInfoChange("name", e.target.value)}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-500">Title</label>
                        <input
                          type="text"
                          value={tailoredResume.personalInfo?.title || ""}
                          onChange={(e) => handlePersonalInfoChange("title", e.target.value)}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-500">Location</label>
                        <input
                          type="text"
                          value={tailoredResume.personalInfo?.location || ""}
                          onChange={(e) => handlePersonalInfoChange("location", e.target.value)}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-zinc-500">Email</label>
                        <input
                          type="text"
                          value={tailoredResume.personalInfo?.email || ""}
                          onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="flex flex-col gap-2 border-b border-zinc-100 dark:border-zinc-800/50 pb-6">
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Professional Summary</h3>
                    <textarea
                      rows={5}
                      value={tailoredResume.summary || ""}
                      onChange={(e) => handleSummaryChange(e.target.value)}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm resize-y leading-relaxed w-full"
                    />
                  </div>

                  {/* Experience */}
                  <div className="flex flex-col gap-6 border-b border-zinc-100 dark:border-zinc-800/50 pb-6">
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Work Experience</h3>
                    {(tailoredResume.experience || []).map((exp: any, expIndex: number) => {
                      const bulletKey = exp.bullets ? "bullets" : "highlights";
                      return (
                        <div key={expIndex} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Company</label>
                              <input
                                type="text"
                                value={exp.company || ""}
                                onChange={(e) => handleExperienceChange(expIndex, "company", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Role</label>
                              <input
                                type="text"
                                value={exp.role || ""}
                                onChange={(e) => handleExperienceChange(expIndex, "role", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Dates</label>
                              <input
                                type="text"
                                value={exp.date || exp.startDate || ""}
                                onChange={(e) => handleExperienceChange(expIndex, exp.date ? "date" : "startDate", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-zinc-500">Tailored Achievements (Bullets)</label>
                            {(exp[bulletKey] || []).map((bullet: string, bulletIndex: number) => (
                              <div key={bulletIndex} className="flex gap-2 items-center">
                                <span className="text-zinc-400 text-sm">•</span>
                                <input
                                  type="text"
                                  value={bullet}
                                  onChange={(e) => handleExperienceBulletChange(expIndex, bulletIndex, e.target.value)}
                                  className="flex-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExperienceBullet(expIndex, bulletIndex)}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                                  title="Delete bullet"
                                >
                                  ❌
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddExperienceBullet(expIndex)}
                              className="mt-1 self-start px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                            >
                              + Add Bullet Point
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Projects */}
                  <div className="flex flex-col gap-6">
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">AI Featured Projects</h3>
                    {(tailoredResume.projects || []).map((proj: any, projIndex: number) => {
                      const bulletKey = proj.bullets ? "bullets" : "highlights";
                      return (
                        <div key={projIndex} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Project Name</label>
                              <input
                                type="text"
                                value={proj.name || ""}
                                onChange={(e) => handleProjectChange(projIndex, "name", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Project Subtitle / Type</label>
                              <input
                                type="text"
                                value={proj.type || ""}
                                onChange={(e) => handleProjectChange(projIndex, "type", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-zinc-500">Date</label>
                              <input
                                type="text"
                                value={proj.date || ""}
                                onChange={(e) => handleProjectChange(projIndex, "date", e.target.value)}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-zinc-500">Project Bullets</label>
                            {(proj[bulletKey] || []).map((bullet: string, bulletIndex: number) => (
                              <div key={bulletIndex} className="flex gap-2 items-center">
                                <span className="text-zinc-400 text-sm">•</span>
                                <input
                                  type="text"
                                  value={bullet}
                                  onChange={(e) => handleProjectBulletChange(projIndex, bulletIndex, e.target.value)}
                                  className="flex-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProjectBullet(projIndex, bulletIndex)}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                                  title="Delete bullet"
                                >
                                  ❌
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddProjectBullet(projIndex)}
                              className="mt-1 self-start px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                            >
                              + Add Bullet Point
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* EDITOR PANEL: COVER LETTER */}
              {editorTab === "coverLetter" && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Cover Letter</h3>
                  <textarea
                    rows={18}
                    value={coverLetterText}
                    onChange={(e) => setCoverLetterText(e.target.value)}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-transparent text-sm resize-y leading-relaxed w-full font-mono"
                    placeholder="Review and modify the cover letter text..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-4">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={loading}
                  className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
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
                    "Compile & Generate PDFs 🚀"
                  )}
                </button>
              </div>

            </div>
          </>
        )}

        {/* STEP 3: Preview and Download PDFs */}
        {step === "preview" && result && (
          <>
            <header className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Your PDF Documents</h1>
                <button
                  onClick={() => setStep("edit")}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm transition-colors"
                >
                  &larr; Back to Editor
                </button>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your customized, ATS-optimized PDF files are successfully generated.
              </p>
            </header>

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
                      download={`${targetRole.replace(/\s+/g, "_")}_CV.pdf`}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors flex items-center gap-1.5"
                    >
                      📥 Download CV
                    </a>
                  )}
                  {activeTab === "coverLetter" && result.coverLetterUrl && (
                    <a
                      href={result.coverLetterUrl}
                      download={`${targetRole.replace(/\s+/g, "_")}_CoverLetter.pdf`}
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
          </>
        )}
      </main>
    </div>
  );
}
