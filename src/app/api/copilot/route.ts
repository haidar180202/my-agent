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

export interface CopilotResponse {
  talkingPoints: string[];
  modelAnswer: string;
  keyKeywords: string[];
  codeSolution?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, jobDescription, companyName, targetRole, liveQuestionText, screenImageBase64 } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required for Master CV authorization" }, { status: 401 });
    }

    if (!liveQuestionText && !screenImageBase64) {
      return NextResponse.json({ error: "Interviewer question text or screen capture image is required" }, { status: 400 });
    }

    // 1. Decrypt Master CV
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

    const promptText = `You are an elite real-time AI Interview Copilot assisting a candidate during a live technical video interview.
Analyze the input (spoken question and/or screen capture of a coding problem / architecture diagram / test assessment), align it with the candidate's decrypted Master CV, and produce instant gold talking points.

Candidate Master CV Context:
${JSON.stringify(masterCvData, null, 2)}

Target Company: ${companyName || "Target Company"}
Target Role: ${targetRole || "Software Engineer / Tech Lead"}
Target Job Description:
${jobDescription || "Standard Technical & Leadership Role"}

Interviewer Context / Question Text:
"${liveQuestionText || "See attached screen capture image for coding problem / question"}"

Generate a JSON object matching this schema EXACTLY:
{
  "talkingPoints": [
    "Bullet 1: Direct achievement or algorithmic strategy answering the question / screen problem",
    "Bullet 2: Specific time/space complexity or metric (e.g. O(N) Time, Hash Map, Quarkus microservices)",
    "Bullet 3: How this experience directly solves ${companyName || "the company"}'s technical challenge"
  ],
  "modelAnswer": "A concise 3-sentence spoken response the candidate can say out loud right now.",
  "keyKeywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4"],
  "codeSolution": "Provide full, production-ready, optimal code solution if a coding problem or algorithm test is captured on screen. If no coding problem is shown, set to null."
}

CRITICAL: Return ONLY raw JSON without Markdown code blocks.`;

    // 3. Prepare Multimodal Payload
    const contents: (string | { inlineData: { data: string; mimeType: string } })[] = [promptText];

    if (screenImageBase64 && typeof screenImageBase64 === "string") {
      const base64Clean = screenImageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          data: base64Clean,
          mimeType: "image/png",
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    const textOutput = response.text || "";
    const cleanJson = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson) as CopilotResponse;

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Copilot API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json({ error: "Internal Server Error: " + errorVal.message }, { status: 500 });
  }
}
