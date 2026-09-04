import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKeys(): string[] {
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

  // Active & verified Gemini Model Fallback Cascade Order
  const models = [
    options.preferredModel || "gemini-2.5-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash-lite",
  ];

  const modelList = Array.from(new Set(models));
  let lastError: Error | null = null;

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
        lastError = err as Error;
        const msg = lastError.message || "";
        console.warn(`⚠️ Gemini API call failed [Model: ${model}, Key #${i + 1}/${keys.length}]: ${msg.slice(0, 150)}...`);

        // If the key is revoked/leaked (403), log specifically
        if (msg.includes("leaked") || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
          console.error(`❌ Gemini API Key #${i + 1} was REVOKED/BLOCKED by Google due to leak detection. Replace this key!`);
        }

        // If the model itself is not found (404), skip remaining keys for this invalid model
        if (msg.includes("404") || msg.includes("not found")) {
          break;
        }
      }
    }
  }

  const isLeakedOrRevoked =
    lastError?.message?.includes("leaked") ||
    lastError?.message?.includes("PERMISSION_DENIED") ||
    lastError?.message?.includes("403");

  const isQuotaExhausted =
    lastError?.message?.includes("429") ||
    lastError?.message?.includes("RESOURCE_EXHAUSTED") ||
    lastError?.message?.includes("quota");

  if (isLeakedOrRevoked) {
    throw new Error(
      `⚠️ Key #2 API Key Gemini Anda terdeteksi DIBLOKIR/REVOKED oleh Google ("Your API key was reported as leaked"). Mohon buat API Key baru di https://aistudio.google.com/ lalu perbarui GEMINI_API_KEY di .env.local atau Vercel.`
    );
  }

  if (isQuotaExhausted) {
    throw new Error(
      `⚠️ Seluruh ${keys.length} API Key Gemini Anda saat ini telah mencapai batas kuota (Rate Limit Free Tier 20 req/day). Silakan buat & tambahkan API Key Gemini baru di https://aistudio.google.com/ pada file .env.local (GEMINI_API_KEY_2=...) atau di Vercel Environment Variables.`
    );
  }

  throw new Error(`All ${keys.length} Gemini API key(s) and fallback models exhausted. Last error: ${lastError?.message}`);
}
