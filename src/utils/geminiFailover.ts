import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];

  if (process.env.GEMINI_API_KEYS) {
    const splitKeys = process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean);
    keys.push(...splitKeys);
  }

  // Unlimited sequential dynamic key discovery: read GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... until undefined/empty
  let i = 1;
  while (true) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (!k || !k.trim() || k.trim().startsWith("GEMINI_API_KEY")) {
      break;
    }
    keys.push(k.trim());
    i++;
  }

  if (process.env.GEMINI_API_KEY) {
    const mainKey = process.env.GEMINI_API_KEY.trim();
    if (mainKey && !mainKey.startsWith("GEMINI_API_KEY")) {
      keys.push(mainKey);
    }
  }

  return Array.from(new Set(keys));
}

export interface GenerateOptions {
  temperature?: number;
  contents: unknown;
  preferredModel?: string;
}

export async function generateWithFailover(
  optionsOrContents: GenerateOptions | string | (string | { inlineData: { data: string; mimeType: string } })[]
) {
  let options: GenerateOptions;
  if (typeof optionsOrContents === "string" || Array.isArray(optionsOrContents)) {
    options = { contents: optionsOrContents };
  } else {
    options = optionsOrContents;
  }

  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY configured in environment variables. Please set GEMINI_API_KEY in .env.local");
  }

  // Active & verified Gemini Model for current Google GenAI SDK
  const models = [
    options.preferredModel || "gemini-2.5-flash",
    "gemini-2.5-flash",
  ];

  const modelList = Array.from(new Set(models));
  const allErrors: string[] = [];
  let lastErrorMsg = "";

  for (const model of modelList) {
    for (let i = 0; i < keys.length; i++) {
      try {
        const ai = new GoogleGenAI({ apiKey: keys[i] });
        const response = await ai.models.generateContent({
          model: model,
          contents: options.contents as any,
          config: options.temperature !== undefined ? { temperature: options.temperature } : undefined,
        });
        return { response, activeKeyIndex: i + 1, totalKeys: keys.length, usedModel: model };
      } catch (err) {
        const errorVal = err as Error;
        const msg = errorVal.message || "";
        lastErrorMsg = msg;
        allErrors.push(msg);
        console.warn(`⚠️ Gemini API call failed [Model: ${model}, Key #${i + 1}/${keys.length}]: ${msg.slice(0, 150)}...`);

        const isUnauthorizedOrInvalid =
          msg.includes("401") ||
          msg.includes("unauthorized") ||
          msg.includes("INVALID_ARGUMENT") ||
          msg.includes("not valid") ||
          msg.includes("leaked") ||
          msg.includes("403") ||
          msg.includes("PERMISSION_DENIED");

        if (isUnauthorizedOrInvalid) {
          console.error(
            `❌ Gemini API Key #${i + 1} returned 401 Unauthorized / Invalid Key. Reached end of valid configured key chain (Boundary Stop at key #${i + 1}).`
          );
          // Stop trying subsequent non-existent or unauthorized keys
          break;
        }

        // If the model itself is not found (404), skip remaining keys for this invalid model
        if (msg.includes("404") || msg.includes("not found")) {
          break;
        }
      }
    }
  }

  // Comprehensive diagnosis across ALL recorded errors in the loop
  const hasLeakedOrInvalidKey = allErrors.some(
    (e) =>
      e.includes("401") ||
      e.includes("unauthorized") ||
      e.includes("leaked") ||
      e.includes("PERMISSION_DENIED") ||
      e.includes("403") ||
      e.includes("INVALID_ARGUMENT") ||
      e.includes("not valid")
  );

  const hasQuotaExhausted = allErrors.some(
    (e) => e.includes("429") || e.includes("RESOURCE_EXHAUSTED") || e.includes("quota")
  );

  if (hasQuotaExhausted) {
    throw new Error(
      `⚠️ Seluruh ${keys.length} API Key Gemini Anda saat ini telah mencapai batas kuota harian (Rate Limit Free Tier). Silakan buat & tambahkan API Key Gemini baru di https://aistudio.google.com/ pada file .env.local atau Vercel Environment Variables.`
    );
  }

  if (hasLeakedOrInvalidKey) {
    throw new Error(
      `⚠️ API Key Gemini Anda tidak valid atau telah diblokir/revoked oleh Google ("Your API key was reported as leaked" / "401 Unauthorized"). Mohon buat API Key baru di https://aistudio.google.com/ lalu perbarui GEMINI_API_KEY_1 di .env.local atau Vercel.`
    );
  }

  throw new Error(`All ${keys.length} Gemini API key(s) and fallback models exhausted. Last error: ${lastErrorMsg}`);
}
