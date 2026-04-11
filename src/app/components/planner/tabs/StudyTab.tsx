import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  History,
  MessageSquare,
  PenSquare,
  RefreshCw,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { StudyHistoryEntry } from '../../../types/planner';
import { callGeminiAI, createGeminiMessage } from '../../../lib/ai/gemini';
import { fetchNewOPICWords, getDailyWords, getOPICStats, markWordAsLearned, OPICWord, saveDailyWords } from '../../../lib/ai/opic';
import idiomRaw from '../../../../../idioms.json';

interface IdiomEntry {
  expression: string;
  meaning_en: string;
  meaning_ko: string;
}

const ALL_IDIOMS: IdiomEntry[] = idiomRaw as IdiomEntry[];

function getDailyIdiomSet(count = 20): IdiomEntry[] {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  // Seed shuffle using date parts for daily rotation
  const seed = dateStr.split('-').reduce((a, b) => a * 31 + parseInt(b), 1);
  const shuffled = [...ALL_IDIOMS].sort((a, b) => {
    const ha = (a.expression.charCodeAt(0) * 7 + seed) % 997;
    const hb = (b.expression.charCodeAt(0) * 7 + seed) % 997;
    return ha - hb;
  });
  return shuffled.slice(0, count);
}

function parseMeanings(raw: string): string[] {
  return raw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
}

type StudyMode = 'idiom' | 'opic' | 'writing' | 'history';
type HistoryFilter = 'all' | 'idiom' | 'writing';

const HISTORY_STORAGE_KEY = 'planner_study_history';

function parseStoredObject<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function StudyTab() {
  const { studySessions, settings, events, studyMode, setStudyMode } = usePlanner();
  const theme = getPlannerTheme(settings);

  const mode = studyMode as StudyMode;
  const setMode = (m: StudyMode) => setStudyMode(m as Parameters<typeof setStudyMode>[0]);
  const [writingInput, setWritingInput] = useState('');
  const [writingFeedback, setWritingFeedback] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryEntry[]>([]);
  const [expandedHistoryDay, setExpandedHistoryDay] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  
  const [opicWords, setOpicWords] = useState<OPICWord[]>([]);
  const [opicIndex, setOpicIndex] = useState(0);
  const [isLoadingOpic, setIsLoadingOpic] = useState(false);
  const [opicFlipped, setOpicFlipped] = useState(false);
  const [opicCorrect, setOpicCorrect] = useState(0);
  const [opicTotal, setOpicTotal] = useState(0);

  // Idiom mode state
  const [idiomDeck] = useState<IdiomEntry[]>(() => getDailyIdiomSet(20));
  const [idiomIndex, setIdiomIndex] = useState(0);
  const [idiomFlipped, setIdiomFlipped] = useState(false);
  const [idiomCorrect, setIdiomCorrect] = useState(0);
  const [idiomTotal, setIdiomTotal] = useState(0);
  const [idiomDirection, setIdiomDirection] = useState<'left' | 'right'>('right');
  const prevIdiomIndexRef = useRef(0);
  
  const [writingPrompts, setWritingPrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [writingCount, setWritingCount] = useState(0);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;
  
  const opicStats = getOPICStats();
  const currentOpicWord = opicWords[opicIndex];
  const isLastOpicWord = opicIndex >= opicWords.length - 1;
  
  const todayWritingKey = `writing_today_${todayStr}`;
  const getTodayWritingCount = () => {
    try {
      const stored = localStorage.getItem(todayWritingKey);
      return stored ? JSON.parse(stored) : 0;
    } catch {
      return 0;
    }
  };
  
  const setTodayWritingCount = (count: number) => {
    localStorage.setItem(todayWritingKey, JSON.stringify(count));
  };
  
  useEffect(() => {
    setWritingCount(getTodayWritingCount());
    const prompts = getDailyWritingPrompts();
    setWritingPrompts(prompts);
  }, []);
  
  const getDailyWritingPrompts = (): string[] => {
    const savedPrompts = localStorage.getItem(`writing_prompts_${todayStr}`);
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }

    // 30개 프롬프트 풀 — 날짜로 5개 선택 (매일 다른 세트)
    const PROMPT_POOL = [
      '오늘 하루 일과를 영어로 설명해주세요.',
      '좋아하는 음식이나 레스토랑에 대해 영어로 소개해주세요.',
      '최근 본 영화나 드라마에 대해 영어로 리뷰해주세요.',
      '좋아하는 여행지나 가보고 싶은 곳을 영어로 설명해주세요.',
      '주말에 주로 무엇을 하는지 영어로 말해주세요.',
      '가장 기억에 남는 경험을 영어로 이야기해주세요.',
      '현재 배우고 있는 것이나 관심 있는 분야를 영어로 소개해주세요.',
      '좋아하는 운동이나 취미에 대해 영어로 말해주세요.',
      '최근에 읽은 책이나 관심 있는 책을 영어로 소개해주세요.',
      '자신의 하루 루틴(아침, 점심, 저녁)을 영어로 설명해주세요.',
      '가장 존경하는 사람에 대해 영어로 말해주세요.',
      '미래의 꿈이나 목표에 대해 영어로 이야기해주세요.',
      '현재 살고 있는 동네나 도시를 영어로 소개해주세요.',
      '가장 좋아하는 계절과 그 이유를 영어로 말해주세요.',
      '최근에 구매한 물건이나 사고 싶은 것을 영어로 소개해주세요.',
      '가족이나 친구에 대해 영어로 소개해주세요.',
      '학교나 직장에서 있었던 인상적인 일을 영어로 말해주세요.',
      '건강을 위해 어떤 노력을 하는지 영어로 이야기해주세요.',
      '좋아하는 음악이나 아티스트를 영어로 소개해주세요.',
      '가장 인상 깊었던 여행 경험을 영어로 말해주세요.',
      '요리를 해본 경험이나 좋아하는 음식을 영어로 설명해주세요.',
      '스트레스를 해소하는 방법에 대해 영어로 이야기해주세요.',
      '처음으로 도전해 보고 싶은 것을 영어로 말해주세요.',
      '환경 문제에 대한 자신의 생각을 영어로 이야기해주세요.',
      '최근 뉴스나 관심 있는 사회 이슈에 대해 영어로 말해주세요.',
      '자신의 강점과 약점에 대해 영어로 이야기해주세요.',
      '기술이 일상생활에 미치는 영향을 영어로 설명해주세요.',
      '어릴 때와 지금을 비교해서 바뀐 점을 영어로 말해주세요.',
      '팀워크가 중요했던 경험을 영어로 이야기해주세요.',
      '앞으로 5년 안에 이루고 싶은 것을 영어로 말해주세요.',
    ];

    // 날짜를 시드로 사용하여 매일 다른 5개 선택
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const selected: string[] = [];
    for (let i = 0; i < 5; i++) {
      selected.push(PROMPT_POOL[(dayOfYear * 7 + i * 6) % PROMPT_POOL.length]);
    }

    localStorage.setItem(`writing_prompts_${todayStr}`, JSON.stringify(selected));
    return selected;
  };
  
  const loadOpicWords = () => {
    setIsLoadingOpic(true);
    try {
      const cached = getDailyWords();
      const words = (cached && cached.length > 0) ? cached : fetchNewOPICWords('', 20);
      if (words.length > 0) {
        saveDailyWords(words);
        setOpicWords(words);
        setOpicIndex(0);
        setOpicFlipped(false);
        setOpicCorrect(0);
        setOpicTotal(0);
      }
    } catch (error) {
      console.error('OPIC load error:', error);
    } finally {
      setIsLoadingOpic(false);
    }
  };
  
  const handleOpicCorrect = () => {
    if (currentOpicWord) {
      markWordAsLearned(currentOpicWord, true);
      setOpicCorrect(prev => prev + 1);
    }
    setOpicTotal(prev => prev + 1);
    if (isLastOpicWord) {
      setOpicIndex(opicWords.length);
    } else {
      setOpicIndex(prev => prev + 1);
      setOpicFlipped(false);
    }
  };
  
  const handleOpicIncorrect = () => {
    if (currentOpicWord) {
      markWordAsLearned(currentOpicWord, false);
    }
    setOpicTotal(prev => prev + 1);
    if (isLastOpicWord) {
      setOpicIndex(opicWords.length);
    } else {
      setOpicIndex(prev => prev + 1);
      setOpicFlipped(false);
    }
  };
  
  const generateWritingPrompts = async () => {
    if (!settings.geminiApiKey) return;

    setIsGeneratingFeedback(true);
    try {
      const messages = [
        createGeminiMessage('system', 'You are an OPIC exam writing prompt generator. Create natural, realistic English writing prompts for Korean learners.'),
        createGeminiMessage('user', `OPIC 시험 준비를 위한 영어 작문 프롬프트 5개를 생성해주세요.
현실적인 일상 상황을 포함하고, 각 프롬프트는 1-2문장으로 작성해주세요.

응답 형식 (JSON 배열):
["프롬프트1", "프롬프트2", ...]`),
      ];

      const response = await callGeminiAI(settings.geminiApiKey, messages, 500);
      
      try {
        const jsonMatch = response.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const prompts = JSON.parse(jsonMatch[0]);
          setWritingPrompts(prompts);
          localStorage.setItem(`writing_prompts_${todayStr}`, JSON.stringify(prompts));
        }
      } catch {
        console.error('Parse error');
      }
    } catch (error) {
      console.error('Prompt generation error:', error);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };
  
  const addIdiomHistory = (idiom: IdiomEntry, correct: boolean) => {
    const entry: StudyHistoryEntry = {
      id: `${Date.now()}-${Math.random()}`,
      date: todayStr,
      reviewedAt: new Date().toISOString(),
      type: 'idiom',
      cardId: idiom.expression,
      front: idiom.expression,
      back: `${parseMeanings(idiom.meaning_en).slice(0, 2).join(' / ')} · ${parseMeanings(idiom.meaning_ko).slice(0, 2).join(' / ')}`,
      result: correct ? 'correct' : 'incorrect',
    };
    setStudyHistory(prev => [entry, ...prev]);
  };

  const requestWritingFeedback = async () => {
    if (!settings.geminiApiKey) {
      setWritingFeedback('피드백을 생성하려면 설정에서 Gemini API 키를 입력해주세요.');
      return;
    }

    if (!writingInput.trim()) {
      setWritingFeedback('먼저 영작 문장을 입력해주세요.');
      return;
    }

    const capturedPrompt = writingPrompts[currentPromptIndex] || '';
    const capturedAnswer = writingInput;

    setIsGeneratingFeedback(true);
    let feedbackResult = '';
    try {
      const messages = [
        createGeminiMessage('system', 'You are an expert English writing coach for OPIC exam preparation. Provide detailed, accurate feedback in Korean. Never mix Chinese characters into Korean output.'),
        createGeminiMessage('user', `다음 영어 문장에 대해 OPIC 준비용 피드백을 한국어로 제공해주세요.

사용자 문장: ${capturedAnswer}

피드백 형식:
1. 문법 교정 (있을 경우)
2. 더 자연스러운 표현 제안
3. 개선된 예문
4. 전체 평가`),
      ];

      const response = await callGeminiAI(settings.geminiApiKey, messages, 600);
      feedbackResult = response;
      setWritingFeedback(response);

      // Save to history
      const entry: StudyHistoryEntry = {
        id: `${Date.now()}-${Math.random()}`,
        date: todayStr,
        reviewedAt: new Date().toISOString(),
        type: 'writing',
        prompt: capturedPrompt,
        answer: capturedAnswer,
        feedback: response,
      };
      setStudyHistory(prev => [entry, ...prev]);
    } catch (error) {
      console.error('Writing feedback error:', error);
      setWritingFeedback('피드백을 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingFeedback(false);
      setWritingCount(prev => {
        const newCount = prev + 1;
        setTodayWritingCount(newCount);
        return newCount;
      });
      setWritingInput('');
      setCurrentPromptIndex(prev => (prev + 1) % writingPrompts.length);
    }
  };

  useEffect(() => {
    setStudyHistory(parseStoredObject(HISTORY_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(studyHistory));
  }, [studyHistory]);

  const groupedHistory = useMemo(() => {
    return [...studyHistory]
      .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
      .reduce<Record<string, StudyHistoryEntry[]>>((acc, entry) => {
        acc[entry.date] = acc[entry.date] || [];
        acc[entry.date].push(entry);
        return acc;
      }, {});
  }, [studyHistory]);

  const historyDays = useMemo(() => Object.keys(groupedHistory), [groupedHistory]);

  const activeHistoryEntries = useMemo(() => {
    if (!expandedHistoryDay) return [];
    const entries = groupedHistory[expandedHistoryDay] || [];
    if (historyFilter === 'all') return entries;
    return entries.filter(entry => entry.type === historyFilter);
  }, [expandedHistoryDay, groupedHistory, historyFilter]);

  useEffect(() => {
    setWritingFeedback('');
    setWritingInput('');
  }, [mode]);

  useEffect(() => {
    if (!expandedHistoryDay && historyDays.length > 0) {
      setExpandedHistoryDay(historyDays[0]);
    }
  }, [expandedHistoryDay, historyDays]);

  const modeTabs = [
    { id: 'idiom' as const, label: '영어 표현', icon: MessageSquare },
    { id: 'opic' as const, label: 'OPIC 표현', icon: Sparkles },
    { id: 'writing' as const, label: '쓰기 연습', icon: PenSquare },
    { id: 'history' as const, label: 'DAY 기록', icon: History },
  ];

  const goIdiomNext = (correct: boolean | null) => {
    const currentIdiom = idiomDeck[idiomIndex];
    if (currentIdiom && correct !== null) {
      addIdiomHistory(currentIdiom, correct);
      if (correct) setIdiomCorrect(c => c + 1);
      setIdiomTotal(t => t + 1);
    }
    prevIdiomIndexRef.current = idiomIndex;
    setIdiomDirection('right');
    setIdiomIndex(i => i + 1);
    setIdiomFlipped(false);
  };

  const goIdiomPrev = () => {
    if (idiomIndex === 0) return;
    prevIdiomIndexRef.current = idiomIndex;
    setIdiomDirection('left');
    setIdiomIndex(i => i - 1);
    setIdiomFlipped(false);
  };

  const renderIdiomMode = () => {
    const currentIdiom = idiomDeck[idiomIndex];

    if (idiomIndex >= idiomDeck.length) {
      return (
        <div className="rounded-[22px] border p-6 text-center"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <h3 className="mb-4 text-xl font-semibold" style={{ color: theme.text }}>오늘의 표현 학습 완료!</h3>
          <div className="mb-6 rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
            <div className="text-4xl font-bold" style={{ color: theme.primary }}>{idiomCorrect}/{idiomTotal}</div>
            <div className="mt-1 text-sm" style={{ color: theme.textMuted }}>정답률 {idiomTotal > 0 ? Math.round((idiomCorrect / idiomTotal) * 100) : 0}%</div>
          </div>
          <button onClick={() => { setIdiomIndex(0); setIdiomFlipped(false); setIdiomCorrect(0); setIdiomTotal(0); }}
            className="rounded-2xl px-6 py-3 font-semibold" style={{ background: theme.navActiveBackground, color: theme.navActiveText }}>
            다시 시작
          </button>
        </div>
      );
    }

    if (!currentIdiom) return null;

    const enMeanings = parseMeanings(currentIdiom.meaning_en);
    const koMeanings = parseMeanings(currentIdiom.meaning_ko);
    const showEn = enMeanings.slice(0, 2);
    const showKo = koMeanings.slice(0, 2);
    const extraEn = enMeanings.length > 2 ? enMeanings.length - 2 : 0;
    const extraKo = koMeanings.length > 2 ? koMeanings.length - 2 : 0;

    const slideVariants = {
      enter: (dir: 'left' | 'right') => ({ x: dir === 'right' ? 60 : -60, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir: 'left' | 'right') => ({ x: dir === 'right' ? -60 : 60, opacity: 0 }),
    };

    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_196px]">
        <div className="rounded-[22px] border p-3.5"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <div className="mb-3 flex items-center justify-between text-sm" style={{ color: theme.textMuted }}>
            <span>표현 {idiomIndex + 1} / {idiomDeck.length}</span>
            <span>정답 {idiomCorrect} / {idiomTotal}</span>
          </div>

          {/* Card with slide on index change + flip on tap */}
          <div className="overflow-hidden rounded-[24px]">
            <AnimatePresence mode="popLayout" custom={idiomDirection}>
              <motion.div
                key={idiomIndex}
                custom={idiomDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setIdiomFlipped(f => !f)}
                className="relative h-[220px] cursor-pointer md:h-[300px]"
                style={{ perspective: '1000px' }}
              >
                <div
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    transformStyle: 'preserve-3d',
                    transform: idiomFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {/* Front */}
                  <div
                    style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                      boxShadow: `0 20px 50px ${theme.primary}30`,
                      borderRadius: 24, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 20px', color: '#fff',
                    }}
                  >
                    <RotateCcw className="mb-3 h-5 w-5 opacity-60" />
                    <h2 className="mb-2 text-center text-xl font-bold leading-snug md:text-2xl">{currentIdiom.expression}</h2>
                    <p className="text-xs opacity-70">탭하여 뜻 보기</p>
                  </div>
                  {/* Back */}
                  <div
                    style={{
                      position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: `linear-gradient(135deg, ${theme.accent1 ?? '#7c3aed'}, ${theme.secondary})`,
                      boxShadow: `0 20px 50px ${(theme.accent1 ?? '#7c3aed')}30`,
                      borderRadius: 24, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '0 20px', color: '#fff', overflow: 'hidden',
                    }}
                  >
                    <div className="w-full space-y-3 text-center">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-60">English</p>
                        {showEn.map((m, i) => <p key={i} className="text-sm font-medium leading-5">{m}</p>)}
                        {extraEn > 0 && <p className="text-xs opacity-60">외 {extraEn}개</p>}
                      </div>
                      <div className="border-t border-white/20 pt-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-60">Korean</p>
                        {showKo.map((m, i) => <p key={i} className="text-sm font-medium leading-5">{m}</p>)}
                        {extraKo > 0 && <p className="text-xs opacity-60">외 {extraKo}개</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button onClick={goIdiomPrev} disabled={idiomIndex === 0}
              className="rounded-full p-3 transition-colors disabled:opacity-30"
              style={{ background: theme.navBackground, color: theme.textSecondary }}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2.5">
              <button
                onClick={() => goIdiomNext(false)}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, #FF4D4D22, #FF4D4D14)`,
                  color: '#FF4040',
                  border: '1.5px solid #FF404055',
                }}>
                <XCircle className="h-5 w-5" />모름
              </button>
              <button
                onClick={() => goIdiomNext(true)}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, #10B98122, #10B98114)`,
                  color: '#059669',
                  border: '1.5px solid #05966955',
                }}>
                <CheckCircle2 className="h-5 w-5" />알아요
              </button>
            </div>
            <button onClick={() => goIdiomNext(null)}
              className="rounded-full p-3" style={{ background: theme.navBackground, color: theme.textSecondary }}>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border p-3.5"
          style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}>
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>오늘 표현</div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>오늘 세트</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>{idiomDeck.length}개</div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>진행률</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>{idiomIndex} / {idiomDeck.length}</div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>정답률</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.tertiary }}>
                {idiomTotal > 0 ? Math.round((idiomCorrect / idiomTotal) * 100) : 0}%
              </div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>전체 표현 수</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>{ALL_IDIOMS.length.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOpicMode = () => {
    if (opicWords.length === 0 && !isLoadingOpic) {
      return (
        <div
          className="rounded-[22px] border p-6 text-center"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <h3 className="mb-4 text-xl font-semibold" style={{ color: theme.text }}>
            OPIC 표현 학습
          </h3>
          <p className="mb-4 text-sm" style={{ color: theme.textSecondary }}>
            매일 IH 이상 수준의 새로운 영어 표현 20개를 학습합니다. 카드를 탭해 뜻을 확인하세요.
          </p>
          <div className="mb-6 rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: theme.text }}>{opicStats.totalWords}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>총 표현</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: theme.text }}>{opicStats.learnedToday}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>오늘 학습</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: theme.accent1 }}>{opicStats.reviewCount}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>복습 필요</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMode('idiom')}
            className="w-full rounded-2xl px-6 py-3.5 font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
          >
            표현 학습 시작 →
          </button>
        </div>
      );
    }

    if (isLoadingOpic) {
      return (
        <div
          className="rounded-[22px] border p-12 text-center"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
          }}
        >
          <div className="animate-pulse text-lg" style={{ color: theme.text }}>
            단어를 불러오는 중...
          </div>
        </div>
      );
    }

    if (opicIndex >= opicWords.length) {
      return (
        <div
          className="rounded-[22px] border p-6 text-center"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <h3 className="mb-4 text-xl font-semibold" style={{ color: theme.text }}>
            오늘의 학습 완료!
          </h3>
          <div className="mb-6 rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
            <div className="text-4xl font-bold" style={{ color: theme.primary }}>{opicCorrect}/{opicTotal}</div>
            <div className="text-sm" style={{ color: theme.textMuted }}>정답률 {opicTotal > 0 ? Math.round((opicCorrect/opicTotal)*100) : 0}%</div>
          </div>
          <button
            onClick={() => {
              setOpicIndex(0);
              setOpicFlipped(false);
              setOpicCorrect(0);
              setOpicTotal(0);
            }}
            className="rounded-2xl px-6 py-3 font-semibold"
            style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
          >
            다시 학습하기
          </button>
        </div>
      );
    }

    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_196px]">
        <div
          className="rounded-[22px] border p-3.5"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between text-sm" style={{ color: theme.textMuted }}>
            <span>OPIC 단어 {opicIndex + 1} / {opicWords.length}</span>
            <span>정답 {opicCorrect} / {opicTotal}</span>
          </div>

          <div onClick={() => setOpicFlipped(prev => !prev)} className="relative h-[300px] cursor-pointer perspective-1000 md:h-[360px]">
            <div className="absolute inset-0 h-full w-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: opicFlipped ? 'rotateY(180deg)' : '' }}>
              <div
                className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[24px] px-5"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  boxShadow: `0 24px 60px ${theme.primary}30`,
                  backfaceVisibility: 'hidden',
                  color: '#fff',
                }}
              >
                <RotateCcw className="mb-2 h-6 w-6 opacity-70" />
                <h2 className="mb-2 text-2xl font-bold md:text-[2rem]">{currentOpicWord.word}</h2>
                <p className="text-xs opacity-85">카드를 탭하여 뜻 확인</p>
              </div>

              <div
                className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[24px] px-5"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent1}, ${theme.secondary})`,
                  boxShadow: `0 24px 60px ${theme.accent1}30`,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  color: '#fff',
                }}
              >
                <h3 className="mb-3 text-lg font-bold md:text-xl">{currentOpicWord.meaning}</h3>
                <p className="text-center text-xs italic leading-6 opacity-90 md:text-sm">{currentOpicWord.example}</p>
                <div className="mt-3 rounded-full bg-white/20 px-3 py-1 text-xs">{currentOpicWord.level}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setOpicIndex(prev => Math.max(0, prev - 1))}
              disabled={opicIndex === 0}
              className="rounded-full p-3 transition-colors disabled:opacity-30"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={handleOpicIncorrect}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#FF4D4D22,#FF4D4D14)', color: '#FF4040', border: '1.5px solid #FF404055' }}
              >
                <XCircle className="h-5 w-5" />모름
              </button>
              <button
                onClick={handleOpicCorrect}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#10B98122,#10B98114)', color: '#059669', border: '1.5px solid #05966955' }}
              >
                <CheckCircle2 className="h-5 w-5" />알겠음
              </button>
            </div>

            <button
              onClick={() => setOpicIndex(prev => Math.min(opicWords.length - 1, prev + 1))}
              disabled={opicIndex >= opicWords.length - 1}
              className="rounded-full p-3"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className="rounded-[22px] border p-3.5"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
            Study Status
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>오늘 단어</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {opicWords.length}개
              </div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>복습 필요</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {opicStats.reviewCount}개
              </div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>진행률</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {opicIndex} / {opicWords.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWritingMode = () => {
    const currentPrompt = writingPrompts[currentPromptIndex] || '오늘의 목표나 하고 싶은 말에 대해 영어로 작성해주세요.';
    
    return (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_196px]">
        <div
          className="rounded-[22px] border p-4"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              영작 연습
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: theme.textMuted }}>
                오늘 {writingCount}개 완료
              </span>
              <button
                onClick={generateWritingPrompts}
                disabled={!settings.groqApiKey}
                className="rounded-full p-2 disabled:opacity-50"
                style={{ background: theme.navBackground, color: theme.textMuted }}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="mb-4 rounded-2xl px-4 py-4" style={{ background: theme.navBackground, color: theme.text }}>
            {currentPrompt}
          </div>

          <textarea
            value={writingInput}
            onChange={event => setWritingInput(event.target.value)}
            className="w-full resize-none rounded-2xl border px-4 py-4 outline-none"
            style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}
            rows={6}
            placeholder="여기에 영어로 작성하세요..."
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setCurrentPromptIndex(prev => (prev + 1) % writingPrompts.length)}
              className="rounded-2xl px-4 py-2 text-sm font-medium"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              다른 문제
            </button>
            <button
              onClick={requestWritingFeedback}
              disabled={!writingInput.trim() || isGeneratingFeedback}
              className="flex-1 rounded-2xl px-5 py-2 font-semibold disabled:opacity-50"
              style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
            >
              {isGeneratingFeedback ? '피드백 생성 중...' : 'AI 피드백 받기'}
            </button>
          </div>

          {writingFeedback && (
            <div className="mt-5 rounded-2xl border px-4 py-4" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
              <h4 className="mb-2 font-semibold" style={{ color: theme.text }}>
                AI 피드백
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: theme.textSecondary }}>
                {writingFeedback}
              </p>
              <button
                onClick={() => {
                  setWritingFeedback('');
                  setWritingInput('');
                  setCurrentPromptIndex(prev => (prev + 1) % writingPrompts.length);
                }}
                className="mt-3 rounded-xl px-3 py-1.5 text-xs font-medium"
                style={{ background: theme.navBackground, color: theme.textSecondary }}
              >
                다음 문제로
              </button>
            </div>
          )}
        </div>

        <div
          className="rounded-[22px] border p-4"
          style={{
            background: theme.panelBackground,
            borderColor: theme.panelBorder,
            boxShadow: theme.panelShadow,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
            오늘의 기록
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border px-3 py-2" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>완료한 작문</div>
              <div className="text-lg font-bold" style={{ color: theme.text }}>{writingCount}개</div>
            </div>
          </div>
          {!settings.groqApiKey && (
            <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
              설정에서 API 키를 입력하면 AI 피드백을 받을 수 있습니다.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderHistoryMode = () => {
    const [expandedWritingId, setExpandedWritingId] = useState<string | null>(null);
    return (
      <div
        className="rounded-[22px] border p-4"
        style={{ background: theme.panelBackground, borderColor: theme.panelBorder, boxShadow: theme.panelShadow }}
      >
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
            Study Log
          </div>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.text }}>날짜별 학습 기록</h3>
        </div>

        {historyDays.length === 0 ? (
          <div className="rounded-2xl border px-4 py-12 text-center text-sm" style={{ background: theme.navBackground, borderColor: theme.line, color: theme.textMuted }}>
            아직 학습 기록이 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
            {/* 날짜 목록 */}
            <div className="space-y-2">
              {historyDays.map((date, index) => {
                const active = expandedHistoryDay === date;
                const dayEntries = groupedHistory[date] || [];
                const idiomCount = dayEntries.filter(e => e.type === 'idiom').length;
                const writingCount = dayEntries.filter(e => e.type === 'writing').length;
                return (
                  <button
                    key={date}
                    onClick={() => setExpandedHistoryDay(date)}
                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
                    style={{ background: active ? theme.panelBackgroundStrong : theme.navBackground, borderColor: active ? theme.primary : theme.line }}
                  >
                    <div>
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>
                        {format(new Date(date), 'M/d (E)', { locale: ko })}
                      </div>
                      <div className="mt-0.5 flex gap-2 text-xs" style={{ color: theme.textMuted }}>
                        {idiomCount > 0 && <span>표현 {idiomCount}</span>}
                        {writingCount > 0 && <span>작문 {writingCount}</span>}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: theme.textMuted }}>{dayEntries.length}개</div>
                  </button>
                );
              })}
            </div>

            {/* 상세 보기 */}
            <div className="rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
              {expandedHistoryDay ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold" style={{ color: theme.text }}>
                      {format(new Date(expandedHistoryDay), 'M월 d일 (E)', { locale: ko })}
                    </div>
                    <div className="flex rounded-2xl border p-1" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
                      {[
                        { id: 'all' as const, label: '전체' },
                        { id: 'idiom' as const, label: '표현' },
                        { id: 'writing' as const, label: '작문' },
                      ].map(filter => {
                        const isActive = historyFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            onClick={() => setHistoryFilter(filter.id)}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                            style={{ background: isActive ? theme.navActiveBackground : 'transparent', color: isActive ? theme.navActiveText : theme.textMuted }}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {activeHistoryEntries.length === 0 ? (
                      <div className="rounded-2xl border px-4 py-10 text-center text-sm" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line, color: theme.textMuted }}>
                        선택한 조건의 기록이 없습니다.
                      </div>
                    ) : (
                      activeHistoryEntries.map(entry => {
                        if (entry.type === 'writing') {
                          const isExpanded = expandedWritingId === entry.id;
                          return (
                            <div key={entry.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: `${theme.primary}30` }}>
                              {/* 작문 헤더 */}
                              <div
                                className="flex items-start justify-between px-3 py-2.5 cursor-pointer"
                                style={{ background: `${theme.primary}10` }}
                                onClick={() => setExpandedWritingId(isExpanded ? null : entry.id)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${theme.primary}25`, color: theme.primary }}>작문</span>
                                  </div>
                                  <p className="text-xs font-medium line-clamp-2" style={{ color: theme.text }}>{entry.prompt}</p>
                                </div>
                                <span className="ml-2 shrink-0 text-xs" style={{ color: theme.textMuted }}>{isExpanded ? '▲' : '▼'}</span>
                              </div>
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-2 space-y-2.5">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>내 답변</p>
                                    <p className="text-sm leading-6 rounded-xl px-3 py-2" style={{ background: theme.panelBackground, color: theme.text }}>{entry.answer}</p>
                                  </div>
                                  {entry.feedback && (
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>AI 피드백</p>
                                      <p className="whitespace-pre-wrap text-xs leading-6 rounded-xl px-3 py-2" style={{ background: theme.panelBackground, color: theme.textSecondary }}>{entry.feedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        // idiom entry
                        return (
                          <div
                            key={entry.id}
                            className="flex items-start justify-between rounded-2xl px-3 py-2.5"
                            style={{ background: entry.result === 'correct' ? '#10B98112' : '#FF404012' }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: entry.result === 'correct' ? '#10B98120' : '#FF404020', color: entry.result === 'correct' ? '#059669' : '#FF4040' }}>표현</span>
                              </div>
                              <div className="text-sm font-semibold" style={{ color: theme.text }}>{entry.front}</div>
                              <div className="mt-0.5 text-xs" style={{ color: theme.textSecondary }}>{entry.back}</div>
                            </div>
                            <div className="ml-2 shrink-0 text-xs font-bold" style={{ color: entry.result === 'correct' ? '#059669' : '#FF4040' }}>
                              {entry.result === 'correct' ? '알아요' : '모름'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-sm" style={{ color: theme.textMuted }}>기록을 선택해주세요.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full p-3 md:p-5">
      {/* 모바일 모드 탭 (상단 스크롤 가능) */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden">
        {modeTabs.map(tab => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: active ? theme.navActiveBackground : theme.panelBackground,
                color: active ? theme.navActiveText : theme.textMuted,
                border: `1px solid ${active ? 'transparent' : theme.panelBorder}`,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-2 md:grid md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
        <div className="hidden md:flex md:flex-col">
          <aside
            className="flex flex-1 flex-col rounded-xl md:rounded-[22px] border p-2.5 md:p-3"
            style={{
              background: theme.panelBackground,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
              Study Mode
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {modeTabs.map(tab => {
                const Icon = tab.icon;
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    className="flex flex-1 items-center gap-2.5 rounded-2xl px-3.5 py-3.5 text-sm font-medium whitespace-nowrap transition-all"
                    style={{
                      background: active ? theme.panelBackgroundStrong : 'transparent',
                      color: active ? theme.text : theme.textMuted,
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border p-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>오늘 표현</div>
              <div className="text-sm font-semibold" style={{ color: theme.text }}>
                {idiomTotal > 0 ? `${idiomTotal}개 학습` : '미시작'}
              </div>
              <div className="flex items-center gap-1 text-sm" style={{ color: theme.textSecondary }}>
                <Flame className="h-4 w-4" style={{ color: theme.accent1 }} />
                {currentStreak}일 연속
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-1 flex-col gap-3 pb-0">
          <div
            className="rounded-[22px] border px-4 py-3.5"
            style={{
              background: settings.isDarkMode
                ? `linear-gradient(135deg, ${theme.accent1}16, ${theme.primary}16)`
                : `linear-gradient(135deg, rgba(255,255,255,0.92), ${theme.accent1}14)`,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: theme.accent1 }} />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
                Study Note
              </span>
            </div>
            <p className="text-sm font-medium leading-6 md:text-[15px]" style={{ color: theme.text }}>
              {mode === 'idiom' && `오늘의 영어 표현 ${idiomDeck.length}개 — 카드를 탭하면 뜻이 나타납니다. 알면 ✓, 모르면 ✗로 표시하세요.`}
              {mode === 'opic' && 'OPIC IH 이상 수준의 단어를 매일 20개씩 학습합니다. 카드를 탭하여 뜻을 확인하세요.'}
              {mode === 'writing' && '프롬프트를 읽고 영어로 작성한 뒤 AI 피드백을 받아보세요. 매일 다른 주제가 제공됩니다.'}
              {mode === 'history' && '날짜별 학습 기록을 확인하세요. 정답과 오답을 필터링하여 볼 수 있습니다.'}
            </p>
          </div>

          <div className="min-h-[480px] flex-1 md:min-h-[560px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {mode === 'idiom' && renderIdiomMode()}
                {mode === 'opic' && renderOpicMode()}
                {mode === 'writing' && renderWritingMode()}
                {mode === 'history' && renderHistoryMode()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
