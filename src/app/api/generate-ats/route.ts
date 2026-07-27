import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import puppeteer from "puppeteer";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// HTML Generator Helper
function generateHtml(resumeData: any) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; margin: 0; padding: 15mm 20mm; }
          h1 { font-size: 18pt; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; text-align: center; }
          .contact-info { text-align: center; font-size: 9pt; margin-bottom: 15px; color: #555; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin-top: 15px; margin-bottom: 5px; padding-bottom: 2px; }
          p { margin: 0 0 5px 0; text-align: justify; }
          ul { margin: 0 0 10px 0; padding-left: 20px; }
          li { margin-bottom: 3px; text-align: justify; }
          .job-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 2px; }
          .job-title { font-weight: bold; }
          .job-date { font-style: italic; font-weight: normal; }
      </style>
  </head>
  <body>
      <h1>${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}</h1>
      <div class="contact-info">
          ${resumeData.personalInfo?.location} | ${resumeData.personalInfo?.phone} | ${resumeData.personalInfo?.email} <br/>
          ${resumeData.personalInfo?.linkedin} | ${resumeData.personalInfo?.portfolio}
      </div>

      <div class="section-title">PROFESSIONAL SUMMARY</div>
      <p>${resumeData.summary || ""}</p>

      <div class="section-title">CORE COMPETENCIES</div>
      <p>${(resumeData.skills || []).join(" • ")}</p>

      <div class="section-title">PROFESSIONAL EXPERIENCE</div>
      ${(resumeData.experience || [])
        .map(
          (exp: any) => `
          <div class="job-header">
              <span>${exp.company} — <span class="job-title">${exp.role}</span></span>
              <span class="job-date">${exp.date}</span>
          </div>
          <ul>
              ${(exp.bullets || []).map((b: string) => `<li>${b}</li>`).join("")}
          </ul>
      `,
        )
        .join("")}

      <div class="section-title">FEATURED AI PROJECTS</div>
      ${(resumeData.projects || [])
        .map(
          (proj: any) => `
          <div class="job-header">
              <span>${proj.name} — <span class="job-title">${proj.type}</span></span>
              <span class="job-date">${proj.date}</span>
          </div>
          <ul>
              ${(proj.bullets || []).map((b: string) => `<li>${b}</li>`).join("")}
          </ul>
      `,
        )
        .join("")}

      <div class="section-title">EDUCATION</div>
      ${(resumeData.education || [])
        .map(
          (edu: any) => `
          <div class="job-header">
              <span>${edu.degree}</span>
              <span class="job-date">${edu.institution}</span>
          </div>
          <p><i>${edu.notes}</i></p>
      `,
        )
        .join("")}
  </body>
  </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobDescription, targetRole } = body;

    if (!jobDescription || !targetRole) {
      return NextResponse.json(
        { error: "Job description and target role are required" },
        { status: 400 },
      );
    }

    // 1. Read the master CV data
    const dataPath = path.join(process.cwd(), "src", "data", "resume.json");
    const masterCvRaw = await fs.readFile(dataPath, "utf-8");

    // 2. Construct the Prompt for Gemini
    console.log(`Analyzing JD for role: ${targetRole}`);
    const prompt = `
You are an expert Executive ATS Resume Writer.
I will provide you with a candidate's Master Resume (in JSON) and a Job Description.
Your task is to tailor the candidate's professional summary and experience bullet points to perfectly match the keywords and requirements of the Job Description.

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object matching the exact structure of the MASTER RESUME, but with the "summary" and "experience.bullets" tailored to highlight the most relevant skills for the job. Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

    // 3. Call Gemini API
    console.log("Calling Gemini API...");
    let tailoredResume = JSON.parse(masterCvRaw); // Fallback to original

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
        tailoredResume = JSON.parse(cleanJsonString);
        console.log("Successfully tailored resume using Gemini!");
      } catch (aiErr) {
        console.error(
          "Gemini AI Error. Falling back to original resume.",
          aiErr,
        );
      }
    } else {
      console.log(
        "No API Key found. Using original resume data to generate PDF.",
      );
    }

    // 4. Generate HTML and convert to PDF using Puppeteer
    console.log("Generating HTML template...");
    const htmlContent = generateHtml(tailoredResume);

    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    console.log("Rendering PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();
    console.log("PDF successfully generated!");

    // Convert buffer to base64 Data URI
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");
    const cvUrl = `data:application/pdf;base64,${base64Pdf}`;

    // 5. Return actual PDF URL to frontend
    return NextResponse.json({
      success: true,
      cvUrl: cvUrl,
    });
  } catch (error: SyntaxError | Error | unknown) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
