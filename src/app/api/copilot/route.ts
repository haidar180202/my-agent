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

export interface StarFramework {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface CopilotResponse {
  talkingPoints: string[];
  modelAnswer: string;
  keyKeywords: string[];
  codeSolution?: string;
  starFramework?: StarFramework;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      password,
      jobDescription,
      companyName,
      targetRole,
      liveQuestionText,
      screenImageBase64,
      copilotMode = "general",
    } = body;

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

    const modeInstruction =
      copilotMode === "behavioral-star"
        ? `Format the response specifically around the STAR Behavioral Framework (Situation, Task, Action, Result) using candidate's real experience from Master CV.`
        : copilotMode === "coding"
        ? `Focus on optimal time/space complexity O(N), edge cases, and provide production-ready code solutions.`
        : copilotMode === "system-design"
        ? `Focus on high-availability system architecture, database choices, caching, microservices, and trade-off analysis.`
        : `Provide general executive interview talking points.`;

    const promptText = `You are an elite real-time AI Interview Copilot assisting a candidate during a live technical/behavioral interview.
Active Mode: ${copilotMode.toUpperCase()}
Mode Instruction: ${modeInstruction}

Candidate Master CV Context:
${JSON.stringify(masterCvData, null, 2)}

Target Company: ${companyName || "Target Company"}
Target Role: ${targetRole || "Software Engineer / Tech Lead"}
Target Job Description:
${jobDescription || "Standard Technical & Leadership Role"}

Interviewer Input:
"${liveQuestionText || "See attached screen capture image for coding problem / question"}"

Generate a JSON object matching this schema EXACTLY:
{
  "talkingPoints": [
    "Bullet 1: Direct achievement or strategy answering the question / screen problem",
    "Bullet 2: Specific metric, scale, or tool used (e.g. Redis, Quarkus, 40% latency reduction)",
    "Bullet 3: How this experience directly solves ${companyName || "the company"}'s technical challenge"
  ],
  "modelAnswer": "A concise 3-sentence spoken response the candidate can say out loud right now.",
  "keyKeywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4"],
  "codeSolution": ${copilotMode === "coding" || screenImageBase64 ? `"Provide full, optimal code solution when coding problem is present, else null"` : "null"},
  "starFramework": ${
    copilotMode === "behavioral-star"
      ? `{
    "situation": "Short 1-sentence situation description from candidate's Master CV experience.",
    "task": "Core challenge or KPI target to achieve.",
    "action": "Specific technical actions, architectural design, and leadership steps taken by candidate.",
    "result": "Quantifiable impact and business result achieved (e.g. 3x turnaround speed, 99.9% uptime)."
  }`
      : "null"
  }
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
