import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// Resolve dataPath helper
async function getMasterCvPath(): Promise<string> {
  let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
  try {
    await fs.access(dataPath);
    return dataPath;
  } catch {
    dataPath = path.join(process.cwd(), "my-project-some", "my-app", "my-agent", "data", "master_cv.enc");
    return dataPath;
  }
}

// Decrypt Master CV helper
async function decryptMasterCv(password: string): Promise<Record<string, unknown>> {
  const dataPath = await getMasterCvPath();
  const encryptedData = await fs.readFile(dataPath, "utf-8");

  const parts = encryptedData.split(":");
  const ivHex = parts.shift();
  if (!ivHex) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = parts.join(":");

  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as Record<string, unknown>;
}

export interface PitchOutput {
  coldEmail: {
    subject: string;
    body: string;
  };
  linkedInNote: string;
  linkedInPost: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, jobDescription, targetRole, companyName, recruiterName } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required for Master CV authorization" }, { status: 401 });
    }

    if (!jobDescription || !companyName) {
      return NextResponse.json({ error: "Job description and company name are required" }, { status: 400 });
    }

    // 1. Decrypt Master CV to inject authentic candidate context
    let masterCvData: Record<string, unknown>;
    try {
      masterCvData = await decryptMasterCv(password);
    } catch {
      return NextResponse.json({ error: "Invalid decryption password. Access Denied." }, { status: 401 });
    }

    // 2. Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an elite Tech Career Strategist and Executive Recruiter Copywriter.
Generate 3 high-conversion outreach assets tailored to the following candidate and target job:

Candidate Master CV Background:
${JSON.stringify(masterCvData, null, 2)}

Target Company: ${companyName}
Target Role: ${targetRole || "Software Engineer / Tech Lead"}
Recruiter Name: ${recruiterName || "Hiring Manager"}
Job Description:
${jobDescription}

Generate a JSON object matching this schema EXACTLY:
{
  "coldEmail": {
    "subject": "Concise, attention-grabbing email subject line incorporating candidate's key strength & role title",
    "body": "Professional 3-paragraph cold outreach email to ${recruiterName || "Hiring Manager"}. Highlight candidate's exact engineering achievements matching the JD, call out relevant tech stack metrics, and end with a low-friction CTA (e.g. 10-min informal chat)."
  },
  "linkedInNote": "A punchy LinkedIn Connection Request note strictly under 280 characters. Mention target role at ${companyName} and 1 standout matching skill.",
  "linkedInPost": "An engaging, viral-formatted LinkedIn Project Launch / Professional Showcase post. Include a strong hook, bulleted technical architecture breakdown from candidate's experience, impact metrics, and relevant hashtags."
}

CRITICAL: Return ONLY valid, raw JSON. Do NOT wrap in Markdown code blocks or extra text.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const textOutput = response.text || "";
    const cleanJson = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    const pitches = JSON.parse(cleanJson) as PitchOutput;

    return NextResponse.json({ success: true, pitches });
  } catch (error) {
    console.error("Pitch Builder Error:", error);
    const errorVal = error as Error;
    return NextResponse.json({ error: "Internal Server Error: " + errorVal.message }, { status: 500 });
  }
}
