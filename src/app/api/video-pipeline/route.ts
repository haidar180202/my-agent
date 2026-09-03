import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { generateWithFailover } from "@/utils/geminiFailover";

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
    console.error("Password verification failed inside video-pipeline route:", err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, projectDescription, videoFormat, videoTone } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Decryption password is required to access the Video Pipeline" },
        { status: 401 },
      );
    }

    if (!projectDescription || !videoFormat || !videoTone) {
      return NextResponse.json(
        { error: "Project description, video format, and tone are required" },
        { status: 400 },
      );
    }

    // Verify Password by trying to decrypt master_cv.enc
    const isAuthorized = await verifyPassword(password);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid decryption password. Access Denied." },
        { status: 401 },
      );
    }

    console.log(`Generating video script for format: ${videoFormat}, tone: ${videoTone}`);

    const prompt = `
You are an expert tech video producer, scriptwriter, and presentation coach.
I will provide you with a description of a portfolio project, a target video format, and a tone of voice.

Your task is to generate a comprehensive scene-by-scene storyboard and voiceover script.
The script should be highly engaging, have a strong hook in the first 3 seconds, explain the problem/solution structure clearly, and end with a call to action.

PROJECT DETAILS:
${projectDescription}

VIDEO FORMAT: ${videoFormat}
TONE OF VOICE: ${videoTone}

Format requirement:
Generate exactly 5 to 7 chronological scenes representing the video outline.
Return ONLY a raw JSON array of objects containing the following keys:
[
  {
    "sceneNumber": 1,
    "duration": 10,
    "visual": "<A visual instruction describing what to show on screen. Keep it short, actionable, and visual>",
    "voiceover": "<The exact narration script for the presenter to say in this scene. Focus on punchy copy>",
    "audioCue": "<Suggested sound effect or background music transition suggestion>"
  }
]

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON array string.
`;

    try {
      const { response } = await generateWithFailover({
        contents: prompt,
        temperature: 0.7,
        preferredModel: "gemini-2.5-flash",
      });
      const aiResponseText = response.text || "[]";
      const cleanJsonString = aiResponseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
        
      const script = JSON.parse(cleanJsonString);
      return NextResponse.json({ success: true, script });
    } catch (err) {
      console.error("Gemini Video Script Generation Error:", err);
      const errorVal = err as Error;
      return NextResponse.json(
        { error: "Failed to generate video script: " + errorVal.message },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Video Pipeline API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json(
      { error: "Internal Server Error: " + errorVal.message },
      { status: 500 },
    );
  }
}
