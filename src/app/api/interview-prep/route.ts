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
    console.error("Password verification failed:", err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, password, jobDescription, targetRole, interviewType, question, userAnswer } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action parameter (generate-questions or evaluate-answer) is required" },
        { status: 400 },
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Decryption password is required to access the Interview Prep module" },
        { status: 401 },
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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is missing in environment variables" },
        { status: 500 },
      );
    }

    // Action 1: Generate Mock Questions
    if (action === "generate-questions") {
      if (!jobDescription || !targetRole) {
        return NextResponse.json(
          { error: "Job description and target role are required" },
          { status: 400 },
        );
      }

      console.log(`Generating interview questions for role: ${targetRole}`);

      const prompt = `
You are an expert technical recruiter and interviewer.
I will provide you with a Target Role and a Job Description.

Your task is to generate exactly 5 realistic, challenging mock interview questions.
The questions should match the specified target role and extract requirements from the Job Description.

TARGET ROLE: ${targetRole}
INTERVIEW TYPE: ${interviewType || "Mixed"}
JOB DESCRIPTION:
${jobDescription}

Return ONLY a raw JSON array of 5 objects containing the following keys:
[
  {
    "id": 1,
    "question": "<The full question string, tailored to evaluate skills required by the JD>",
    "category": "<e.g., Technical, Behavioral, System Design>",
    "context": "<Short description of what specific skill or criteria this question targets>"
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
          
        const questions = JSON.parse(cleanJsonString);
        return NextResponse.json({ success: true, questions });
      } catch (err) {
        console.error("Gemini Question Generation Error:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to generate questions: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    // Action 2: Evaluate Answer
    if (action === "evaluate-answer") {
      if (!question || !userAnswer) {
        return NextResponse.json(
          { error: "Question and userAnswer are required for evaluation" },
          { status: 400 },
        );
      }

      console.log("Evaluating user answer...");

      const prompt = `
You are an expert interviewer evaluating a candidate's response.
I will provide you with the Target Role, the Job Description, the Question, and the User's Answer.

Evaluate the response objectively. Give constructive, professional, and detailed feedback.

TARGET ROLE: ${targetRole || "Software Engineer"}
JOB DESCRIPTION (For context):
${jobDescription || "N/A"}

QUESTION:
${question}

USER'S ANSWER:
${userAnswer}

Return ONLY a raw JSON object containing the following keys:
{
  "score": <An integer from 1 to 10 evaluating the quality and depth of the response>,
  "feedback": "<A concise, constructive summary of the answer's quality, tone, and correctness>",
  "strengths": ["<Array of 1 to 3 specific points the candidate covered extremely well>"],
  "gaps": ["<Array of 1 to 3 key details, keywords, or considerations the candidate missed or could improve>"],
  "modelAnswer": "<A highly detailed, professional, gold-standard answer to the question that highlights best practices>"
}

Do NOT wrap the response in markdown blocks (e.g., \`\`\`json). Just the raw JSON string.
`;

      try {
        const { response } = await generateWithFailover({
          contents: prompt,
          temperature: 0.3,
          preferredModel: "gemini-2.5-flash",
        });
        const aiResponseText = response.text || "{}";
        const cleanJsonString = aiResponseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
          
        const evaluation = JSON.parse(cleanJsonString);
        return NextResponse.json({ success: true, evaluation });
      } catch (err) {
        console.error("Gemini Evaluation Error:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to evaluate answer: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action. Supported values are: generate-questions, evaluate-answer" },
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
