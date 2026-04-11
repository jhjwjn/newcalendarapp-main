const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// fast=true → llama-3.1-8b-instant  (브리핑, 운동피드백 등 단순 작업)
// fast=false → llama-3.3-70b-versatile (라우터 판단 등 복잡한 작업)
export const GROQ_MODEL_FAST = 'llama-3.1-8b-instant';
export const GROQ_MODEL_HEAVY = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callGroqAI(
  apiKey: string,
  messages: GroqMessage[],
  maxTokens: number = 1024,
  fast: boolean = false
): Promise<string> {
  if (!apiKey) {
    throw new Error('GROQ API 키가 설정되지 않았습니다.');
  }

  const model = fast ? GROQ_MODEL_FAST : GROQ_MODEL_HEAVY;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export function createSystemPrompt(role: string, instructions: string): GroqMessage {
  return {
    role: 'system',
    content: `당신은 ${role}입니다. ${instructions}`,
  };
}

export function createUserMessage(content: string): GroqMessage {
  return { role: 'user', content };
}

export function createAssistantMessage(content: string): GroqMessage {
  return { role: 'assistant', content };
}
