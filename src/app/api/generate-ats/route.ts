import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// HTML Generator Helper
function generateHtml(resumeData: any, theme = "classic") {
  let primaryColor = "#000000";
  let fontStack = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  let sectionBorder = "1px solid #000";
  let accentColor = "#333";
  let secondaryColor = "#555";

  if (theme === "modern-blue") {
    primaryColor = "#1d4ed8"; // Deep Blue
    fontStack = "'Inter', system-ui, -apple-system, sans-serif";
    sectionBorder = "2px solid #e2e8f0"; // slate-200 border
    accentColor = "#2563eb"; // blue-600
    secondaryColor = "#475569"; // slate-600
  } else if (theme === "emerald") {
    primaryColor = "#059669"; // Emerald green
    fontStack = "'Inter', system-ui, -apple-system, sans-serif";
    sectionBorder = "2px solid #ecfdf5"; // soft green accent border
    accentColor = "#047857"; // emerald-700
    secondaryColor = "#374151"; // gray-700
  }

  // Robust skills extraction
  const skillsList = Array.isArray(resumeData.skills)
    ? resumeData.skills
    : typeof resumeData.skills === "object" && resumeData.skills !== null
    ? Object.values(resumeData.skills).flat()
    : [];

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <style>
          @page { size: A4; margin: 0; }
          body { font-family: ${fontStack}; font-size: 10pt; line-height: 1.4; color: #333; margin: 0; padding: 15mm 20mm; }
          h1 { font-size: 18pt; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; text-align: center; color: ${primaryColor}; }
          .contact-info { text-align: center; font-size: 9pt; margin-bottom: 15px; color: ${secondaryColor}; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: ${sectionBorder}; color: ${primaryColor}; margin-top: 15px; margin-bottom: 5px; padding-bottom: 2px; }
          p { margin: 0 0 5px 0; text-align: justify; }
          ul { margin: 0 0 10px 0; padding-left: 20px; }
          li { margin-bottom: 3px; text-align: justify; }
          li strong { color: ${accentColor}; }
          .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px; }
          .job-title { font-weight: bold; color: ${accentColor}; }
          .job-date { font-style: italic; font-weight: normal; color: #666; }
      </style>
  </head>
  <body>
      <h1>${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</h1>
      <div class="contact-info">
          ${resumeData.personalInfo?.location || ""} | ${resumeData.personalInfo?.phone || ""} | ${resumeData.personalInfo?.email || ""} <br/>
          ${resumeData.personalInfo?.linkedin || ""} | ${resumeData.personalInfo?.portfolio || ""}
      </div>

      <div class="section-title">PROFESSIONAL SUMMARY</div>
      <p>${resumeData.summary || ""}</p>

      <div class="section-title">CORE COMPETENCIES</div>
      <p>${skillsList.join(" • ")}</p>

      <div class="section-title">PROFESSIONAL EXPERIENCE</div>
      ${(resumeData.experience || [])
        .map(
          (exp: any) => `
          <div class="job-header">
              <span>${exp.company || ""} — <span class="job-title">${exp.role || ""}</span></span>
              <span class="job-date">${exp.date || `${exp.startDate || ""} - ${exp.endDate || ""}`}</span>
          </div>
          <ul>
              ${(exp.bullets || exp.highlights || []).map((b: string) => `<li>${b}</li>`).join("")}
          </ul>
      `,
        )
        .join("")}

      <div class="section-title">FEATURED AI PROJECTS</div>
      ${(resumeData.projects || [])
        .map(
          (proj: any) => `
          <div class="job-header">
              <span>${proj.name || ""} ${proj.type ? `— <span class="job-title">${proj.type}</span>` : ""}</span>
              <span class="job-date">${proj.date || ""}</span>
          </div>
          <ul>
              ${(proj.bullets || proj.highlights || []).map((b: string) => `<li>${b}</li>`).join("")}
          </ul>
      `,
        )
        .join("")}

      <div class="section-title">EDUCATION</div>
      ${(resumeData.education || [])
        .map(
          (edu: any) => `
          <div class="job-header">
              <span><strong>${edu.degree || ""}</strong></span>
              <span class="job-date">${edu.school || edu.institution || ""} (${edu.date || `${edu.startDate || ""} - ${edu.endDate || ""}`})</span>
          </div>
      `,
        )
        .join("")}
  </body>
  </html>
  `;
}

// Cover Letter HTML Generator Helper
function generateCoverLetterHtml(resumeData: any, coverLetterText: string, theme = "classic") {
  let primaryColor = "#000000";
  let fontStack = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  let accentColor = "#333";

  if (theme === "modern-blue") {
    primaryColor = "#1d4ed8";
    fontStack = "'Inter', system-ui, -apple-system, sans-serif";
    accentColor = "#1e293b";
  } else if (theme === "emerald") {
    primaryColor = "#059669";
    fontStack = "'Inter', system-ui, -apple-system, sans-serif";
    accentColor = "#0f172a";
  }

  const formattedText = coverLetterText.replace(/\n/g, "<br/>");
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <style>
          @page { size: A4; margin: 0; }
          body { font-family: ${fontStack}; font-size: 10pt; line-height: 1.5; color: ${accentColor}; margin: 0; padding: 25mm 20mm; }
          .date { margin-bottom: 20px; }
          .sender-info { font-weight: bold; margin-bottom: 20px; line-height: 1.4; color: ${primaryColor}; }
          .recipient-info { margin-bottom: 20px; }
          .body { text-align: justify; }
      </style>
  </head>
  <body>
      <div class="sender-info">
          ${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}<br/>
          <span style="font-weight: normal; color: #555;">
            ${resumeData.personalInfo?.location}<br/>
            ${resumeData.personalInfo?.phone} | ${resumeData.personalInfo?.email}
          </span>
      </div>
      
      <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      
      <div class="recipient-info">
          <strong>To the Hiring Team / Recruiter</strong>
      </div>
      
      <div class="body">
          ${formattedText}
      </div>
  </body>
  </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, jobDescription, targetRole, password, theme, tailoredResume, coverLetterText } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action parameter (generate-text or generate-pdf) is required" },
        { status: 400 },
      );
    }

    // Phase 1: Decrypt Master CV and Tailor using Gemini
    if (action === "generate-text") {
      if (!jobDescription || !targetRole || !password) {
        return NextResponse.json(
          { error: "Job description, target role, and decryption password are required" },
          { status: 400 },
        );
      }

      // 1. Read and Decrypt the master CV data
      let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
      try {
        await fs.access(dataPath);
      } catch {
        dataPath = path.join(process.cwd(), "my-project-some", "my-app", "my-agent", "data", "master_cv.enc");
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

      // 2. Construct the Prompt for Gemini
      console.log(`Analyzing JD for role: ${targetRole}`);
      const prompt = `
You are an expert Executive ATS Resume and Cover Letter Writer.
I will provide you with a candidate's Master Resume (in JSON) and a Job Description.

Your task is to:
1. Tailor the candidate's professional summary and experience bullet points to perfectly match the keywords and requirements of the Job Description.
2. Write a highly compelling, professional, and targeted Cover Letter (1 page) that directly addresses the Hiring Team, highlighting the candidate's achievements and fit for the role.
3. Evaluate the ATS match score (percentage) of this tailored resume against the Job Description.
4. Identify 5 to 8 critical technical keywords, skills, or methodologies from the Job Description that are highly important for this role and should be emphasized.

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object with the following exact keys:
{
  "matchScore": <integer between 0 and 100 representing the ATS match score of the tailored resume>,
  "missingKeywords": [<array of 5 to 8 critical technical keywords/skills from the Job Description>],
  "tailoredResume": <tailored resume object maintaining the exact structure of the MASTER RESUME JSON>,
  "coverLetter": "<a tailored cover letter in plain text, using \\n for newlines>"
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      // 3. Call Gemini API
      console.log("Calling Gemini API...");
      let tailoredResumeResult = JSON.parse(masterCvRaw);
      let coverLetterTextResult = "";
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
          tailoredResumeResult = responseObj.tailoredResume;
          coverLetterTextResult = responseObj.coverLetter;
          matchScoreResult = responseObj.matchScore || 75;
          missingKeywordsResult = responseObj.missingKeywords || [];
          console.log("Successfully tailored resume and calculated match score using Gemini!");
        } catch (aiErr: any) {
          console.error("Gemini AI Error:", aiErr);
          return NextResponse.json(
            { error: "Gemini AI generation failed: " + aiErr.message },
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
        matchScore: matchScoreResult,
        missingKeywords: missingKeywordsResult,
      });
    }

    // Phase 2: Compile Final PDF
    if (action === "generate-pdf") {
      if (!tailoredResume || !coverLetterText) {
        return NextResponse.json(
          { error: "tailoredResume and coverLetterText are required for PDF compilation" },
          { status: 400 },
        );
      }

      // Generate HTML files
      console.log("Generating HTML templates...");
      const cvHtmlContent = generateHtml(tailoredResume, theme || "classic");
      const coverLetterHtmlContent = generateCoverLetterHtml(tailoredResume, coverLetterText, theme || "classic");

      console.log("Launching Puppeteer...");
      let browser;

      if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        console.log("Loading serverless Puppeteer (puppeteer-core & @sparticuz/chromium)...");
        const puppeteerCore = await import("puppeteer-core");
        const sparticuzChromium = (await import("@sparticuz/chromium")).default;

        browser = await puppeteerCore.launch({
          args: (sparticuzChromium as any).args,
          defaultViewport: (sparticuzChromium as any).defaultViewport,
          executablePath: await (sparticuzChromium as any).executablePath(),
          headless: (sparticuzChromium as any).headless as boolean || true,
        });
      } else {
        console.log("Loading local Puppeteer...");
        const puppeteerLocal = await import("puppeteer");
        
        let executablePath = undefined;
        try {
          const p1 = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
          await fs.access(p1);
          executablePath = p1;
        } catch {
          try {
            const p2 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
            await fs.access(p2);
            executablePath = p2;
          } catch {
            // Fallback to default
          }
        }
        console.log("Using local Chrome path:", executablePath || "default");
        browser = await puppeteerLocal.launch({
          headless: true,
          executablePath: executablePath
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
      { error: "Invalid action. Supported values are: generate-text, generate-pdf" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 },
    );
  }
}
