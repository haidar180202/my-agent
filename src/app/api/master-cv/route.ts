import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

// Encrypt and save Master CV helper
async function encryptAndSaveMasterCv(password: string, cvData: Record<string, unknown>): Promise<void> {
  const dataPath = await getMasterCvPath();
  const rawJson = JSON.stringify(cvData, null, 2);

  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(rawJson, "utf8", "hex");
  encrypted += cipher.final("hex");

  const payload = `${iv.toString("hex")}:${encrypted}`;
  await fs.writeFile(dataPath, payload, "utf-8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, password, masterCvData } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Decryption password is required to access Master CV Vault" },
        { status: 401 },
      );
    }

    // Action 1: Load & Decrypt CV
    if (action === "load-cv") {
      try {
        const cvData = await decryptMasterCv(password);
        return NextResponse.json({ success: true, masterCvData: cvData });
      } catch (err) {
        console.error("Master CV Decryption Failed:", err);
        return NextResponse.json(
          { error: "Invalid decryption password. Access Denied." },
          { status: 401 },
        );
      }
    }

    // Action 2: Edit, Re-encrypt & Save CV
    if (action === "save-cv") {
      if (!masterCvData || typeof masterCvData !== "object") {
        return NextResponse.json(
          { error: "masterCvData object is required for saving" },
          { status: 400 },
        );
      }

      // Verify password authorization first
      try {
        await decryptMasterCv(password);
      } catch {
        return NextResponse.json(
          { error: "Invalid decryption password. Access Denied." },
          { status: 401 },
        );
      }

      try {
        await encryptAndSaveMasterCv(password, masterCvData as Record<string, unknown>);
        return NextResponse.json({
          success: true,
          message: "Master CV data updated and re-encrypted successfully!",
        });
      } catch (err) {
        console.error("Failed to re-encrypt and save Master CV:", err);
        const errorVal = err as Error;
        return NextResponse.json(
          { error: "Failed to save Master CV: " + errorVal.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action. Supported values are: load-cv, save-cv" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Master CV API Error:", error);
    const errorVal = error as Error;
    return NextResponse.json(
      { error: "Internal Server Error: " + errorVal.message },
      { status: 500 },
    );
  }
}
