import { callGroqAI, createSystemPrompt, createUserMessage } from './groq';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { WorkoutRecord } from '../types/health';

const CACHE_KEY = 'health_ai_comment';
const CACHE_EXPIRY_HOURS = 24;

interface CommentCache {
  content: string;
  date: string;
  timestamp: number;
}

function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getCachedComment(): CommentCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedComment(content: string): void {
  const cache: CommentCache = {
    content,
    date: getTodayDate(),
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isCacheValid(cache: CommentCache): boolean {
  const now = Date.now();
  const cacheAge = now - cache.timestamp;
  const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  return cache.date === getTodayDate() && cacheAge < expiryMs;
}

function analyzeWorkoutPatterns(records: WorkoutRecord[]) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const thisWeekRecords = records.filter(r => {
    const date = new Date(r.date);
    return date >= weekStart && date <= weekEnd;
  });

  const last7Days = eachDayOfInterval({ start: subDays(now, 6), end: now });
  const last7DaysRecords = records.filter(r => {
    const date = new Date(r.date);
    return date >= subDays(now, 6) && date <= now;
  });

  const exerciseCount: Record<string, number> = {};
  last7DaysRecords.forEach(record => {
    record.exercises.forEach(ex => {
      exerciseCount[ex.name] = (exerciseCount[ex.name] || 0) + 1;
    });
  });

  const bodyParts = {
    chest: ['벤치프레스', '체스트프레스', '딥스', '푸시업', '플라이'],
    back: ['렛풀다운', '로우', '풀업', '케이블로우', '바벨로우'],
    legs: ['스쿼트', '레그프레스', '레그컬', '레그익스텐션', '카프레이즈'],
    shoulders: ['숄더프레스', '레터럴레이즈', '프론트레이즈', '숄더'],
    arms: ['바이셉스컬', '트라이셉스컬', '암컬', '해머컬'],
  };

  const missingParts: string[] = [];
  const activeParts: string[] = [];

  Object.entries(bodyParts).forEach(([part, exercises]) => {
    const hasExercised = exercises.some(ex => exerciseCount[ex] > 0);
    if (hasExercised) {
      activeParts.push(part);
    } else {
      missingParts.push(part);
    }
  });

  const lastWorkout = records.length > 0 
    ? records.reduce((latest, record) => {
        return new Date(record.date) > new Date(latest.date) ? record : latest;
      })
    : null;

  const daysSinceLastWorkout = lastWorkout 
    ? Math.floor((now.getTime() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    thisWeekCount: thisWeekRecords.length,
    thisWeekVolume: thisWeekRecords.reduce((sum, r) => sum + r.totalVolume, 0),
    last7DaysCount: last7DaysRecords.length,
    exerciseCount,
    missingParts,
    activeParts,
    lastWorkout,
    daysSinceLastWorkout,
  };
}

export async function getHealthRecommendation(
  apiKey: string,
  records: WorkoutRecord[]
): Promise<string> {
  const cached = getCachedComment();
  if (cached && isCacheValid(cached)) {
    return cached.content;
  }

  if (!apiKey) {
    return '설정에서 API 키를 입력하면 운동 추천을 받을 수 있습니다.';
  }

  const analysis = analyzeWorkoutPatterns(records);

  const analysisText = `
이번 주 운동 횟수: ${analysis.thisWeekCount}회
이번 주 총 볼륨: ${analysis.thisWeekVolume.toLocaleString()}kg
최근 7일 운동 횟수: ${analysis.last7DaysCount}회
${analysis.lastWorkout ? `마지막 운동: ${format(new Date(analysis.lastWorkout.date), 'M월 d일')} - ${analysis.lastWorkout.exercises.map(e => e.name).join(', ')}` : '아직 운동 기록이 없습니다.'}
${analysis.daysSinceLastWorkout !== null ? `마지막 운동으로부터 ${analysis.daysSinceLastWorkout}일 경과` : ''}
부위별 운동 빈도: ${Object.entries(analysis.exerciseCount).map(([ex, count]) => `${ex}(${count}회)`).join(', ') || '없음'}
부족한 부위: ${analysis.missingParts.join(', ') || '없음'}
활성 부위: ${analysis.activeParts.join(', ') || '없음'}
`;

  const prompt = `다음은 사용자의 운동 기록 분석 결과입니다:
${analysisText}

위 정보를 바탕으로, 사용자에게 격려와 구체적인 운동 추천을 2-3문장으로 해주세요.
- 부족한 부분을 지적하고 추천 운동 제시
- 너무 엄격하지 않고 긍정적인 톤
- 구체적인 운동 이름 포함`;

  try {
    const messages = [
      createSystemPrompt('헬스 코치', '사용자의 운동 기록을 분석하고 맞춤형 조언을 제공하는 전문가입니다.'),
      createUserMessage(prompt),
    ];

    const content = await callGroqAI(apiKey, messages, 300);
    setCachedComment(content);
    return content;
  } catch (error) {
    console.error('Health recommendation error:', error);
    const fallbackCached = getCachedComment();
    if (fallbackCached) {
      return fallbackCached.content;
    }
    
    if (analysis.missingParts.length > 0) {
      return `${analysis.missingParts[0] === 'chest' ? '가슴' : 
              analysis.missingParts[0] === 'back' ? '등' : 
              analysis.missingParts[0] === 'legs' ? '하체' : 
              analysis.missingParts[0] === 'shoulders' ? '어깨' : '팔'} 운동을 추천드립니다!`;
    }
    return '꾸준한 운동에 힘내고 계시네요!';
  }
}

export function clearHealthCommentCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
