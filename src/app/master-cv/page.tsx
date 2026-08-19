"use client";

import { useState } from "react";
import Link from "next/link";

interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  portfolio: string;
}

interface ExperienceItem {
  company: string;
  role: string;
  date: string;
  bullets: string[];
}

interface ProjectItem {
  name: string;
  type: string;
  date: string;
  bullets: string[];
}

interface EducationItem {
  degree: string;
  school: string;
  date: string;
}

interface MasterCvData {
  personalInfo: PersonalInfo;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
}

const DEFAULT_CV_DATA: MasterCvData = {
  personalInfo: {
    name: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    website: "",
    linkedin: "",
    portfolio: "",
  },
  summary: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
};

type EditorTab = "personal" | "skills" | "experience" | "projects" | "education";

export default function MasterCvManagerPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<EditorTab>("personal");

  const [cvData, setCvData] = useState<MasterCvData>(DEFAULT_CV_DATA);

  // New Skill Input state
  const [newSkill, setNewSkill] = useState("");

  // Unlock and load CV data
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/master-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load-cv", password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to decrypt Master CV data");
      }

      const data = await res.json();
      const rawObj = data.masterCvData as Record<string, unknown>;

      // Normalize loaded JSON into strictly typed MasterCvData
      const personalObj = (rawObj.personalInfo as Record<string, string>) || {};
      const normalizedSkills = Array.isArray(rawObj.skills)
        ? (rawObj.skills as string[])
        : typeof rawObj.skills === "object" && rawObj.skills !== null
        ? Object.values(rawObj.skills as Record<string, string[]>).flat()
        : [];

      const normalizedExp = ((rawObj.experience as Record<string, unknown>[]) || []).map((exp) => ({
        company: (exp.company as string) || "",
        role: (exp.role as string) || "",
        date: (exp.date as string) || `${exp.startDate || ""} - ${exp.endDate || ""}`,
        bullets: (exp.bullets as string[]) || (exp.highlights as string[]) || [],
      }));

      const normalizedProj = ((rawObj.projects as Record<string, unknown>[]) || []).map((proj) => ({
        name: (proj.name as string) || "",
        type: (proj.type as string) || "",
        date: (proj.date as string) || "",
        bullets: (proj.bullets as string[]) || (proj.highlights as string[]) || [],
      }));

      const normalizedEdu = ((rawObj.education as Record<string, unknown>[]) || []).map((edu) => ({
        degree: (edu.degree as string) || "",
        school: (edu.school as string) || (edu.institution as string) || "",
        date: (edu.date as string) || `${edu.startDate || ""} - ${edu.endDate || ""}`,
      }));

      setCvData({
        personalInfo: {
          name: personalObj.name || "",
          title: personalObj.title || "",
          location: personalObj.location || "",
          email: personalObj.email || "",
          phone: personalObj.phone || "",
          website: personalObj.website || "",
          linkedin: personalObj.linkedin || "",
          portfolio: personalObj.portfolio || "",
        },
        summary: (rawObj.summary as string) || "",
        skills: normalizedSkills,
        experience: normalizedExp,
        projects: normalizedProj,
        education: normalizedEdu,
      });

      setUnlocked(true);
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-encrypt and save CV data
  const handleSaveCv = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/master-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-cv",
          password,
          masterCvData: cvData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save Master CV data");
      }

      const data = await res.json();
      setSuccessMessage(data.message || "Master CV updated and re-encrypted successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message);
    } finally {
      setSaving(false);
    }
  };

  // Personal Info field change helper
  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  // Skills helpers
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!cvData.skills.includes(newSkill.trim())) {
      setCvData((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Experience array handlers
  const handleAddExperience = () => {
    setCvData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: "New Company", role: "Role Title", date: "2024 - Present", bullets: ["Key achievement bullet point"] },
      ],
    }));
  };

  const handleUpdateExperience = (index: number, field: keyof ExperienceItem, value: unknown) => {
    setCvData((prev) => {
      const updated = [...prev.experience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  };

  const handleRemoveExperience = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  // Projects array handlers
  const handleAddProject = () => {
    setCvData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { name: "New Project", type: "Full-Stack AI App", date: "2024", bullets: ["Project architecture highlight"] },
      ],
    }));
  };

  const handleUpdateProject = (index: number, field: keyof ProjectItem, value: unknown) => {
    setCvData((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const handleRemoveProject = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // Education array handlers
  const handleAddEducation = () => {
    setCvData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { degree: "Bachelor of Science in Engineering", school: "University Name", date: "2020 - 2024" },
      ],
    }));
  };

  const handleUpdateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setCvData((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const handleRemoveEducation = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-indigo-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 dark:bg-cyan-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">🔒 AES-256 Master Vault</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-sm font-semibold animate-fade-in">
            ✅ {successMessage}
          </div>
        )}

        {/* STEP 1: PASSWORD UNLOCK SCREEN */}
        {!unlocked && (
          <div className="flex flex-col gap-8 max-w-md mx-auto w-full py-12">
            <header className="flex flex-col gap-2 text-center">
              <h1 className="text-3xl font-extrabold tracking-tight">Unlock Master CV Vault</h1>
              <p className="text-sm text-zinc-500">
                Enter your decryption password to view, edit, and re-encrypt your master professional experience.
              </p>
            </header>

            <form onSubmit={handleUnlock} className="flex flex-col gap-5 p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-xl">
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="font-semibold text-xs text-zinc-500">Master Decryption Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {loading ? "Decrypting Vault..." : "🔓 Unlock Master CV &rarr;"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: MASTER CV EDITOR INTERFACE */}
        {unlocked && (
          <div className="flex flex-col gap-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-extrabold tracking-tight">Master CV Vault Editor</h1>
                <p className="text-sm text-zinc-500">Update your base profile, experience, projects, and skills natively in-app.</p>
              </div>

              <button
                type="button"
                onClick={handleSaveCv}
                disabled={saving}
                className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto"
              >
                {saving ? "Encrypting & Saving..." : "💾 Save & Re-Encrypt Master CV"}
              </button>
            </header>

            {/* Editor Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              {[
                { id: "personal", label: "👤 Personal & Summary" },
                { id: "skills", label: "💡 Skills & Tags" },
                { id: "experience", label: "💼 Work Experience" },
                { id: "projects", label: "🚀 Featured Projects" },
                { id: "education", label: "🎓 Education" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: PERSONAL & SUMMARY */}
            {activeTab === "personal" && (
              <div className="flex flex-col gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg">
                <h3 className="font-extrabold text-lg border-b border-zinc-200 dark:border-zinc-800 pb-3">Personal & Contact Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pname" className="text-xs font-semibold text-zinc-500">Full Name</label>
                    <input
                      id="pname"
                      type="text"
                      value={cvData.personalInfo.name}
                      onChange={(e) => handlePersonalInfoChange("name", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ptitle" className="text-xs font-semibold text-zinc-500">Professional Title</label>
                    <input
                      id="ptitle"
                      type="text"
                      value={cvData.personalInfo.title}
                      onChange={(e) => handlePersonalInfoChange("title", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ploc" className="text-xs font-semibold text-zinc-500">Location</label>
                    <input
                      id="ploc"
                      type="text"
                      value={cvData.personalInfo.location}
                      onChange={(e) => handlePersonalInfoChange("location", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pemail" className="text-xs font-semibold text-zinc-500">Email Address</label>
                    <input
                      id="pemail"
                      type="email"
                      value={cvData.personalInfo.email}
                      onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pphone" className="text-xs font-semibold text-zinc-500">Phone Number</label>
                    <input
                      id="pphone"
                      type="text"
                      value={cvData.personalInfo.phone}
                      onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plinkedin" className="text-xs font-semibold text-zinc-500">LinkedIn Profile URL</label>
                    <input
                      id="plinkedin"
                      type="text"
                      value={cvData.personalInfo.linkedin}
                      onChange={(e) => handlePersonalInfoChange("linkedin", e.target.value)}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <label htmlFor="psummary" className="text-xs font-semibold text-zinc-500">Base Professional Summary</label>
                  <textarea
                    id="psummary"
                    rows={6}
                    value={cvData.summary}
                    onChange={(e) => setCvData((prev) => ({ ...prev, summary: e.target.value }))}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: SKILLS */}
            {activeTab === "skills" && (
              <div className="flex flex-col gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-lg">
                <h3 className="font-extrabold text-lg border-b border-zinc-200 dark:border-zinc-800 pb-3">Core Competencies & Technical Skills</h3>
                
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    placeholder="Type new skill tag (e.g. Next.js, Go, Docker)..."
                    className="flex-1 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    + Add Skill
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-3">
                  {cvData.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs font-bold"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s)}
                        className="text-indigo-400 hover:text-red-500 font-black cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: WORK EXPERIENCE */}
            {activeTab === "experience" && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg">Work Experience History</h3>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    + Add Experience Entry
                  </button>
                </div>

                {cvData.experience.map((exp, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-4 p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-md relative"
                  >
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                      <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Entry #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(index)}
                        className="text-red-500 hover:underline font-bold text-xs cursor-pointer"
                      >
                        Remove Entry
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Company Name</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => handleUpdateExperience(index, "company", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Role Title</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => handleUpdateExperience(index, "role", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Dates / Duration</label>
                        <input
                          type="text"
                          value={exp.date}
                          onChange={(e) => handleUpdateExperience(index, "date", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold text-zinc-500">Bullet Points (One per line)</label>
                      <textarea
                        rows={4}
                        value={exp.bullets.join("\n")}
                        onChange={(e) => handleUpdateExperience(index, "bullets", e.target.value.split("\n"))}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: FEATURED PROJECTS */}
            {activeTab === "projects" && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg">Featured Projects</h3>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    + Add Project Entry
                  </button>
                </div>

                {cvData.projects.map((proj, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-4 p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-md"
                  >
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                      <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Project #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(index)}
                        className="text-red-500 hover:underline font-bold text-xs cursor-pointer"
                      >
                        Remove Project
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Project Name</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => handleUpdateProject(index, "name", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Project Type / Category</label>
                        <input
                          type="text"
                          value={proj.type}
                          onChange={(e) => handleUpdateProject(index, "type", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Date / Year</label>
                        <input
                          type="text"
                          value={proj.date}
                          onChange={(e) => handleUpdateProject(index, "date", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold text-zinc-500">Project Highlights (One per line)</label>
                      <textarea
                        rows={4}
                        value={proj.bullets.join("\n")}
                        onChange={(e) => handleUpdateProject(index, "bullets", e.target.value.split("\n"))}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 5: EDUCATION */}
            {activeTab === "education" && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg">Education Records</h3>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    + Add Education Record
                  </button>
                </div>

                {cvData.education.map((edu, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-4 p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl shadow-md"
                  >
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/80 pb-2">
                      <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Record #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(index)}
                        className="text-red-500 hover:underline font-bold text-xs cursor-pointer"
                      >
                        Remove Record
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Degree / Qualification</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => handleUpdateEducation(index, "degree", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">School / Institution</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => handleUpdateEducation(index, "school", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-500">Graduation Date / Years</label>
                        <input
                          type="text"
                          value={edu.date}
                          onChange={(e) => handleUpdateEducation(index, "date", e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
