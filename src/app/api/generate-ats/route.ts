import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Note: Puppeteer and GenAI imports will be added later when we connect the AI pipeline.
// For now, this route validates the data and mocks the response so the frontend can be tested.

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

    // 1. Read the master_cv.json file
    const dataPath = path.join(process.cwd(), "data", "master_cv.json");
    const masterCvRaw = await fs.readFile(dataPath, "utf-8");
    const masterCv = JSON.parse(masterCvRaw);

    // 2. Here we would call the LLM (Gemini or Ollama fallback) to tailor the masterCv
    // based on the provided jobDescription and targetRole.
    console.log(`Analyzing JD for role: ${targetRole}`);
    console.log(`Loaded Master CV for: ${masterCv.basics?.name}`);

    // Mocking the delay for AI generation & PDF rendering (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. Return mock PDF URLs for now.
    // In the real implementation, this will return data URIs (Base64) or URLs to saved PDFs in /public/generated.
    return NextResponse.json({
      success: true,
      cvUrl:
        "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+Cj4+CiAgL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwgL0xlbmd0aCA1MSA+PgpzdHJlYW0KQlQKMDkgMCAwIDkwIDEwMCAxMDAgVG0KL0YxIDEyIFRmCihUaGlzIGlzIGEgTW9jayBDRyBQREYgZmlsZS4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxNDkgMDAwMDAgbiAKMDAwMDAwMDI1MyAwMDAwMCBuIAowMDAwMDAwMzM5IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ0MQolJUVPRgo=",
      coverLetterUrl:
        "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCj4+Cj4+CiAgL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iagoKNCAwIG9iago8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgo+PgplbmRvYmoKCjUgMCBvYmoKPDwgL0xlbmd0aCA1MSA+PgpzdHJlYW0KQlQKMDkgMCAwIDkwIDEwMCAxMDAgVG0KL0YxIDEyIFRmCihUaGlzIGlzIGEgTW9jayBDb3ZlciBMZXR0ZXIgUERGIGZpbGUuKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTQ5IDAwMDAwIG4gCjAwMDAwMDAyNTMgMDAwMDAgbiAKMDAwMDAwMDMzOSAwMDAwMCBuIAp0cmFpbGVyCjw8CiAgL1NpemUgNgogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0NjEKJSVFT0YK",
    });
  } catch (error: SyntaxError | Error | unknown) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
