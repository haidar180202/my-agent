"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";

interface Question {
  id: number;
  question: string;
  category: string;
  context: string;
}

interface Evaluation {
  score: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  modelAnswer: string;
}

interface Attempt {
  question: Question;
  userAnswer: string;
  evaluation: Evaluation;
}

export default function InterviewPrepPage() {
  const [step, setStep] = useState<"setup" | "interview" | "summary">("setup");
  
  // Setup inputs
  const [targetRole, setTargetRole] = useState("");
  const [interviewType, setInterviewType] = useState("Mixed");
  const [jobDescription, setJobDescription] = useState("");
  const [password, setPassword] = useState("");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  
  // Active session states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeEvaluation, setActiveEvaluation] = useState<Evaluation | null>(null);
  
  // Expanded question state in final summary
  const [expandedSummaryIndex, setExpandedSummaryIndex] = useState<number | null>(null);

  // Generate Questions from API
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("Analyzing Job Description & Generating Questions...");
    
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-questions",
          password,
          jobDescription,
          targetRole,
          interviewType,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate interview questions");
      }
      
      const data = await res.json();
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAttempts([]);
      setActiveEvaluation(null);
      setUserAnswer("");
      setStep("interview");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Evaluate single answer from API
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setLoading(true);
    setError("");
    setStatus("Evaluating Answer...");
    
    const activeQuestion = questions[currentIndex];
    
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate-answer",
          password,
          question: activeQuestion.question,
          userAnswer,
          targetRole,
          jobDescription,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to evaluate response");
      }
      
      const data = await res.json();
      const evaluation = data.evaluation;
      setActiveEvaluation(evaluation);
      
      // Save attempt
      setAttempts((prev) => [
        ...prev,
        {
          question: activeQuestion,
          userAnswer,
          evaluation,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle transition to next question or final summary
  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setActiveEvaluation(null);
    } else {
      setStep("summary");
    }
  };

  // Calculate final score average
  const getAverageScore = () => {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((acc, attempt) => acc + attempt.evaluation.score, 0);
    return Math.round((total / attempts.length) * 10) / 10;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 dark:bg-emerald-600/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-teal-600/10 dark:bg-teal-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col gap-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm font-semibold tracking-wide transition-colors">
            &larr; Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">Interview System v1.1</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 font-medium animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Setup Form */}
        {step === "setup" && (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white">
                Mock Interview Prep
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Setup a simulated mock interview. Paste the Job Description, choose your interview focus, and verify with your decryption password to begin.
              </p>
            </header>

            <form onSubmit={handleStartInterview} className="flex flex-col gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg">
              
              {/* Password Protection input */}
              <div className="flex flex-col gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                <label htmlFor="password" className="font-semibold text-sm text-zinc-500">Decryption Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="Enter password to authenticate and access interview prep"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label htmlFor="targetRole" className="font-semibold text-sm text-zinc-500">Target Role</label>
                  <input
                    id="targetRole"
                    type="text"
                    required
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-64">
                  <label htmlFor="type" className="font-semibold text-sm text-zinc-500">Interview Focus</label>
                  <select
                    id="type"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm cursor-pointer"
                  >
                    <option value="Mixed">Mixed Questions</option>
                    <option value="Technical">Technical / Coding</option>
                    <option value="Behavioral">Behavioral / HR</option>
                    <option value="System Design">System Design</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="jd" className="font-semibold text-sm text-zinc-500">Job Description</label>
                <textarea
                  id="jd"
                  required
                  rows={8}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-y text-sm leading-relaxed"
                  placeholder="Paste the target job description here..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !jobDescription || !targetRole || !password}
                className="w-full sm:w-auto self-start px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
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
                  "Generate Mock Interview Questions &rarr;"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Active Interview Wizard */}
        {step === "interview" && questions.length > 0 && (
          <div className="flex flex-col gap-6">
            
            {/* Progress Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold text-zinc-500">
                <span>Active Interview: {targetRole}</span>
                <span>Question {currentIndex + 1} of {questions.length}</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="flex flex-col gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg">
              
              {/* Question Header */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
                  {questions[currentIndex].category}
                </span>
                <span className="text-xs text-zinc-400 font-semibold tracking-wide">
                  Target: {questions[currentIndex].context}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-2xl font-bold leading-snug">
                {questions[currentIndex].question}
              </h2>

              {/* Answer Field (Only editable if not evaluated yet) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500">Your Response</label>
                <textarea
                  rows={6}
                  value={userAnswer}
                  disabled={loading || activeEvaluation !== null}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm leading-relaxed"
                  placeholder="Type your structured answer here..."
                />
              </div>

              {/* Action Trigger */}
              {!activeEvaluation && (
                <button
                  type="button"
                  disabled={loading || !userAnswer.trim()}
                  onClick={handleSubmitAnswer}
                  className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 self-start cursor-pointer"
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
                    "Submit Answer for Evaluation &rarr;"
                  )}
                </button>
              )}
            </div>

            {/* AI Evaluation View */}
            {activeEvaluation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg transition-all duration-300">
                
                {/* Score Column */}
                <div className="flex flex-col items-center justify-center text-center gap-3 border-r border-zinc-100 dark:border-zinc-800 pb-6 md:pb-0">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">AI Evaluator Score</span>
                  <div className={`w-28 h-28 rounded-full border-[6px] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 ${
                    activeEvaluation.score >= 8
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500"
                      : activeEvaluation.score >= 5
                      ? "text-amber-600 dark:text-amber-400 border-amber-500"
                      : "text-rose-600 dark:text-rose-400 border-rose-500"
                  }`}>
                    <span className="text-3xl font-black">{activeEvaluation.score}/10</span>
                  </div>
                  <span className="text-xs text-zinc-400 italic">Objective standard</span>
                </div>

                {/* Strengths & Improvements Column */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider mb-2">Evaluator Summary</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {activeEvaluation.feedback}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                    
                    {/* Strengths */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Strengths</h4>
                      {activeEvaluation.strengths.map((str, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          <span>✓</span>
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>

                    {/* Areas for Improvement */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Areas to Improve</h4>
                      {activeEvaluation.gaps.map((gap, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          <span>⚠</span>
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Model Answer Accordion */}
                  <details className="group border-t border-zinc-100 dark:border-zinc-850 pt-4 cursor-pointer">
                    <summary className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider select-none outline-none">
                      <span>💡 View Ideal Response</span>
                      <span className="transition-transform group-open:rotate-180 font-bold">&darr;</span>
                    </summary>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 font-sans leading-relaxed whitespace-pre-line border border-zinc-100 dark:border-zinc-900/50">
                      {activeEvaluation.modelAnswer}
                    </p>
                  </details>

                  {/* Wizard Control to Next */}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="mt-2 self-end px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {currentIndex + 1 < questions.length ? "Proceed to Next Question &rarr;" : "Finish Interview & View Summary &rarr;"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Final Session Summary Dashboard */}
        {step === "summary" && attempts.length > 0 && (
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-2 items-center text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                Interview Prep Completed!
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                You have completed all mock interview questions for {targetRole}.
              </p>
            </header>

            {/* Score Ring */}
            <div className="bg-white/60 dark:bg-zinc-900/40 p-8 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl shadow-lg flex flex-col items-center justify-center text-center gap-4">
              <span className="text-xs font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">Overall Assessment Score</span>
              
              <div className={`w-36 h-36 rounded-full border-8 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 ${
                getAverageScore() >= 8
                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-500"
                  : getAverageScore() >= 5
                  ? "text-amber-600 dark:text-amber-400 border-amber-500"
                  : "text-rose-600 dark:text-rose-400 border-rose-500"
              }`}>
                <span className="text-4xl font-black">{getAverageScore()}/10</span>
                <span className="text-[10px] uppercase font-bold tracking-widest">Average</span>
              </div>

              <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                {getAverageScore() >= 8
                  ? "Outstanding job! You demonstrate strong technical expertise and behavioral alignment matching the target role description."
                  : getAverageScore() >= 5
                  ? "Good baseline preparation. Review the gaps highlighted under each question to elevate details and vocabulary."
                  : "Needs focus. Dedicate more study time to reviewing core skills and mock interview model responses."}
              </p>
            </div>

            {/* Accordion Questions History */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Question Performance Breakdown</h3>
              
              {attempts.map((attempt, index) => {
                const isExpanded = expandedSummaryIndex === index;
                return (
                  <div key={index} className="bg-white/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedSummaryIndex(isExpanded ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-900/20 cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 px-2.5 py-1 rounded-lg">
                          Q{index + 1}
                        </span>
                        <span className="font-semibold text-sm leading-tight text-zinc-800 dark:text-zinc-200">
                          {attempt.question.question.length > 75 ? attempt.question.question.substring(0, 75) + "..." : attempt.question.question}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-black ${
                          attempt.evaluation.score >= 8
                            ? "text-emerald-600 dark:text-emerald-400"
                            : attempt.evaluation.score >= 5
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}>
                          Score: {attempt.evaluation.score}/10
                        </span>
                        <span className="text-zinc-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-6 border-t border-zinc-100 dark:border-zinc-850 flex flex-col gap-6 bg-zinc-50/20 dark:bg-zinc-950/10 transition-all duration-300">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Full Question</h4>
                          <p className="text-sm font-semibold text-zinc-855 dark:text-zinc-100 leading-snug">
                            {attempt.question.question}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Your Answer</h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-450 leading-relaxed font-mono whitespace-pre-wrap p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-950/50">
                            {attempt.userAnswer}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Detailed Feedback</h4>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {attempt.evaluation.feedback}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Strengths</h4>
                            {attempt.evaluation.strengths.map((str, i) => (
                              <div key={i} className="flex gap-2 items-start text-xs text-zinc-500 dark:text-zinc-400">
                                <span>✓</span>
                                <span>{str}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-2">
                            <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Areas to Improve</h4>
                            {attempt.evaluation.gaps.map((gap, i) => (
                              <div key={i} className="flex gap-2 items-start text-xs text-zinc-500 dark:text-zinc-400">
                                <span>⚠</span>
                                <span>{gap}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Ideal Model Response</h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-zinc-100/30 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-zinc-850">
                            {attempt.evaluation.modelAnswer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Restart Control */}
            <button
              onClick={() => {
                setStep("setup");
                setQuestions([]);
                setAttempts([]);
                setActiveEvaluation(null);
                setUserAnswer("");
              }}
              className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-2 self-center cursor-pointer shadow-md hover:shadow-lg"
            >
              Start New Mock Interview &orarr;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
