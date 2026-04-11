import { callGroqAI, createSystemPrompt, createUserMessage } from './groq';
import { format } from 'date-fns';

const CACHE_KEY = 'planner_daily_inspiration';
const CACHE_EXPIRY_HOURS = 24;

interface InspirationCache {
  content: string;
  date: string;
  timestamp: number;
}

function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getCachedInspiration(): InspirationCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedInspiration(content: string): void {
  const cache: InspirationCache = {
    content,
    date: getTodayDate(),
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isCacheValid(cache: InspirationCache): boolean {
  const now = Date.now();
  const cacheAge = now - cache.timestamp;
  const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  return cache.date === getTodayDate() && cacheAge < expiryMs;
}

export async function getDailyInspiration(
  apiKey: string,
  upcomingEvents: string[],
  recentNotes: string[]
): Promise<string> {
  const cached = getCachedInspiration();
  if (cached && isCacheValid(cached)) {
    return cached.content;
  }

  const eventsContext = upcomingEvents.length > 0
    ? `다가오는 일정: ${upcomingEvents.join(', ')}`
    : '다가오는 일정이 없습니다.';

  const notesContext = recentNotes.length > 0
    ? `최근 노트: ${recentNotes.join('; ')}`
    : '최근 노트가 없습니다.';

  const prompt = `오늘은 ${format(new Date(), 'M월 d일')}입니다.
${eventsContext}
${notesContext}

위 정보를 바탕으로, 사용자에게 오늘 하루를 시작할 수 있는 동기부여 한마디를 해주세요.
- 50자 내외로 짧고 간결하게
- 일정이나 노트 내용을 반영해서个性化的으로
- 격려하거나 힌트를 주는 톤으로`;

  try {
    const messages = [
      createSystemPrompt('동기부여 코치', '简短하고有力的한 한마디를 제공하는 전문가입니다.'),
      createUserMessage(prompt),
    ];

    const content = await callGroqAI(apiKey, messages, 150, true);
    setCachedInspiration(content);
    return content;
  } catch (error) {
    const fallbackCached = getCachedInspiration();
    if (fallbackCached) {
      return fallbackCached.content;
    }
    return '오늘도 작은 시작이 큰 변화를 만듭니다.';
  }
}

export function clearInspirationCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
