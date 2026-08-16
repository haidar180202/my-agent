# 🚀 My Agent — Autonomous Career & Personal Brand OS

**My Agent** is a comprehensive, AI-powered career automation suite designed to streamline job applications, project showcases, and interview preparation. Powered by Next.js, Google Gemini, Web Speech APIs, and AES-256 encrypted local data storage.

---

## 🌟 Key Features & Modules

### 1. 🔒 Encrypted Master CV Storage (`data/master_cv.enc`)
* **AES-256-CBC Encryption**: Your master professional experience, projects, skills, and credentials are encrypted securely in `data/master_cv.enc`.
* **Password Authorization**: All generative AI routes require your decryption password before unlocking data, preventing unauthorized access.
* **CLI Management**: Encrypt and update master resume data natively using Node.js ES modules (`node scripts/encrypt.mjs`).

### 2. 📄 ATS Resume & Cover Letter Generator (`/ats-generate`)
* **Job Description Tailoring**: Analyzes target Job Descriptions and tailors your resume bullets and professional summary using Gemini 2.5/3.x.
* **ATS Match Score & Missing Keywords**: Calculates real-time ATS match percentages (0–100%) and highlights critical technical keywords to emphasize.
* **1-Page Cover Letter**: Generates a compelling, targeted 1-page cover letter addressing the hiring team.
* **Live Re-evaluation Trigger**: Re-evaluate ATS match scores instantly upon manual edits without re-generating full documents.
* **Pixel-Perfect PDF Export**: Serverless-compatible Puppeteer PDF compilation (`@sparticuz/chromium`) with customizable visual themes (*Classic*, *Modern Blue*, *Emerald*).

### 3. 📊 Application History CRM (`/history`)
* **Local Application Tracking**: Save customized CV JSON schemas, cover letters, ATS scores, and company details directly to browser `localStorage`.
* **Restore & Edit Drafts**: Preloads past entries back into the generator via `sessionStorage` for fast updates and re-exports.

### 4. 🎯 Tailored Mock Interview Suite (`/interview-prep`)
* **JD-Specific Question Generation**: Generates 5 tailored technical, behavioral, and architectural questions based on target roles.
* **Objective AI Evaluation**: Scores candidate answers (1–10) with constructive feedback, identified strengths, missing gaps, and gold-standard model answers.
* **Performance Scorecard**: End-of-session scorecard summarizing overall readiness.

### 5. 📹 Video Showcase Pipeline & Teleprompter (`/video-pipeline`)
* **Project Showcase Storyboarding**: Generates scene-by-scene visual instructions, voiceover narration scripts, and audio cues for project showcases.
* **Multiple Formats & Tones**: Supports *TikTok/Shorts (60s)*, *LinkedIn Showcase (2m)*, and *YouTube Explainer (5m)* in Tech Influencer, Corporate, or Indie Hacker tones.
* **Auto-Scrolling Teleprompter**: Full-screen overlay reader with WPM speed control (90–240 WPM), font size adjustment, play/pause, and scroll reset.

### 6. 🎥 Zoom-Style AI Live Video & Audio Call Room (`/ai-interview`)
* **Simulated Video Call**: Practice interviews in an interactive Zoom/Google Meet room interface.
* **AI Interviewer Frame**: Features a dynamic audio equalizer waveform visualization and live AI subtitle overlay when speaking.
* **Candidate Camera & STT**: HTML5 webcam stream (`navigator.mediaDevices.getUserMedia`) with real-time Speech-to-Text (`webkitSpeechRecognition`) transcription preview.
* **Zero-Cost Audio Architecture**: Uses native `window.speechSynthesis` (TTS) and browser speech recognition (STT) for 100% free audio operation.
* **Post-Call Analytics Scorecard**: Generates an end-of-call executive assessment report with overall match scores, demonstrated strengths, and key gaps.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router) + TypeScript
* **Styling**: Tailwind CSS
* **Generative AI**: `@google/genai` (Gemini 2.5 Flash / Gemini 3.x)
* **PDF Engine**: Puppeteer & `@sparticuz/chromium`
* **Audio & Media**: Web Speech API (`window.speechSynthesis`, `webkitSpeechRecognition`) + HTML5 MediaStreams
* **Security**: Node.js `crypto` (AES-256-CBC / scryptSync)

---

## 📁 Directory Structure

```
my-agent/
├── data/
│   └── master_cv.enc          # AES-256-CBC Encrypted Master Resume
├── scripts/
│   └── encrypt.mjs            # Standalone ESM encryption script
├── src/
│   └── app/
│       ├── page.tsx           # Dashboard Homepage Grid
│       ├── ats-generate/      # ATS Generator & PDF Preview UI
│       ├── history/           # Local Application History CRM UI
│       ├── interview-prep/    # Text-based Mock Interview UI
│       ├── video-pipeline/    # Video Storyboard & Teleprompter UI
│       ├── ai-interview/      # Zoom-Style AI Video Call Room UI
│       └── api/
│           ├── generate-ats/    # ATS Tailoring & Puppeteer PDF Route
│           ├── interview-prep/  # Interview Questions & Evaluation Route
│           ├── video-pipeline/  # Video Script Generator Route
│           └── ai-interview/    # Live Video Call Conversational Route
└── package.json
```

---

## 🚀 Getting Started

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
RESUME_PASSWORD=your_local_decryption_password
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Encrypt / Update Master CV

Place your unencrypted CV details in a temporary JSON file and encrypt it:

```bash
node scripts/encrypt.mjs
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Quality & Compliance

* **Strict TypeScript**: 100% type safety with zero `any` parameters.
* **ESLint Verified**: Conforms natively to strict ESLint guidelines with zero `eslint-disable` override hacks.
* **Production Verified**: Next.js Turbopack production build verified (`npm run build`).

---

## 📄 License

Private & Personal Workstation Project — Built by Muhammad Haidar Shahab.
