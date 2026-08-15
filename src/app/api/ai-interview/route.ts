import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface DialogueTurn {
  sender: "ai" | "user";
  text: string;
}

// Password Verification Helper using existing master_cv.enc file
async function verifyPassword(password: string): Promise<boolean> {
  if (!password) return false;
  
  let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
  try {
    await fs.access(dataPath);
  } catch {
    dataPath = path.join(process.cwd(), "my-project-some", "my-app", "my-agent", "data", "master_cv.enc");
  }
  
  try {
    const encryptedData = await fs.readFile(dataPath, "utf-8");
    const parts = encryptedData.split(":");
    const ivHex = parts.shift();
    if (!ivHex) return false;

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = parts.join(":");

    const key = crypto.scryptSync(password, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    // If decryption succeeds and yields valid JSON, password is correct
    JSON.parse(decrypted);
    return true;
  } catch (err) {
    console.error("Password verification failed inside ai-interview route:", err);
    return false;
  }
}

// Helper to load decrypted CV data
async function loadDecryptedCv(password: string): Promise<string> {
  let dataPath = path.join(process.cwd(), "data", "master_cv.enc");
  try {
    await fs.access(dataPath);
  } catch {
    dataPath = path.join(process.cwd(), "my-project-some", "my-app", "my-agent", "data", "master_cv.enc");
  }
  
  const encryptedData = await fs.readFile(dataPath, "utf-8");
  const parts = encryptedData.split(":");
  const ivHex = parts.shift() || "";
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = parts.join(":");

  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, password, jobDescription, targetRole, history, userAnswer } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Decryption password is required to access the AI Video Interview Room" },
        { status: 401 },
      );
    }

    const isAuthorized = await verifyPassword(password);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid decryption password. Access Denied." },
        { status: 401 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is missing in environment variables" },
        { status: 500 },
      );
    }

    // Action 1: Start Session
    if (action === "start-session") {
      const cvText = await loadDecryptedCv(password);

      console.log(`Starting AI Video Call Interview session for role: ${targetRole || "Software Engineer"}`);
      const prompt = `
You are an elite, highly professional Executive Tech Interviewer conducting a live Zoom video call interview.
Target Role: ${targetRole || "Software Engineer"}
Job Description:
${jobDescription || "N/A"}

Candidate Master Resume Context:
${cvText}

Your task:
1. Greet the candidate warmly as if starting a video call meeting.
2. Ask your FIRST dynamic, tailored interview question based on the candidate's background and the target role requirements.
3. Keep your response conversational, concise (under 3 sentences), direct, and spoken-friendly so it sounds natural when synthesized out loud.

Return ONLY a raw JSON object with the following key:
{
  "aiMessage": "<Your greeting and first interview question to the candidate>"
}

Do NOT wrap the response in markdown blocks. Just raw JSON string.
`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.7 },
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJsonString);

        return NextResponse.json({
          success: true,
          aiMessage: data.aiMessage || "Hello! Welcome to the interview room. To get started, could you introduce yourself and highlight your relevant experience?",
          turnCount: 1,
        });
      } catch (err) {
        console.error("Gemini Start Session Error:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to start interview session: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    // Action 2: Next Turn (Conversational Loop)
    if (action === "next-turn") {
      if (!userAnswer) {
        return NextResponse.json(
          { error: "userAnswer is required for next-turn action" },
          { status: 400 },
        );
      }

      const formattedHistory = ((history || []) as DialogueTurn[])
        .map((h) => `${h.sender === "ai" ? "INTERVIEWER" : "CANDIDATE"}: ${h.text}`)
        .join("\n");

      console.log("Evaluating candidate spoken answer and deciding next turn...");
      const prompt = `
You are conducting a live Zoom mock interview for the role of ${targetRole || "Software Engineer"}.
Target Job Description Context: ${jobDescription || "N/A"}

CONVERSATION HISTORY SO FAR:
${formattedHistory}

CANDIDATE'S LATEST SPOKEN ANSWER:
${userAnswer}

Your task:
1. Briefly acknowledge or probe the candidate's latest answer in 1 sentence.
2. Either ask a technical follow-up question OR move to the next relevant interview topic (e.g. system design, behavioral STAR, or project trade-offs).
3. Keep the response concise, natural for voice speech synthesis (under 3-4 sentences total), and engaging.
4. Indicate if the interview has reached a natural conclusion (usually after 4 to 5 substantial questions).

Return ONLY a raw JSON object with the exact keys:
{
  "aiMessage": "<Your conversational response + next interview question>",
  "isFinished": <boolean true if 4+ questions answered and interview can conclude, false otherwise>
}

Do NOT wrap the response in markdown blocks. Just raw JSON string.
`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.6 },
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJsonString);

        return NextResponse.json({
          success: true,
          aiMessage: data.aiMessage || "Thank you for sharing that. Let's move on to your technical decision-making under high system load.",
          isFinished: Boolean(data.isFinished),
        });
      } catch (err) {
        console.error("Gemini Next Turn Error:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to evaluate response: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    // Action 3: Generate Final Scorecard Report
    if (action === "generate-report") {
      const formattedHistory = ((history || []) as DialogueTurn[])
        .map((h) => `${h.sender === "ai" ? "INTERVIEWER" : "CANDIDATE"}: ${h.text}`)
        .join("\n");

      console.log("Generating post-interview analytics scorecard...");
      const prompt = `
You are an expert Executive Hiring Manager evaluating a candidate's full interview performance.
Target Role: ${targetRole || "Software Engineer"}
Job Description Context: ${jobDescription || "N/A"}

COMPLETE INTERVIEW TRANSCRIPT:
${formattedHistory}

Analyze the candidate's answers comprehensively for technical depth, problem-solving structure, communication clarity, and alignment with the job description.

Return ONLY a raw JSON object with the following keys:
{
  "overallScore": <integer between 1 and 10>,
  "feedback": "<A 2-3 sentence executive evaluation summary>",
  "strengths": ["<Array of 2 to 4 specific strong points demonstrated by the candidate>"],
  "gaps": ["<Array of 2 to 4 key technical areas, keywords, or depth missing from candidate answers>"],
  "recommendations": ["<Array of 2 actionable tips for candidate's real interview>"]
}

Do NOT wrap the response in markdown blocks. Just raw JSON string.
`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { temperature: 0.3 },
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const report = JSON.parse(cleanJsonString);

        return NextResponse.json({
          success: true,
          report: {
            overallScore: report.overallScore || 8,
            feedback: report.feedback || "Solid overall performance with good problem-solving structure.",
            strengths: report.strengths || ["Clear articulation of technical trade-offs"],
            gaps: report.gaps || ["Could provide deeper metrics on production scale"],
            recommendations: report.recommendations || ["Use the STAR method for behavioral questions"],
          },
        });
      } catch (err) {
        console.error("Gemini Report Generation Error:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to generate interview report: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action. Supported values are: start-session, next-turn, generate-report" },
      { status: 400 },
    );
  } catch (error) {
    console.error("AI Interview API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json(
      { error: "Internal Server Error: " + errorVal.message },
      { status: 500 },
    );
  }
}
