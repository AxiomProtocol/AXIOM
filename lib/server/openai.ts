import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateTextOpenAI(
  prompt: string,
  options: { model?: string; systemPrompt?: string; maxTokens?: number } = {}
): Promise<string> {
  const { model = 'gpt-4o', systemPrompt, maxTokens = 2000 } = options;

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateImageOpenAI(prompt: string): Promise<string | null> {
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }
    return null;
  } catch (error) {
    console.error('OpenAI image generation failed:', error);
    return null;
  }
}

export { openai };
