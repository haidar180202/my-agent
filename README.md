# My Agent (ATS & Automation Tools)

My Agent is a comprehensive internal automation suite designed to streamline career applications and personal workflows. The core feature currently implemented is an automated ATS Resume and Cover Letter Generator powered by a resilient Multi-Agent AI pipeline.

## 🚀 Features

- **ATS Generator (`/ats-generate`)**: Automatically tailor your master CV and Cover Letter based on a specific Job Description. Outputs perfectly formatted PDFs ready for ATS parsing.
- **Resilient AI Pipeline**: Uses powerful cloud LLMs (Gemini/OpenAI) by default, with an automatic retry mechanism and a seamless fallback to local Ollama (`http://localhost:11434`) ensuring 100% sustained uptime.
- **Data-Driven**: Reads base experience and skills directly from a highly customizable `master_cv.json` file inside the repository. No need to repeatedly upload CV data.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend File Generation**: Puppeteer (HTML to PDF)
- **AI Integration**: Custom Agentic Pipeline (REST API calls + Fallback logic)

## 📁 Directory Structure

- `/src/app/ats-generate`: Frontend UI for ATS generation.
- `/src/app/api/generate-ats`: Backend logic handling AI manipulation and PDF generation.
- `/data/master_cv.json`: The singular source of truth for your professional experience.

*(More automation features, such as video generation pipelines, will be added incrementally).*
