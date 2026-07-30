import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
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

// Cover Letter HTML Generator Helper
function generateCoverLetterHtml(resumeData: any, coverLetterText: string) {
  const formattedText = coverLetterText.replace(/\n/g, "<br/>");
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #333; margin: 0; padding: 25mm 20mm; }
          .date { margin-bottom: 20px; }
          .sender-info { font-weight: bold; margin-bottom: 20px; line-height: 1.4; }
          .recipient-info { margin-bottom: 20px; }
          .body { text-align: justify; }
      </style>
  </head>
  <body>
      <div class="sender-info">
          ${resumeData.personalInfo?.name || "MUHAMMAD HAIDAR SHAHAB"}<br/>
          ${resumeData.personalInfo?.location}<br/>
          ${resumeData.personalInfo?.phone} | ${resumeData.personalInfo?.email}
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
    const { jobDescription, targetRole } = body;

    if (!jobDescription || !targetRole) {
      return NextResponse.json(
        { error: "Job description and target role are required" },
        { status: 400 },
      );
    }

    // 1. Read and Decrypt the master CV data
    const dataPath = path.join(process.cwd(), "data", "master_cv.enc");
    const encryptedData = await fs.readFile(dataPath, "utf-8");

    // Decryption logic
    const parts = encryptedData.split(":");
    const ivHex = parts.shift();

    if (!ivHex) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = parts.join(":");

    // Use password from env, fallback to default provided by user
    const password = process.env.RESUME_PASSWORD || "haidar$68";
    const key = crypto.scryptSync(password, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    const masterCvRaw = decrypted;

    // 2. Construct the Prompt for Gemini
    console.log(`Analyzing JD for role: ${targetRole}`);
    const prompt = `
You are an expert Executive ATS Resume and Cover Letter Writer.
I will provide you with a candidate's Master Resume (in JSON) and a Job Description.

Your task is to:
1. Tailor the candidate's professional summary and experience bullet points to perfectly match the keywords and requirements of the Job Description.
2. Write a highly compelling, professional, and targeted Cover Letter (1 page) that directly addresses the Hiring Team, highlighting the candidate's achievements and fit for the role.

TARGET ROLE: ${targetRole}
JOB DESCRIPTION:
${jobDescription}

MASTER RESUME (JSON):
${masterCvRaw}

Return ONLY a raw JSON object with the following exact keys:
{
  "tailoredResume": <tailored resume object maintaining the exact structure of the MASTER RESUME JSON>,
  "coverLetter": "<a tailored cover letter in plain text, using \n for newlines>"
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

    // 3. Call Gemini API
    console.log("Calling Gemini API...");
    let tailoredResume = JSON.parse(masterCvRaw); // Fallback to original
    let coverLetterText = `Dear Hiring Team,\n\nI am writing to express my interest in the ${targetRole} position. My background in software engineering makes me a strong fit for your team.\n\nBest regards,\n\nMuhammad Haidar Shahab`; // Fallback

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
        tailoredResume = responseObj.tailoredResume;
        coverLetterText = responseObj.coverLetter;
        console.log("Successfully tailored resume and generated cover letter using Gemini!");
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

    // 4. Generate HTML files
    console.log("Generating HTML templates...");
    const cvHtmlContent = generateHtml(tailoredResume);
    const coverLetterHtmlContent = generateCoverLetterHtml(tailoredResume, coverLetterText);

    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: true });
    
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

    // 5. Return actual PDF URLs to frontend
    return NextResponse.json({
      success: true,
      cvUrl: cvUrl,
      coverLetterUrl: coverLetterUrl,
    });
  } catch (error: SyntaxError | Error | unknown) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
