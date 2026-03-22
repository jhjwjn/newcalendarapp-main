import { callGroqAI, createSystemPrompt, createUserMessage } from './groq';
import { format } from 'date-fns';

export interface OPICWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  level: 'IH' | 'IM' | 'AH';
}

interface OPICCache {
  date: string;
  words: OPICWord[];
}

const WORD_POOL_KEY = 'opic_word_pool';
const DAILY_WORDS_KEY = 'opic_daily_words';
const LEARNED_KEY = 'opic_learned';

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getWordPool(): OPICWord[] {
  try {
    const stored = localStorage.getItem(WORD_POOL_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error('Error loading word pool');
  }
  return [];
}

export function saveWordPool(words: OPICWord[]): void {
  localStorage.setItem(WORD_POOL_KEY, JSON.stringify(words));
}

export function getLearnedWords(): OPICWord[] {
  try {
    const stored = localStorage.getItem(LEARNED_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error('Error loading learned words');
  }
  return [];
}

export function saveLearnedWords(words: OPICWord[]): void {
  localStorage.setItem(LEARNED_KEY, JSON.stringify(words));
}

export function markWordAsLearned(word: OPICWord, correct: boolean): void {
  const learned = getLearnedWords();
  const existingIndex = learned.findIndex(w => w.id === word.id);
  
  if (correct) {
    if (existingIndex !== -1) {
      learned.splice(existingIndex, 1);
    }
  } else {
    if (existingIndex === -1) {
      learned.push({ ...word, id: generateId() });
    }
  }
  
  saveLearnedWords(learned);
}

export function getDailyWords(): OPICWord[] | null {
  try {
    const stored = localStorage.getItem(DAILY_WORDS_KEY);
    if (!stored) return null;
    
    const cache: OPICCache = JSON.parse(stored);
    if (cache.date !== getToday()) return null;
    
    return cache.words;
  } catch {
    return null;
  }
}

export function saveDailyWords(words: OPICWord[]): void {
  const cache: OPICCache = {
    date: getToday(),
    words,
  };
  localStorage.setItem(DAILY_WORDS_KEY, JSON.stringify(cache));
}

export async function fetchNewOPICWords(
  apiKey: string,
  count: number = 20
): Promise<OPICWord[]> {
  const existingWords = getWordPool();
  const existingWordsLower = existingWords.map(w => w.word.toLowerCase());
  const learned = getLearnedWords();
  const learnedLower = learned.map(w => w.word.toLowerCase());
  
  const excludeList = [...existingWordsLower, ...learnedLower];
  
  const systemPrompt = createSystemPrompt('영어 단어 전문가', `
    IH(Intermediate High) 이상 수준의 실용적인 영어 단어 ${count}개를 추천해주세요.
    
    조건:
    - work, happy, go 같은 기초 단어 제외
    - IH(IMAdvanced High) 수준의 실용적 단어
    - OPIC 시험에 자주 나오는 수준
    
    응답 형식 (JSON 배열):
    [
      {
        "word": "단어",
        "meaning": "뜻",
        "example": "예문 (단어를 자연스럽게 사용)",
        "level": "IH" 또는 "IM" 또는 "AH"
      }
    ]
    
    ${excludeList.length > 0 ? `이미 있는 단어 제외: ${excludeList.slice(0, 50).join(', ')}` : ''}
  `);

  const userMessage = createUserMessage(`${count}개의 새로운 영어 단어를IH 이상 수준으로 추천해주세요.`);

  try {
    const response = await callGroqAI(apiKey, [systemPrompt, userMessage], 2000);
    
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Omit<OPICWord, 'id'>[];
      const newWords: OPICWord[] = parsed.map(w => ({
        ...w,
        id: generateId(),
      }));
      
      const allWords = [...existingWords, ...newWords];
      saveWordPool(allWords);
      
      return newWords;
    }
  } catch (error) {
    console.error('Error fetching OPIC words:', error);
  }
  
  return [];
}

export function getTodayStudySet(): { words: OPICWord[]; isNew: boolean } {
  const cachedDaily = getDailyWords();
  if (cachedDaily) {
    return { words: cachedDaily, isNew: false };
  }
  
  const learned = getLearnedWords();
  const repeated = learned.slice(0, 5);
  
  return { words: repeated, isNew: repeated.length > 0 };
}

export function clearOPICCache(): void {
  localStorage.removeItem(WORD_POOL_KEY);
  localStorage.removeItem(DAILY_WORDS_KEY);
  localStorage.removeItem(LEARNED_KEY);
}

export function getOPICStats(): { totalWords: number; learnedToday: number; reviewCount: number } {
  const pool = getWordPool();
  const learned = getLearnedWords();
  const today = getDailyWords();
  
  return {
    totalWords: pool.length,
    learnedToday: today?.length || 0,
    reviewCount: learned.length,
  };
}
