import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

export type GeminiModel = 
  | "gemini-3-pro-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-image";

export interface GenerateContentOptions {
  model?: GeminiModel;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateText(
  prompt: string,
  options: GenerateContentOptions = {}
): Promise<string> {
  const { model = "gemini-2.5-flash", systemPrompt } = options;

  const contents = systemPrompt
    ? [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood." }] },
        { role: "user" as const, parts: [{ text: prompt }] },
      ]
    : prompt;

  const response = await ai.models.generateContent({
    model,
    contents,
  });

  return response.text || "";
}

export async function* generateTextStream(
  prompt: string,
  options: GenerateContentOptions = {}
): AsyncGenerator<string> {
  const { model = "gemini-2.5-flash", systemPrompt } = options;

  const contents = systemPrompt
    ? [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood." }] },
        { role: "user" as const, parts: [{ text: prompt }] },
      ]
    : prompt;

  const stream = await ai.models.generateContentStream({
    model,
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
    model: "gemini-2.5-flash-image",
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
    model: options.model || "gemini-2.5-flash",
    ...options,
  });
}

export async function chat(
  messages: Array<{ role: "user" | "model"; content: string }>,
  options: GenerateContentOptions = {}
): Promise<string> {
  const { model = "gemini-2.5-flash", systemPrompt } = options;

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
    model,
    contents,
  });

  return response.text || "";
}

export { ai };
