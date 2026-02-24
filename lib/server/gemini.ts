import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const useDirectApi = !baseUrl;

if (!apiKey) {
  console.warn("[gemini] No API key found in GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY");
}

const ai = new GoogleGenAI({
  apiKey,
  ...(baseUrl ? { httpOptions: { apiVersion: "", baseUrl } } : {}),
});

export type GeminiModel = 
  | "gemini-3-flash"
  | "gemini-3-pro-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-image";

const DIRECT_API_MODEL_MAP: Record<string, string> = {
  "gemini-3-flash": "gemini-2.5-flash",
  "gemini-3-pro-preview": "gemini-2.5-pro",
  "gemini-2.5-flash-image": "gemini-2.5-flash",
};

function resolveModel(model: string): string {
  if (useDirectApi && DIRECT_API_MODEL_MAP[model]) {
    return DIRECT_API_MODEL_MAP[model];
  }
  return model;
}

export interface GenerateContentOptions {
  model?: GeminiModel;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingBudget?: number;
}

export async function generateText(
  prompt: string,
  options: GenerateContentOptions = {}
): Promise<string> {
  const { model = "gemini-3-flash", systemPrompt } = options;

  const contents = systemPrompt
    ? [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood." }] },
        { role: "user" as const, parts: [{ text: prompt }] },
      ]
    : prompt;

  const genConfig: any = {};
  if (options.thinkingBudget !== undefined) {
    genConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
  }

  const response = await ai.models.generateContent({
    model: resolveModel(model),
    contents,
    config: Object.keys(genConfig).length > 0 ? genConfig : undefined,
  });

  return response.text || "";
}

export async function* generateTextStream(
  prompt: string,
  options: GenerateContentOptions = {}
): AsyncGenerator<string> {
  const { model = "gemini-3-flash", systemPrompt } = options;

  const contents = systemPrompt
    ? [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood." }] },
        { role: "user" as const, parts: [{ text: prompt }] },
      ]
    : prompt;

  const stream = await ai.models.generateContentStream({
    model: resolveModel(model),
    contents,
  });

  for await (const chunk of stream) {
    const text = chunk.text || "";
    if (text) {
      yield text;
    }
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: resolveModel("gemini-2.5-flash-image"),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in response");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

export async function analyzeContent(
  content: string,
  analysisType: "summarize" | "extract" | "classify" | "sentiment",
  options: GenerateContentOptions = {}
): Promise<string> {
  const prompts: Record<string, string> = {
    summarize: `Provide a concise summary of the following content:\n\n${content}`,
    extract: `Extract the key information and entities from the following content:\n\n${content}`,
    classify: `Classify the following content into relevant categories:\n\n${content}`,
    sentiment: `Analyze the sentiment and tone of the following content:\n\n${content}`,
  };

  return generateText(prompts[analysisType], {
    model: options.model || "gemini-3-flash",
    ...options,
  });
}

export async function chat(
  messages: Array<{ role: "user" | "model"; content: string }>,
  options: GenerateContentOptions = {}
): Promise<string> {
  const { model = "gemini-3-flash", systemPrompt } = options;

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  if (systemPrompt) {
    contents.unshift(
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood." }] }
    );
  }

  const response = await ai.models.generateContent({
    model: resolveModel(model),
    contents,
  });

  return response.text || "";
}

export { ai };
