// Gemini API 클라이언트
// 용도: 캘린더 파싱, 영어 작문/피드백, OPIC 스크립트 (언어 정확도가 중요한 작업)

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callGeminiAI(
  apiKey: string,
  messages: GeminiMessage[],
  maxTokens: number = 1024
): Promise<string> {
  if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');

  // 시스템 메시지 분리
  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role !== 'system');

  // Gemini 포맷으로 변환 (assistant → model)
  const contents = conversationMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  // 시스템 프롬프트는 system_instruction으로 전달
  if (systemMsg) {
    body.system_instruction = { parts: [{ text: systemMsg.content }] };
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function createGeminiMessage(role: 'system' | 'user' | 'assistant', content: string): GeminiMessage {
  return { role, content };
}
