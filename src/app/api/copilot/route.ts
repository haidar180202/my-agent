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
  questionTranslation?: string;
  questionIntentIndonesian?: string;
  codeSolution?: string;
  starFramework?: StarFramework;
  activeKeyIndex?: number;
  totalKeys?: number;
}

// Multi-API Key Resolver Helper
function getGeminiApiKeys(): string[] {
  const keys: string[] = [];

  if (process.env.GEMINI_API_KEYS) {
    const splitKeys = process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
    keys.push(...splitKeys);
  }

  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && k.trim()) {
      keys.push(k.trim());
    }
  }

  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }

  return keys;
}

// Failover Load Balancer Execution Helper
async function generateWithFailover(
  contents: (string | { inlineData: { data: string; mimeType: string } })[] | string
) {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY configured in environment variables");
  }

  let lastError: Error | null = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: keys[i] });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
      });
      return { response, activeKeyIndex: i + 1, totalKeys: keys.length };
    } catch (err) {
      lastError = err as Error;
      console.warn(`⚠️ Gemini API Key #${i + 1} rate limited. Auto-switching to Key #${i + 2}... Error: ${lastError.message}`);
    }
  }

  throw new Error(`All ${keys.length} Gemini API keys failed or rate-limited: ${lastError?.message}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      password,
      jobDescription,
      companyName,
      targetRole,
      liveQuestionText,
      screenImageBase64,
      copilotMode = "general",
      conversationHistory = [],
    } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required for Master CV authorization" }, { status: 401 });
    }

    // 1. Decrypt Master CV
    let masterCvData: Record<string, unknown>;
    try {
      masterCvData = await decryptMasterCv(password);
    } catch {
      return NextResponse.json({ error: "Invalid decryption password. Access Denied." }, { status: 401 });
    }

    // Action: End Meeting & Simple Indonesian Session Recap
    if (action === "recap-session") {
      const recapPrompt = `You are a friendly executive interview performance coach.
Analyze the following complete interview conversation log between an Interviewer and a Candidate.

TARGET COMPANY: ${companyName || "Target Company"}
TARGET ROLE: ${targetRole || "Software Engineer / Tech Lead"}
MASTER CV CONTEXT:
${JSON.stringify(masterCvData, null, 2)}

FULL SESSION CONVERSATION HISTORY LOG:
${JSON.stringify(conversationHistory, null, 2)}

Generate a simple, clear Indonesian JSON session recap object with the following exact keys:
{
  "executiveSummary": "Rangkuman simpel 3-4 kalimat dalam Bahasa Indonesia mengenai performa wawancara dan impresi utama.",
  "topicsCovered": ["Array topik teknis/perilaku yang berhasil dibahas selama sesi wawancara"],
  "strengthsDemonstrated": ["Array 3-4 poin kekuatan teknis dan hasil nyata yang berhasil dibuktikan candidate"],
  "followUpActionItems": ["Array 3 rekomendasi tindakan pasca-wawancara dan poin ucapan terima kasih"]
}

Do NOT wrap response in markdown code blocks. Return ONLY raw JSON.`;

      const formattedTimestamp = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB";

      const { response: recapResponse } = await generateWithFailover(recapPrompt);
      const cleanRecapJson = (recapResponse.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
      const recapResult = JSON.parse(cleanRecapJson);
      return NextResponse.json({
        success: true,
        recap: {
          ...recapResult,
          sessionTimestamp: formattedTimestamp,
        },
      });
    }

    if (!liveQuestionText && !screenImageBase64) {
      return NextResponse.json({ error: "Interviewer question text or screen capture image is required" }, { status: 400 });
    }

    const modeInstruction =
      copilotMode === "behavioral-star"
        ? `Format the response specifically around the STAR Behavioral Framework (Situation, Task, Action, Result) using candidate's real experience from Master CV.`
        : copilotMode === "coding"
        ? `Focus on optimal time/space complexity O(N), edge cases, and provide production-ready code solutions.`
        : copilotMode === "system-design"
        ? `Focus on high-availability system architecture, database choices, caching, microservices, and trade-off analysis.`
        : `Provide general executive interview talking points.`;

    const historyFormatted = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? JSON.stringify(conversationHistory, null, 2)
      : "No previous turns yet in this session.";

    const promptText = `You are an elite real-time AI Interview Copilot assisting a candidate during a live technical/behavioral interview.
Active Mode: ${copilotMode.toUpperCase()}
Mode Instruction: ${modeInstruction}

CRITICAL DIRECTIVE #12 (IMMUTABLE CONSISTENCY & ANTI-CONTRADICTION MANDATE):
- Review the attached PREVIOUS CONVERSATION HISTORY LOG before generating your response.
- Any capability, technology choice, architectural decision, or stance affirmed in previous turns IS IMMUTABLE TRUTH.
- You MUST NOT contradict previous statements, answers, or Master CV facts under any circumstances.
- Maintain seamless context continuity when interviewer asks follow-up sub-questions (e.g. going from Topic A to sub-topic A.1 or A.B). Always know what parent topic or project is being referenced!

Candidate Master CV Context:
${JSON.stringify(masterCvData, null, 2)}

Target Company: ${companyName || "Target Company"}
Target Role: ${targetRole || "Software Engineer / Tech Lead"}
Target Job Description:
${jobDescription || "Standard Technical & Leadership Role"}

PREVIOUS CONVERSATION HISTORY LOG (LAST N TURNS):
${historyFormatted}

CURRENT INTERVIEWER INPUT:
"${liveQuestionText || "See attached screen capture image for coding problem / question"}"

Generate a JSON object matching this schema EXACTLY:
{
  "questionTranslation": "Terjemahan akurat pertanyaan pewawancara ke dalam Bahasa Indonesia yang alami dan mudah dipahami",
  "questionIntentIndonesian": "Penjelasan simpel 1-2 kalimat dalam Bahasa Indonesia: Apa maksud & inti sebenarnya yang ingin dicari/diuji oleh pewawancara dari pertanyaan ini",
  "talkingPoints": [
    "Bullet 1: Direct achievement or strategy answering the question / screen problem",
    "Bullet 2: Specific metric, scale, or tool used (e.g. Redis, Quarkus, 40% latency reduction)",
    "Bullet 3: How this experience directly solves ${companyName || "the company"}'s technical challenge"
  ],
  "modelAnswer": "A concise 3-sentence spoken response the candidate can say out loud right now in English, 100% consistent with all previous turns.",
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

    const { response, activeKeyIndex, totalKeys } = await generateWithFailover(contents);

    const textOutput = response.text || "";
    const cleanJson = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanJson) as CopilotResponse;

    return NextResponse.json({
      success: true,
      ...result,
      activeKeyIndex,
      totalKeys,
    });
  } catch (error) {
    console.error("Copilot API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json({ error: "Internal Server Error: " + errorVal.message }, { status: 500 });
  }
}
