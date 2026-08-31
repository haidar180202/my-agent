# 🚀 My Agent — Autonomous Career & Personal Brand OS

**My Agent** is a comprehensive, AI-powered career automation suite designed to streamline job applications, real-time interview co-piloting, project showcases, and interactive interview preparation. Powered by Next.js 16, Electron Stealth Overlay, Google Gemini 2.5 Flash Multimodal Vision, Web Speech APIs, and AES-256 encrypted local data storage.

---

## 🌟 Key Features & Modules

### 1. 💬 Real-Time Stealth AI Interview Copilot & Vision OCR (`/copilot`)
* **OS-Level Screen-Capture Immunity (`setContentProtection(true)`)**: Runs as an invisible desktop overlay visible to your eyes on physical monitor, but **100% INVISIBLE to Google Meet, Zoom, MS Teams, and OBS screen share**.
* **Multi-Key API Rotation Load Balancer**: Automatically rotates across up to 10 Gemini API keys (`GEMINI_API_KEY_1..10` / `GEMINI_API_KEYS`) with zero-downtime failover on Error 429 / Rate Limitations.
* **Interviewer Question Translation & Core Intent Explanation**: Translates English interviewer questions into natural Indonesian + provides a 1-2 sentence breakdown of what the interviewer is *really* seeking.
* **Stateful Conversation Memory Stack & Directive #12 Guardrails**: Retains context across turns (A ➔ A.1 ➔ A.B) so the AI never loses parent project context or contradicts earlier statements.
* **Unlimited Session Memory & End Meeting Simple Recap**: Keeps track of full call duration until candidate clicks **"🏁 Selesai / End Meeting"**, producing a concise Indonesian summary report.
* **Global Stealth Hotkeys**:
  * `Alt + Shift + H`: Sembunyikan / Tampilkan Overlay Copilot.
  * `Alt + Shift + T`: Toggle Click-Through Mouse Pass-Through.
  * `Alt + S`: Instant Screen Snapshot & Gemini Vision OCR (Solves LeetCode/HackerRank code problems on screen).
  * `Alt + L`: Toggle Live Client Audio Listening Mode.

### 2. 📄 ATS Resume & Cover Letter Generator (`/ats-generate`)
* **Job Description Tailoring**: Analyzes target Job Descriptions and tailors resume bullets and executive summary using 11 Golden Tailoring Rules.
* **Non-Destructive Optimization**: Retains authentic job titles (IFG, PT Bukit Asam Tbk, Pupuk Sriwidjaja) and core technical achievements while weaving domain relevance.
* **Role Misalignment Confirmation Modal**: Interactive modal alerting candidate if target JD domain differs from Master CV background.
* **AI Screening Q&A Assistant**: Automatically answers application portal questions framing candidate as a rapid technical adapter.
* **Exact 2-Page A4 PDF Fit**: Serverless-compatible Puppeteer PDF compilation (`@sparticuz/chromium`) tightened to prevent 1-line spillovers onto Page 3.
* **Standardized File Naming**: Auto-names resume exports as `<Role>_<Company>_CV_<CandidateName>.pdf`.

### 3. 🔒 Encrypted Master CV Storage (`data/master_cv.enc`)
* **AES-256-CBC Encryption**: Your master professional experience, projects, skills, and credentials are encrypted securely in `data/master_cv.enc`.
* **Password Authorization**: All generative AI routes require your decryption password before unlocking data, preventing unauthorized access.

### 4. 🧭 Multi-Agent Workspace Engine Switcher
* **1-Click Workspace Navigation**: Switch seamlessly across all 9 agent workspace engines (`/copilot`, `/ats-generate`, `/master-cv`, `/ai-interview`, `/interview-prep`, `/pitch-builder`, `/video-pipeline`, `/history`).
* **Cross-Platform Desktop Routing**: Cross-platform IPC router for Windows, macOS, and Linux.

### 5. 📊 Application History CRM (`/history`)
* **Local Application Tracking**: Save customized CV JSON schemas, cover letters, ATS scores, and company details directly to browser `localStorage`.

### 6. 🎥 Interactive AI Interview Practice Studio (`/ai-interview` & `/interview-prep`)
* **Simulated Video Call Room**: Interactive practice studio with audio equalizer waveform visualization and live AI subtitle overlay.
* **Constructive Feedback & Scorecards**: Generates objective evaluation reports (1–10) with identified strengths and missing gaps.

### 7. 📹 Video Pipeline & Teleprompter (`/video-pipeline`)
* **Project Storyboarding**: Generates scene-by-scene visual instructions and voiceover scripts.
* **Auto-Scrolling Teleprompter**: Full-screen overlay reader with WPM speed control (90–240 WPM).

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router) + TypeScript
* **Desktop Engine**: Electron + Windows OS Native Display Affinity (`SetWindowDisplayAffinity` / `setContentProtection`)
* **Styling**: Tailwind CSS
* **Generative AI & Multimodal Vision**: `@google/genai` (Gemini 2.5 Flash)
* **PDF Engine**: Puppeteer & `@sparticuz/chromium`
* **Audio & Speech**: Web Speech API (`SpeechRecognition`, `speechSynthesis`) + HTML5 MediaStreams
* **Security**: Node.js `crypto` (AES-256-CBC / scryptSync)

---

## 📁 Directory Structure

```
my-agent/
├── data/
│   └── master_cv.enc          # AES-256-CBC Encrypted Master Resume
├── docs/
│   └── logs/
│       └── DAILY_LOG.md       # Date-Stamped Daily Engineering & Git Push Log
├── electron/
│   └── main.js                # Electron Native Stealth Overlay Main Process
├── public/
│   └── downloads/
│       └── run_copilot.bat    # 1-Click Desktop Launcher Script
├── src/
│   └── app/
│       ├── page.tsx           # Dashboard Homepage Grid
│       ├── copilot/           # Stealth AI Copilot & Vision OCR UI
│       ├── ats-generate/      # ATS Generator & PDF Preview UI
│       ├── history/           # Local Application History CRM UI
│       ├── interview-prep/    # Mock Interview Q&A UI
│       ├── video-pipeline/    # Video Storyboard & Teleprompter UI
│       ├── ai-interview/      # Zoom-Style AI Video Call Room UI
│       └── api/
│           ├── copilot/       # Multi-Key Load Balancer & Copilot Engine
│           ├── generate-ats/  # ATS Tailoring & Puppeteer PDF Route
│           └── ...
├── run_copilot.bat            # 1-Click Desktop Stealth Launcher
└── package.json
```

---

## 📝 Engineering Logs

Check out our detailed date-stamped git push engineering activity logs in [`docs/logs/DAILY_LOG.md`](docs/logs/DAILY_LOG.md).

---

## 🚀 Getting Started

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Multi-Key Rotation Support (Add up to 10 keys for 0-downtime rate limit failover)
GEMINI_API_KEY_1=your_gemini_api_key_1
GEMINI_API_KEY_2=your_gemini_api_key_2
GEMINI_API_KEYS=key1,key2,key3
```

### 2. Desktop Stealth Overlay Launch (1-Click)

Simply double-click [`run_copilot.bat`](run_copilot.bat) on Windows to open the **Native Invisible Stealth Windows Overlay** connected to production Vercel cloud server!
