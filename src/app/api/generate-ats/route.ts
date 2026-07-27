import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

    if (!process.env.GEMINI_API_KEY) {
      console.warn("WARNING: GEMINI_API_KEY is not set in .env.local");
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Keep it professional and grounded
      },
    });

    const aiResponseText = response.text || "{}";

    // Clean up potential markdown formatting from Gemini
    const cleanJsonString = aiResponseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse the tailored resume to ensure it's valid JSON
    const tailoredResume = JSON.parse(cleanJsonString);
    console.log("Successfully tailored resume using Gemini!");

    // For now, we just log success. Next step: Generate PDF with this data.

    // 4. Return mock PDF URLs for now to keep frontend working
    return NextResponse.json({
      success: true,
      cvUrl:
        "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+Cj4+CiAgL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwgL0xlbmd0aCA1MSA+PgpzdHJlYW0KQlQKMDkgMCAwIDkwIDEwMCAxMDAgVG0KL0YxIDEyIFRmCihUaGlzIGlzIGEgTW9jayBDRyBQREYgZmlsZS4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxNDkgMDAwMDAgbiAKMDAwMDAwMDI1MyAwMDAwMCBuIAowMDAwMDAwMzM5IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ0MQolJUVPRgo=",
    });
  } catch (error: SyntaxError | Error | unknown) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
