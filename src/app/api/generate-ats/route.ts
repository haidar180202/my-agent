import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface PersonalInfo {
  name?: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  portfolio?: string;
}

interface Experience {
  company?: string;
  role?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
  highlights?: string[];
}

interface Project {
  name?: string;
  type?: string;
  date?: string;
  bullets?: string[];
  highlights?: string[];
}

interface Education {
  degree?: string;
  school?: string;
  institution?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface TailoredResume {
  personalInfo?: PersonalInfo;
  summary?: string;
  keyHighlights?: string[];
  experience?: Experience[];
  projects?: Project[];
  skills?: string[] | Record<string, string[]>;
  education?: Education[];
}

interface ChromiumInterface {
  args: string[];
  defaultViewport: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };
  executablePath: () => Promise<string>;
  headless: boolean | string;
}

// Helper to convert Markdown syntax (**bold**, headers, bullets) to clean native HTML tags
function formatMarkdownBold(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/#{1,6}\s*(.*)/g, "<strong>$1</strong>")
    .replace(/^[\*\-]\s+(.*)/gm, "• $1");
}

// HTML Generator Helper (A4 Precision & ATS Executive Design)
function generateHtml(resumeData: TailoredResume, theme = "classic") {
  let primaryColor = "#0f172a"; // Executive Dark Slate
  let headerColor = "#0f172a";
  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  let sectionBorder = "1.5px solid #0f172a";
  let secondaryColor = "#475569";

  if (theme === "modern-blue") {
    primaryColor = "#1e40af"; // Deep Navy/Royal Blue
    headerColor = "#1e3a8a";
    sectionBorder = "1.5px solid #1e40af";
    secondaryColor = "#334155";
  } else if (theme === "emerald") {
    primaryColor = "#047857"; // Deep Emerald Green
    headerColor = "#064e3b";
    sectionBorder = "1.5px solid #047857";
    secondaryColor = "#334155";
  }

  // Robust skills extraction
  const skillsList = Array.isArray(resumeData.skills)
    ? resumeData.skills
    : typeof resumeData.skills === "object" && resumeData.skills !== null
      ? Object.values(resumeData.skills).flat()
      : [];

  const contactItems = [
    resumeData.personalInfo?.location,
    resumeData.personalInfo?.phone,
    resumeData.personalInfo?.email,
    resumeData.personalInfo?.linkedin,
    resumeData.personalInfo?.portfolio,
  ].filter(Boolean);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>${resumeData.personalInfo?.name || "Executive Resume"}</title>
      <style>
          @page {
              size: A4 portrait;
              margin: 0;
          }
          * {
              box-sizing: border-box;
          }
          body {
              font-family: ${fontStack};
              font-size: 9pt;
              line-height: 1.38;
              color: #1e293b;
              background: #ffffff;
              margin: 0 auto;
              padding: 10mm 14mm;
              width: 210mm;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
          }
          .header {
              text-align: center;
              margin-bottom: 8px;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 6px;
          }
          h1 {
              font-size: 18pt;
              font-weight: 800;
              letter-spacing: -0.02em;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              color: ${headerColor};
          }
          .role-title {
              font-size: 9.5pt;
              font-weight: 600;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
          }
          .contact-info {
              text-align: center;
              font-size: 8.5pt;
              color: ${secondaryColor};
              font-weight: 500;
          }
          .contact-info span {
              margin: 0 4px;
          }
          .section-block {
              margin-bottom: 8px;
              break-inside: auto;
              page-break-inside: auto;
          }
          .section-title {
              font-size: 10pt;
              font-weight: 750;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: ${sectionBorder};
              color: ${headerColor};
              margin-top: 8px;
              margin-bottom: 4px;
              padding-bottom: 1px;
              break-after: avoid;
              page-break-after: avoid;
          }
          p.summary-text {
              margin: 0;
              text-align: justify;
              color: #334155;
              font-size: 9pt;
              line-height: 1.38;
          }
          .skills-container {
              font-size: 8.5pt;
              color: #334155;
              line-height: 1.45;
              font-weight: 500;
          }
          .job-item, .project-item {
              margin-bottom: 6px;
              break-inside: avoid;
              page-break-inside: avoid;
          }
          .job-header {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 9pt;
              margin-bottom: 1px;
          }
          .company-name {
              font-weight: 700;
              color: #0f172a;
          }
          .job-title {
              font-weight: 600;
              color: ${primaryColor};
          }
          .job-date {
              font-size: 8pt;
              font-weight: 500;
              color: #64748b;
              white-space: nowrap;
          }
          ul.bullet-list {
              margin: 2px 0 4px 0;
              padding-left: 15px;
          }
          ul.bullet-list li {
              margin-bottom: 1.5px;
              text-align: justify;
              color: #334155;
              font-size: 8.5pt;
              line-height: 1.35;
          }
          ul.bullet-list li strong {
              color: #0f172a;
              font-weight: 650;
          }
          .education-item {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 9pt;
              margin-bottom: 3px;
              break-inside: avoid;
              page-break-inside: avoid;
          }
          .degree-title {
              font-weight: 700;
              color: #0f172a;
          }
          .school-name {
              font-weight: 500;
              color: ${secondaryColor};
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</h1>
          ${resumeData.personalInfo?.title ? `<div class="role-title">${resumeData.personalInfo.title}</div>` : ""}
          <div class="contact-info">
              ${contactItems.join(" &nbsp;•&nbsp; ")}
          </div>
      </div>

      ${resumeData.summary ? `
      <div class="section-block">
          <div class="section-title">PROFESSIONAL SUMMARY</div>
          <p class="summary-text">${formatMarkdownBold(resumeData.summary)}</p>
      </div>
      ` : ""}

      ${(resumeData.keyHighlights || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">KEY PROFESSIONAL HIGHLIGHTS</div>
          <ul class="bullet-list">
              ${(resumeData.keyHighlights || []).map((h: string) => `<li>${formatMarkdownBold(h)}</li>`).join("")}
          </ul>
      </div>
      ` : ""}

      ${skillsList.length > 0 ? `
      <div class="section-block">
          <div class="section-title">CORE COMPETENCIES &amp; TECHNOLOGIES</div>
          <div class="skills-container">
              ${skillsList.join(" &nbsp;•&nbsp; ")}
          </div>
      </div>
      ` : ""}

      ${(resumeData.experience || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">PROFESSIONAL EXPERIENCE</div>
          ${(resumeData.experience || [])
            .map(
              (exp: Experience) => `
              <div class="job-item">
                  <div class="job-header">
                      <span><span class="company-name">${exp.company || ""}</span> — <span class="job-title">${exp.role || ""}</span></span>
                      <span class="job-date">${exp.date || `${exp.startDate || ""} - ${exp.endDate || ""}`}</span>
                  </div>
                  <ul class="bullet-list">
                      ${(exp.bullets || exp.highlights || []).map((b: string) => `<li>${formatMarkdownBold(b)}</li>`).join("")}
                  </ul>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}

      ${(resumeData.projects || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">FEATURED PROJECTS</div>
          ${(resumeData.projects || [])
            .map(
              (proj: Project) => `
              <div class="project-item">
                  <div class="job-header">
                      <span><span class="company-name">${proj.name || ""}</span> ${proj.type ? `— <span class="job-title">${proj.type}</span>` : ""}</span>
                      <span class="job-date">${proj.date || ""}</span>
                  </div>
                  <ul class="bullet-list">
                      ${(proj.bullets || proj.highlights || []).map((b: string) => `<li>${formatMarkdownBold(b)}</li>`).join("")}
                  </ul>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}

      ${(resumeData.education || []).length > 0 ? `
      <div class="section-block">
          <div class="section-title">EDUCATION</div>
          ${(resumeData.education || [])
            .map(
              (edu: Education) => `
              <div class="education-item">
                  <span><span class="degree-title">${edu.degree || ""}</span>, <span class="school-name">${edu.school || edu.institution || ""}</span></span>
                  <span class="job-date">${edu.date || `${edu.startDate || ""} - ${edu.endDate || ""}`}</span>
              </div>
          `,
            )
            .join("")}
      </div>
      ` : ""}
  </body>
  </html>
  `;
}

// Cover Letter HTML Generator Helper (A4 Precision & Executive Formatting)
function generateCoverLetterHtml(
  resumeData: TailoredResume,
  coverLetterText: string,
  theme = "classic",
) {
  let primaryColor = "#0f172a";
  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  if (theme === "modern-blue") {
    primaryColor = "#1e40af";
  } else if (theme === "emerald") {
    primaryColor = "#047857";
  }

  const currentDateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sanitizedText = coverLetterText.replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateStr);

  const formattedText = sanitizedText
    .split("\n\n")
    .map((p) => `<p style="margin-bottom: 12px;">${formatMarkdownBold(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const contactItems = [
    resumeData.personalInfo?.location,
    resumeData.personalInfo?.phone,
    resumeData.personalInfo?.email,
  ].filter(Boolean);

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <title>Cover Letter - ${resumeData.personalInfo?.name || "Candidate"}</title>
      <style>
          @page {
              size: A4 portrait;
              margin: 0;
          }
          * {
              box-sizing: border-box;
          }
          body {
              font-family: ${fontStack};
              font-size: 10pt;
              line-height: 1.6;
              color: #1e293b;
              background: #ffffff;
              margin: 0 auto;
              padding: 18mm 20mm;
              width: 210mm;
              min-height: 297mm;
              -webkit-print-color-adjust: exact;
          }
          .sender-header {
              border-bottom: 2px solid ${primaryColor};
              padding-bottom: 12px;
              margin-bottom: 20px;
          }
          .sender-name {
              font-size: 18pt;
              font-weight: 800;
              color: ${primaryColor};
              text-transform: uppercase;
              letter-spacing: -0.01em;
          }
          .sender-contact {
              font-size: 8.5pt;
              color: #475569;
              margin-top: 4px;
          }
          .date {
              font-size: 9.5pt;
              color: #64748b;
              margin-bottom: 16px;
              font-weight: 500;
          }
          .recipient-info {
              font-size: 10pt;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 16px;
          }
          .letter-body {
              text-align: justify;
              font-size: 9.5pt;
              color: #334155;
          }
      </style>
  </head>
  <body>
      <div class="sender-header">
          <div class="sender-name">${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</div>
          <div class="sender-contact">${contactItems.join(" &nbsp;•&nbsp; ")}</div>
      </div>
      
      <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
      
      <div class="recipient-info">
          To the Hiring Team / Recruitment Manager
      </div>
      
      <div class="letter-body">
          ${formattedText}
      </div>
  </body>
  </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      jobDescription,
      targetRole,
      password,
      theme,
      tailoredResume,
      coverLetterText,
    } = body;

    if (!action) {
      return NextResponse.json(
        {
          error: "Action parameter (generate-text or generate-pdf) is required",
        },
        { status: 400 },
      );
    }

    // Phase 1: Decrypt Master CV and Tailor using Gemini
    if (action === "generate-text") {
      if (!jobDescription || !targetRole || !password) {
        return NextResponse.json(
          {
            error:
              "Job description, target role, and decryption password are required",
          },
          { status: 400 },
        );
      }

      // 1. Read and Decrypt the master CV data
      let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
      try {
        await fs.access(dataPath);
      } catch {
        dataPath = path.join(
          process.cwd(),
          "my-project-some",
          "my-app",
          "my-agent",
          "data",
          "master_cv.enc",
        );
      }
      const encryptedData = await fs.readFile(dataPath, "utf-8");

      // Decryption logic
      const parts = encryptedData.split(":");
      const ivHex = parts.shift();

      if (!ivHex) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(ivHex, "hex");
      const encryptedText = parts.join(":");

      // Decrypt using password provided by user from UI
      let masterCvRaw;
      try {
        const key = crypto.scryptSync(password, "salt", 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        masterCvRaw = decrypted;
      } catch (decryptionError) {
        console.error("Decryption failed:", decryptionError);
        return NextResponse.json(
          { error: "Invalid decryption password. Access Denied." },
          { status: 401 },
        );
      }

      // 2. Construct the Prompt for Gemini with Technical Developer Identity Preservation & Recruiter Outreach
      const currentDateString = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      console.log(`Analyzing JD for role: ${targetRole} (Current Date: ${currentDateString})`);

      const prompt = `
You are an expert Executive ATS Resume & Cover Letter Architect specializing in Technical Engineering & Leadership roles.
I will provide you with a candidate's Master Resume (in JSON) and a Job Description.

GOLDEN RULES FOR DOCUMENT CUSTOMIZATION (MUST OBEY STRICTLY):

1. FIRST-PERSON PERSPECTIVE (PERSPEKTIF ORANG PERTAMA):
   - ALWAYS write the Executive Summary, Cover Letter, and Recruiter Email in the FIRST PERSON ("I", "my", "me", "myself").
   - NEVER use third-person pronouns ("he", "him", "his") to describe the candidate in summary, cover letter, or outreach.

2. OFFICIAL JOB TITLE INTEGRITY (INTEGRITAS JUDUL PEKERJAAN ASLI):
   - ALWAYS retain the authentic official job titles from employment history. DO NOT invent or inflate past job titles in the work history (e.g. keep "Frontend Developer" at IFG, "Application Development Associate — Lead Internal MII Team" at PT Bukit Asam Tbk, "Fullstack Developer" at PT Pupuk Sriwidjaja).
   - Match relevance to target roles (e.g., IT Project Manager, Lead, or Manager) strictly through descriptive bullet points (sprint management, team coordination, task allocation, stakeholder reporting) WITHOUT altering official past job titles!

3. YEARS OF EXPERIENCE TRIAGE (TAKTIK DURASI PENGALAMAN):
   - For Technical / Developer roles (Fullstack, Frontend, Software Engineer, AI): Claim approximately 5 years (~5 years) of software engineering experience (reflecting candidate's timeline from 2021 to present).
   - For Moderate Management roles (asking for 3-4 years IT PM): Pin the highlighted experience claim right to the requested minimum (e.g. "3-4 years of technical delivery & agile project coordination") to remain 100% credible.
   - For High-Requirement roles (asking for 7+ years, e.g. Data & AI Manager): Count and connect back to university engineering inception (December 2019, programming C++/Arduino/Robotics power systems) as the start of the systems engineering track.

4. HYBRID LAYOUT & KEY PROFESSIONAL HIGHLIGHTS:
   - Provide a "keyHighlights" array (3 to 4 items) positioned at the top of the resume using bold bracket mapping format:
     Format: "**[Target Requirement ➔ Candidate Qualification]**: Detailed description."
   - Ensure date representations use clean, high-contrast plain text without dark background boxes for 100% ATS OCR scanner readability.

5. CLEAN CODE & NO RAW MARKDOWN:
   - Do NOT leave raw, unparsed markdown symbols in template fields. Write clean text and convert all bolding into proper standard formatting.

6. RECRUITER OUTREACH EMAIL:
   - Write a high-converting, professional, ready-to-send Recruiter Outreach Email / LinkedIn message with a clear Subject line and fully formatted body text in FIRST PERSON ("I", "my"). Use real date "${currentDateString}".

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object with the following exact keys:
{
  "matchScore": <integer between 0 and 100 representing the ATS match score of the tailored resume>,
  "missingKeywords": [<array of 5 to 8 critical technical keywords/skills from the Job Description>],
  "tailoredResume": <tailored resume object maintaining the exact structure, official job titles, and technical depth of the MASTER RESUME JSON, including optional keyHighlights array using [Requirement ➔ Qualification] format>,
  "coverLetter": "<a tailored cover letter in first person ('I', 'my'), plain text with \\n for newlines. Real date: ${currentDateString}>",
  "coldEmail": "<a ready-to-send recruiter email with Subject Line and Body Text in first person ('I', 'my'), formatted cleanly with \\n for newlines>"
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      // 3. Call Gemini API
      console.log("Calling Gemini API...");
      let tailoredResumeResult = JSON.parse(masterCvRaw) as TailoredResume;
      let coverLetterTextResult = "";
      let coldEmailTextResult = "";
      let matchScoreResult = 75;
      let missingKeywordsResult: string[] = [];

      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.3,
            },
          });
          const aiResponseText = response.text || "{}";
          const cleanJsonString = aiResponseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          const responseObj = JSON.parse(cleanJsonString);
          tailoredResumeResult = responseObj.tailoredResume as TailoredResume;
          coverLetterTextResult = (responseObj.coverLetter || "").replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateString);
          coldEmailTextResult = (responseObj.coldEmail || "").replace(/\[(Current Date|Date|Today's Date|Today Date|Date Here)\]/gi, currentDateString);
          matchScoreResult = responseObj.matchScore || 75;
          missingKeywordsResult = responseObj.missingKeywords || [];
          console.log(
            "Successfully tailored resume and calculated match score using Gemini!",
          );
        } catch (aiErr) {
          console.error("Gemini AI Error:", aiErr);
          const errorVal = aiErr as Error;
          return NextResponse.json(
            { error: "Gemini AI generation failed: " + errorVal.message },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Gemini API key is missing in environment variables" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        tailoredResume: tailoredResumeResult,
        coverLetter: coverLetterTextResult,
        coldEmail: coldEmailTextResult,
        matchScore: matchScoreResult,
        missingKeywords: missingKeywordsResult,
      });
    }

    // Phase 1.5: Re-evaluate Match Score only
    if (action === "re-evaluate-score") {
      if (!tailoredResume || !jobDescription) {
        return NextResponse.json(
          {
            error:
              "tailoredResume and jobDescription are required for re-evaluation",
          },
          { status: 400 },
        );
      }

      console.log("Re-evaluating edited CV score...");
      const prompt = `
You are an expert ATS (Applicant Tracking System) parser and evaluator.
Evaluate the following Resume JSON against the Job Description and calculate the match score (percentage) and identify any critical technical keywords that are still missing or not emphasized.

JOB DESCRIPTION:
${jobDescription}

RESUME (JSON):
${JSON.stringify(tailoredResume)}

Return ONLY a raw JSON object with the following exact keys:
{
  "matchScore": <integer between 0 and 100 representing the ATS match score of the resume>,
  "missingKeywords": [<array of critical technical keywords/skills from the Job Description that are still missing or not emphasized in the resume>]
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.3,
            },
          });
          const aiResponseText = response.text || "{}";
          const cleanJsonString = aiResponseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          const responseObj = JSON.parse(cleanJsonString);
          return NextResponse.json({
            success: true,
            matchScore: responseObj.matchScore || 75,
            missingKeywords: responseObj.missingKeywords || [],
          });
        } catch (aiErr) {
          console.error("Gemini AI Error:", aiErr);
          const errorVal = aiErr as Error;
          return NextResponse.json(
            { error: "Gemini AI evaluation failed: " + errorVal.message },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Gemini API key is missing in environment variables" },
          { status: 500 },
        );
      }
    }

    // Phase 2: Compile Final PDF
    if (action === "generate-pdf") {
      if (!tailoredResume || !coverLetterText) {
        return NextResponse.json(
          {
            error:
              "tailoredResume and coverLetterText are required for PDF compilation",
          },
          { status: 400 },
        );
      }

      // Generate HTML files
      console.log("Generating HTML templates...");
      const cvHtmlContent = generateHtml(
        tailoredResume as TailoredResume,
        theme || "classic",
      );
      const coverLetterHtmlContent = generateCoverLetterHtml(
        tailoredResume as TailoredResume,
        coverLetterText,
        theme || "classic",
      );

      console.log("Launching Puppeteer...");
      let browser;

      if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        console.log(
          "Loading serverless Puppeteer (puppeteer-core & @sparticuz/chromium)...",
        );
        const puppeteerCore = await import("puppeteer-core");
        const chromiumModule = await import("@sparticuz/chromium");
        const sparticuzChromium = ((chromiumModule as unknown as { default: ChromiumInterface }).default ||
          chromiumModule) as unknown as ChromiumInterface;

        let chromiumPath: string;
        try {
          chromiumPath = await sparticuzChromium.executablePath();
        } catch (err) {
          console.warn("Standard executablePath failed, attempting remote pack fallback:", err);
          const REMOTE_PACK_URL = "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";
          const getExecPath = sparticuzChromium.executablePath as unknown as (input?: string) => Promise<string>;
          chromiumPath = await getExecPath(REMOTE_PACK_URL);
        }

        browser = await puppeteerCore.launch({
          args: sparticuzChromium.args,
          defaultViewport: sparticuzChromium.defaultViewport as unknown as { width: number; height: number; },
          executablePath: chromiumPath,
          headless: (sparticuzChromium.headless as boolean) || true,
        });
      } else {
        console.log("Loading local Puppeteer...");
        const puppeteerLocal = await import("puppeteer");

        let executablePath = undefined;
        try {
          const p1 =
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
          await fs.access(p1);
          executablePath = p1;
        } catch {
          try {
            const p2 =
              "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
            await fs.access(p2);
            executablePath = p2;
          } catch {
            // Fallback to default
          }
        }
        console.log("Using local Chrome path:", executablePath || "default");
        browser = await puppeteerLocal.launch({
          headless: true,
          executablePath: executablePath,
        });
      }

      // Render CV PDF
      console.log("Rendering CV PDF...");
      const cvPage = await browser.newPage();
      await cvPage.setContent(cvHtmlContent, { waitUntil: "load" });
      const cvPdfBuffer = await cvPage.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      // Render Cover Letter PDF
      console.log("Rendering Cover Letter PDF...");
      const clPage = await browser.newPage();
      await clPage.setContent(coverLetterHtmlContent, { waitUntil: "load" });
      const clPdfBuffer = await clPage.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await browser.close();
      console.log("PDFs successfully generated!");

      // Convert buffers to base64 Data URIs
      const cvBase64 = Buffer.from(cvPdfBuffer).toString("base64");
      const cvUrl = `data:application/pdf;base64,${cvBase64}`;

      const clBase64 = Buffer.from(clPdfBuffer).toString("base64");
      const coverLetterUrl = `data:application/pdf;base64,${clBase64}`;

      return NextResponse.json({
        success: true,
        cvUrl: cvUrl,
        coverLetterUrl: coverLetterUrl,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Supported values are: generate-text, generate-pdf",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json(
      { error: "Internal Server Error: " + errorVal.message },
      { status: 500 },
    );
  }
}
