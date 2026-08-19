import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-24 sm:py-32 flex flex-col gap-16">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium tracking-wide">System Online</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
            My Agent Workspace
          </h1>
          
          <p className="max-w-2xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your personal, AI-driven automation suite. Streamline career workflows, generate dynamic documents, and scale your productivity instantly.
          </p>
        </section>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Active Tool: ATS Generator */}
          <Link href="/ats-generate" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">ATS Generator</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Automatically tailor your Master CV and Cover Letter against any Job Description using multi-agent LLM pipelines.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Launch App &rarr;
            </div>
          </Link>

          {/* Active Tool: Interview Prep */}
          <Link href="/interview-prep" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-955/30 text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Interview Prep</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Tailored technical, behavioral, and system design mock interviews with instant AI feedback.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Launch App &rarr;
            </div>
          </Link>

          {/* Active Tool: Application History */}
          <Link href="/history" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Application History</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Track your customized CVs, cover letters, and mock interview scores for every company in one place.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-amber-600 dark:text-amber-450 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              View History &rarr;
            </div>
          </Link>

          {/* Active Tool: Video Pipeline */}
          <Link href="/video-pipeline" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Video Pipeline</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Automated video generation scripts and a scrolling teleprompter player for portfolio showcases.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-rose-600 dark:text-rose-450 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Launch App &rarr;
            </div>
          </Link>

          {/* Active Tool: Master CV Manager */}
          <Link href="/master-cv" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-indigo-200/60 dark:border-indigo-800/50 backdrop-blur-xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-6 right-6 px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <span>🔒</span> AES-256 VAULT
            </div>
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Master CV Vault</h2>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Manage, update, and re-encrypt your master experience, projects, skills, and education securely in-app.
              </p>
            </div>

            <div className="relative z-10 mt-8 flex items-center text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Manage Master CV &rarr;
            </div>
          </Link>

        </section>
      </main>
    </div>
  );
}
