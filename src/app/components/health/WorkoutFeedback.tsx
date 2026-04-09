import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useHealth } from '../../context/HealthContext';
import { callGroqAI, createSystemPrompt, createUserMessage } from '../../lib/ai/groq';
import { format, subDays, eachDayOfInterval } from 'date-fns';

// 운동 이름 → 근육 부위 매핑
const MUSCLE_MAP: Record<string, string> = {
  // 가슴
  '벤치프레스': '가슴', '인클라인벤치': '가슴', '딥스': '가슴', '체스트플라이': '가슴', '푸시업': '가슴',
  '덤벨프레스': '가슴', '케이블플라이': '가슴', '인클라인덤벨': '가슴',
  // 등
  '데드리프트': '등', '풀업': '등', '친업': '등', '랫풀다운': '등', '시티드로우': '등',
  '바벨로우': '등', '원암덤벨로우': '등', '케이블로우': '등', 'TBar로우': '등',
  '랫풀': '등', '풀다운': '등', '로우': '등',
  // 어깨
  '오버헤드프레스': '어깨', '밀리터리프레스': '어깨', '사이드레터럴': '어깨', '프론트레이즈': '어깨',
  '페이스풀': '어깨', '업라이트로우': '어깨', '덤벨숄더프레스': '어깨', '리어델트': '어깨',
  // 팔
  '바이셉컬': '팔', '해머컬': '팔', '트라이셉스': '팔', '스컬크러셔': '팔',
  '케이블컬': '팔', '바벨컬': '팔', '딥스푸시': '팔', '오버헤드익스텐션': '팔',
  '컬': '팔', '익스텐션': '팔',
  // 하체
  '스쿼트': '하체', '레그프레스': '하체', '런지': '하체', '레그컬': '하체',
  '레그익스텐션': '하체', '힙쓰러스트': '하체', '루마니안데드': '하체', 'RDL': '하체',
  '카프레이즈': '하체', '핵스쿼트': '하체', '불가리안': '하체',
  // 코어
  '플랭크': '코어', '크런치': '코어', '레그레이즈': '코어', '러시안트위스트': '코어',
  '케이블크런치': '코어', '에비휠': '코어',
};

function classifyMuscle(exerciseName: string): string {
  const lower = exerciseName.toLowerCase().replace(/\s/g, '');
  for (const [keyword, muscle] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(keyword.toLowerCase().replace(/\s/g, ''))) return muscle;
  }
  return '기타';
}

const MUSCLE_GROUPS = ['가슴', '등', '어깨', '팔', '하체', '코어'];

interface MuscleBalance {
  group: string;
  volume: number;
  sessions: number;
  percentage: number;
}

interface WorkoutFeedbackProps {
  theme: any;
}

export function WorkoutFeedback({ theme }: WorkoutFeedbackProps) {
  const { workoutRecords, settings } = useHealth();
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 최근 30일 데이터 분석
  const muscleBalance = useMemo((): MuscleBalance[] => {
    const last30 = subDays(new Date(), 30);
    const recentRecords = workoutRecords.filter(r => new Date(r.date) >= last30);

    const volumeByMuscle: Record<string, number> = {};
    const sessionsByMuscle: Record<string, Set<string>> = {};

    for (const record of recentRecords) {
      for (const exercise of record.exercises) {
        const muscle = classifyMuscle(exercise.name);
        const vol = exercise.sets
          .filter(s => !s.isWarmup)
          .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
        volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + vol;
        if (!sessionsByMuscle[muscle]) sessionsByMuscle[muscle] = new Set();
        sessionsByMuscle[muscle].add(record.date);
      }
    }

    const totalVolume = Object.values(volumeByMuscle).reduce((a, b) => a + b, 0) || 1;

    return MUSCLE_GROUPS.map(group => ({
      group,
      volume: volumeByMuscle[group] || 0,
      sessions: sessionsByMuscle[group]?.size || 0,
      percentage: Math.round(((volumeByMuscle[group] || 0) / totalVolume) * 100),
    })).sort((a, b) => b.volume - a.volume);
  }, [workoutRecords]);

  const maxPercentage = Math.max(...muscleBalance.map(m => m.percentage), 1);

  const getAIFeedback = async () => {
    const plannerSettings = (() => {
      try { return JSON.parse(localStorage.getItem('planner_settings') || '{}'); } catch { return {}; }
    })();
    const apiKey = settings.groqApiKey || plannerSettings.groqApiKey;
    if (!apiKey) {
      setFeedback('캘린더 앱 설정에서 Groq API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setFeedback('');

    const last30 = subDays(new Date(), 30);
    const recentRecords = workoutRecords.filter(r => new Date(r.date) >= last30);

    const summary = muscleBalance.map(m =>
      `${m.group}: ${m.sessions}회 운동, 볼륨 ${m.volume.toLocaleString()}kg (${m.percentage}%)`
    ).join('\n');

    const exerciseList = Array.from(new Set(
      recentRecords.flatMap(r => r.exercises.map(e => e.name))
    )).join(', ');

    try {
      const sys = createSystemPrompt('운동 피드백 전문가', `
당신은 전문 퍼스널 트레이너입니다.
사용자의 최근 30일 운동 데이터를 분석하여 다음을 제공하세요:
1. 근육 불균형 분석 (어느 부위가 과하게/적게 훈련됐는지)
2. 부족한 근육 부위의 구체적인 운동 추천 (3가지, 세트/횟수 포함)
3. 이번 주 훈련 방향 조언

응답은 친근하고 구체적으로, 3~4문단으로 작성하세요.
절대 한자나 외국어 섞지 말고 순수 한국어로만 작성하세요.
      `);
      const userMsg = createUserMessage(`
최근 30일 근육별 운동량:
${summary}

수행한 운동 목록: ${exerciseList || '없음'}
총 운동 횟수: ${recentRecords.length}회
      `);

      const result = await callGroqAI(apiKey, [sys, userMsg], 800);
      setFeedback(result);
    } catch {
      setFeedback('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}>
      {/* 헤더 */}
      <button
        className="flex w-full items-center justify-between p-4"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${theme.primary}20` }}>
            <TrendingUp className="h-4 w-4" style={{ color: theme.primary }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: theme.text }}>운동 균형 분석</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>최근 30일</p>
          </div>
        </div>
        {isExpanded
          ? <ChevronUp className="h-4 w-4" style={{ color: theme.textMuted }} />
          : <ChevronDown className="h-4 w-4" style={{ color: theme.textMuted }} />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* 근육 부위별 바 */}
              <div className="space-y-2">
                {muscleBalance.map(m => {
                  const isEmpty = m.volume === 0;
                  const barWidth = isEmpty ? 2 : Math.max(4, (m.percentage / maxPercentage) * 100);
                  return (
                    <div key={m.group}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: isEmpty ? theme.textMuted : theme.text }}>
                            {m.group}
                          </span>
                          {isEmpty && (
                            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: theme.accent1 }}>
                              <AlertCircle className="h-3 w-3" />
                              미훈련
                            </span>
                          )}
                        </div>
                        <span className="text-[11px]" style={{ color: theme.textMuted }}>
                          {m.sessions}회 · {m.volume > 0 ? `${m.volume.toLocaleString()}kg` : '0'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.line }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          style={{
                            background: isEmpty
                              ? `${theme.accent1}60`
                              : `linear-gradient(90deg, ${theme.primary}, ${theme.accent1 || theme.primary})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI 피드백 영역 */}
              {feedback && (
                <div className="rounded-2xl border p-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: theme.primary }} />
                    <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>AI 분석</span>
                  </div>
                  <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: theme.text }}>{feedback}</p>
                </div>
              )}

              <button
                onClick={getAIFeedback}
                disabled={isLoading || workoutRecords.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1 || theme.primary})` }}
              >
                {isLoading
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> 분석 중...</>
                  : <><Sparkles className="h-4 w-4" /> AI 피드백 받기</>}
              </button>
              {workoutRecords.length === 0 && (
                <p className="text-center text-xs" style={{ color: theme.textMuted }}>운동 기록이 없습니다</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
