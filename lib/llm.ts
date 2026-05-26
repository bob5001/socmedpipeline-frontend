import { anthropic } from '@/lib/anthropic';
import { Message } from '@/lib/types';

interface ChatParams {
  system?: string;
  messages: Message[];
  maxTokens: number;
}

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';

export async function chat({ system, messages, maxTokens }: ChatParams): Promise<string> {
  if (USE_OLLAMA) {
    const ollamaMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ];

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: false, options: { num_predict: maxTokens } }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    return data.message?.content ?? '';
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    stream: false,
    ...(system ? { system } : {}),
    messages,
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
