import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  History,
  PenSquare,
  RefreshCw,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { usePlanner } from '../../../context/PlannerContext';
import { getPlannerTheme } from '../../../lib/plannerTheme';
import { DailyStudySet, StudyCardProgress, StudyHistoryEntry } from '../../../types/planner';
import { callGroqAI, createSystemPrompt, createUserMessage } from '../../../lib/ai/groq';
import { fetchNewOPICWords, getDailyWords, getOPICStats, markWordAsLearned, OPICWord } from '../../../lib/ai/opic';

type StudyMode = 'flashcard' | 'opic' | 'review' | 'writing' | 'history';
type HistoryFilter = 'all' | 'correct' | 'incorrect';

const HISTORY_STORAGE_KEY = 'planner_study_history';
const PROGRESS_STORAGE_KEY = 'planner_study_card_progress';
const DAILY_SET_STORAGE_KEY = 'planner_daily_study_sets';
const DAILY_TARGET_COUNT = 20;
const REVIEW_INTERVALS = [1, 3, 7, 14];

function parseStoredObject<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function uniqueIds(ids: string[]) {
  return ids.filter((cardId, index) => ids.indexOf(cardId) === index);
}

export function StudyTab() {
  const { flashCards, studySessions, recordStudySession, settings, events, studyMode, setStudyMode } = usePlanner();
  const theme = getPlannerTheme(settings);

  const mode = studyMode;
  const setMode = setStudyMode;
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [writingInput, setWritingInput] = useState('');
  const [writingFeedback, setWritingFeedback] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryEntry[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, StudyCardProgress>>({});
  const [dailySets, setDailySets] = useState<DailyStudySet[]>([]);
  const [todayDeckIds, setTodayDeckIds] = useState<string[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [expandedHistoryDay, setExpandedHistoryDay] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  
  const [opicWords, setOpicWords] = useState<OPICWord[]>([]);
  const [opicIndex, setOpicIndex] = useState(0);
  const [isLoadingOpic, setIsLoadingOpic] = useState(false);
  const [opicFlipped, setOpicFlipped] = useState(false);
  const [opicCorrect, setOpicCorrect] = useState(0);
  const [opicTotal, setOpicTotal] = useState(0);
  
  const [writingPrompts, setWritingPrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [writingCount, setWritingCount] = useState(0);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todaySession = studySessions.find(session => session.date === todayStr);
  const currentStreak = studySessions[studySessions.length - 1]?.streak || 0;
  const aiStudyNote =
    '오늘 덱은 복습 대상과 분리해서 20문제 기준으로 고정하고, 틀린 카드만 망각곡선에 따라 복습 큐로 넘깁니다.';
  
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
        return JSON.parse(savedPrompts);
      } catch {
        return [];
      }
    }
    
    const upcomingEvents = events
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
    
    const prompts = [
      upcomingEvents.length > 0
        ? `당신의 예정된 일정: ${upcomingEvents.map(e => `${e.title}(${e.date})`).join(', ')} 중 하나에 대해 영어로 설명해주세요.`
        : '오늘의 목표에 대해 영어로 작성해주세요.',
      '최근에 경험한难忘한 일을 영어로 설명해주세요.',
      '좋아하는 음식이나 레스토랑에 대해 영어로 소개해주세요.',
      '최근 본 영화나 드라마에 대해 영어로 리뷰해주세요.',
      '좋아하는 여행지에 대해 영어로 설명해주세요.',
    ];
    
    localStorage.setItem(`writing_prompts_${todayStr}`, JSON.stringify(prompts));
    return prompts;
  };
  
  const loadOpicWords = async () => {
    if (!settings.groqApiKey) return;
    
    setIsLoadingOpic(true);
    try {
      const cached = getDailyWords();
      if (cached && cached.length > 0) {
        setOpicWords(cached);
        setOpicIndex(0);
        setOpicFlipped(false);
        setOpicCorrect(0);
        setOpicTotal(0);
      } else {
        const words = await fetchNewOPICWords(settings.groqApiKey, 20);
        if (words.length > 0) {
          setOpicWords(words);
          setOpicIndex(0);
          setOpicFlipped(false);
          setOpicCorrect(0);
          setOpicTotal(0);
        }
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
    if (!settings.groqApiKey) return;
    
    setIsGeneratingFeedback(true);
    try {
      const systemPrompt = createSystemPrompt('영어 작문 프롬프트 생성기', `
        OPIC 시험 준비를 위한 영어 작문 프롬프트를 ${5}개 생성해주세요.
        사용자 일정과 관련된 현실적인 상황을 포함해야 합니다.
        각 프롬프트는 1-2문장으로 작성해주세요.
        
        응답 형식 (JSON 배열):
        ["프롬프트1", "프롬프트2", ...]
      `);
      
      const userMessage = createUserMessage('오늘의 작문 프롬프트를 생성해주세요.');
      
      const response = await callGroqAI(settings.groqApiKey, [systemPrompt, userMessage], 500);
      
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
  
  const requestWritingFeedback = async () => {
    if (!settings.groqApiKey) {
      setWritingFeedback('피드백을 생성하려면 설정에서 Groq API 키를 입력해주세요.');
      return;
    }

    if (!writingInput.trim()) {
      setWritingFeedback('먼저 영작 문장을 입력해주세요.');
      return;
    }

    setIsGeneratingFeedback(true);
    try {
      const systemPrompt = createSystemPrompt('영어 피드백 전문가', `
        사용자의 영어 문장에 대해 OPIC 준비용 피드백을 제공해주세요.
        
        피드백 형식:
        1. 문법 교정 (있을 경우)
        2. 더 자연스러운 표현 제안
        3. 개선된 예문
        4. 전체 평가
        
        한국어로 작성해주세요.
      `);
      
      const userMessage = createUserMessage(`사용자 문장: ${writingInput}\n\n이 문장에 대한 피드백을 제공해주세요.`);

      const response = await callGroqAI(settings.groqApiKey, [systemPrompt, userMessage], 600);
      setWritingFeedback(response);
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
    setProgressMap(parseStoredObject(PROGRESS_STORAGE_KEY, {}));
    setDailySets(parseStoredObject(DAILY_SET_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(studyHistory));
  }, [studyHistory]);

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
  }, [progressMap]);

  useEffect(() => {
    localStorage.setItem(DAILY_SET_STORAGE_KEY, JSON.stringify(dailySets));
  }, [dailySets]);

  useEffect(() => {
    if (flashCards.length === 0) return;

    const existingSet = dailySets.find(set => set.date === todayStr);
    if (existingSet) {
      setTodayDeckIds(existingSet.cardIds.filter(cardId => flashCards.some(card => card.id === cardId)));
      return;
    }

    const dueReviewIds = flashCards
      .filter(card => {
        const progress = progressMap[card.id];
        return progress?.status === 'review' && progress.nextReviewAt && progress.nextReviewAt <= new Date().toISOString();
      })
      .map(card => card.id);

    const newCardIds = flashCards
      .filter(card => !progressMap[card.id] || progressMap[card.id].status === 'new')
      .map(card => card.id);

    const learningCardIds = flashCards
      .filter(card => {
        const progress = progressMap[card.id];
        return progress && progress.status !== 'mastered' && progress.status !== 'review';
      })
      .map(card => card.id);

    const untouchedIds = flashCards
      .map(card => card.id)
      .filter(cardId => !newCardIds.includes(cardId) && !learningCardIds.includes(cardId) && !dueReviewIds.includes(cardId));

    const masteredIds = flashCards
      .filter(card => progressMap[card.id]?.status === 'mastered')
      .map(card => card.id);

    const orderedIds = uniqueIds([
      ...newCardIds,
      ...learningCardIds,
      ...untouchedIds.filter(cardId => !masteredIds.includes(cardId)),
      ...masteredIds,
    ]);

    const nextSet: DailyStudySet = {
      date: todayStr,
      cardIds: orderedIds.slice(0, Math.min(DAILY_TARGET_COUNT, flashCards.length)),
      generatedAt: new Date().toISOString(),
    };

    setDailySets(current => [nextSet, ...current.filter(set => set.date !== todayStr)].slice(0, 30));
    setTodayDeckIds(nextSet.cardIds);
  }, [dailySets, flashCards, progressMap, todayStr]);

  const todayDeck = useMemo(() => {
    return todayDeckIds
      .map(cardId => flashCards.find(card => card.id === cardId))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));
  }, [flashCards, todayDeckIds]);

  const reviewDeck = useMemo(() => {
    return flashCards.filter(card => {
      const progress = progressMap[card.id];
      return progress?.status === 'review' && progress.nextReviewAt && progress.nextReviewAt <= new Date().toISOString();
    });
  }, [flashCards, progressMap]);

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

  const activeDeck = mode === 'review' ? reviewDeck : todayDeck;
  const currentCard = activeDeck[currentCardIndex];
  const isLastCard = currentCardIndex >= activeDeck.length - 1;
  const reviewQueueCount = reviewDeck.length;
  const activeHistoryEntries = useMemo(() => {
    if (!expandedHistoryDay) return [];
    const entries = groupedHistory[expandedHistoryDay] || [];
    if (historyFilter === 'all') return entries;
    return entries.filter(entry => entry.result === historyFilter);
  }, [expandedHistoryDay, groupedHistory, historyFilter]);

  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setWritingFeedback('');
    setWritingInput('');
  }, [mode]);

  useEffect(() => {
    if (!expandedHistoryDay && historyDays.length > 0) {
      setExpandedHistoryDay(historyDays[0]);
    }
  }, [expandedHistoryDay, historyDays]);

  const recordAnswer = (result: 'correct' | 'incorrect') => {
    if (!currentCard) return;

    const now = new Date();
    const existingProgress = progressMap[currentCard.id] || {
      cardId: currentCard.id,
      status: 'new' as const,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      reviewStep: 0,
      lastSeenAt: null,
      nextReviewAt: null,
      masteredAt: null,
    };

    let nextProgress: StudyCardProgress;

    if (result === 'correct') {
      if (existingProgress.status === 'review') {
        const nextStep = existingProgress.reviewStep + 1;
        const completedReview = nextStep >= REVIEW_INTERVALS.length;
        nextProgress = {
          ...existingProgress,
          status: completedReview ? 'mastered' : 'review',
          timesSeen: existingProgress.timesSeen + 1,
          correctCount: existingProgress.correctCount + 1,
          reviewStep: nextStep,
          lastSeenAt: now.toISOString(),
          nextReviewAt: completedReview ? null : addDays(now, REVIEW_INTERVALS[nextStep]).toISOString(),
          masteredAt: completedReview ? now.toISOString() : existingProgress.masteredAt,
        };
      } else {
        nextProgress = {
          ...existingProgress,
          status: 'mastered',
          timesSeen: existingProgress.timesSeen + 1,
          correctCount: existingProgress.correctCount + 1,
          reviewStep: REVIEW_INTERVALS.length,
          lastSeenAt: now.toISOString(),
          nextReviewAt: null,
          masteredAt: now.toISOString(),
        };
      }
    } else {
      nextProgress = {
        ...existingProgress,
        status: 'review',
        timesSeen: existingProgress.timesSeen + 1,
        incorrectCount: existingProgress.incorrectCount + 1,
        reviewStep: 0,
        lastSeenAt: now.toISOString(),
        nextReviewAt: addDays(now, REVIEW_INTERVALS[0]).toISOString(),
        masteredAt: null,
      };
    }

    setProgressMap(current => ({ ...current, [currentCard.id]: nextProgress }));

    const historyEntry: StudyHistoryEntry = {
      id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: todayStr,
      reviewedAt: now.toISOString(),
      cardId: currentCard.id,
      front: currentCard.front,
      back: currentCard.back,
      example: currentCard.example,
      result,
      mode: mode === 'review' || existingProgress.status === 'review' ? 'review' : 'daily',
    };

    setStudyHistory(current => [historyEntry, ...current]);
  };

  const advanceDeck = () => {
    setIsFlipped(false);
    if (isLastCard) {
      recordStudySession(sessionTotal + 1, sessionCorrect);
      setCurrentCardIndex(activeDeck.length);
    } else {
      setCurrentCardIndex(current => current + 1);
    }
  };

  const handleCorrect = () => {
    recordAnswer('correct');
    setSessionCorrect(current => current + 1);
    setSessionTotal(current => current + 1);
    advanceDeck();
  };

  const handleIncorrect = () => {
    recordAnswer('incorrect');
    setSessionTotal(current => current + 1);
    advanceDeck();
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setIsFlipped(false);
      setCurrentCardIndex(current => current - 1);
    }
  };

  const restartTodayDeck = () => {
    setCurrentCardIndex(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setIsFlipped(false);
  };

  const modeTabs = [
    { id: 'flashcard' as const, label: '플래시카드', icon: BookOpen },
    { id: 'opic' as const, label: 'OPIC 단어', icon: Sparkles },
    { id: 'review' as const, label: '복습 모드', icon: RotateCcw },
    { id: 'writing' as const, label: '쓰기 연습', icon: PenSquare },
    { id: 'history' as const, label: 'DAY 기록', icon: History },
  ];

  const renderFlashcardMode = () => {
    if (!currentCard) {
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
            {mode === 'review' ? '오늘 복습 완료' : '오늘의 학습을 완료했습니다'}
          </h3>
          <div className="space-y-2 text-sm" style={{ color: theme.textSecondary }}>
            {mode === 'review' ? (
              <>
                <p>오늘 처리할 복습 카드를 모두 끝냈습니다.</p>
                <p>새로 틀린 카드가 생기면 다음 복습 시점에 이곳으로 들어옵니다.</p>
              </>
            ) : (
              <>
                <p>학습한 카드: {sessionTotal}개</p>
                <p>정답: {sessionCorrect}개</p>
                <p>정답률: {sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0}%</p>
              </>
            )}
          </div>
          {mode !== 'review' && (
            <button
              onClick={restartTodayDeck}
              className="mt-6 rounded-2xl px-5 py-3 font-semibold"
              style={{ background: theme.navActiveBackground, color: theme.navActiveText }}
            >
              오늘 덱 다시 보기
            </button>
          )}
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
            <span>
              {mode === 'review' ? '복습 카드' : '오늘의 카드'} {Math.min(currentCardIndex + 1, activeDeck.length)} / {activeDeck.length}
            </span>
            <span>정답 {sessionCorrect} / {sessionTotal}</span>
          </div>

          <div onClick={() => setIsFlipped(current => !current)} className="relative h-[300px] cursor-pointer perspective-1000 md:h-[360px]">
            <div
              className={`absolute inset-0 h-full w-full transition-transform duration-500 transform-style-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              <div
                className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[24px] px-5 text-white backface-hidden"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  boxShadow: `0 24px 60px ${theme.primary}30`,
                }}
              >
                <RotateCcw className="mb-2 h-6 w-6 opacity-70" />
                <h2 className="mb-2 text-2xl font-bold md:text-[2rem]">{currentCard.front}</h2>
                <p className="text-xs opacity-85">카드를 탭하여 뒤집기</p>
              </div>

              <div
                className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-[24px] px-5 text-white backface-hidden rotate-y-180"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent1}, ${theme.secondary})`,
                  boxShadow: `0 24px 60px ${theme.accent1}30`,
                }}
              >
                <h3 className="mb-3 text-lg font-bold md:text-xl">{currentCard.back}</h3>
                <p className="text-center text-xs italic leading-6 opacity-90 md:text-sm">{currentCard.example}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentCardIndex === 0}
              className="rounded-full p-3 transition-colors disabled:opacity-30"
              style={{ background: theme.navBackground, color: theme.textSecondary }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={handleIncorrect}
                className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold"
                style={{ background: `${theme.accent1}18`, color: theme.accent1 }}
              >
                <XCircle className="h-5 w-5" />
                오답
              </button>
              <button
                onClick={handleCorrect}
                className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold"
                style={{ background: `${theme.tertiary}18`, color: theme.tertiary }}
              >
                <CheckCircle2 className="h-5 w-5" />
                정답
              </button>
            </div>

            <button
              onClick={advanceDeck}
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
              <div className="text-xs" style={{ color: theme.textMuted }}>오늘 덱</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {todayDeck.length}문제
              </div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>복습 대기</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {reviewQueueCount}문제
              </div>
            </div>
            <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>진행률</div>
              <div className="mt-1 text-base font-semibold" style={{ color: theme.text }}>
                {sessionTotal} / {activeDeck.length}
              </div>
            </div>
            {mode === 'review' && (
              <div className="rounded-2xl border px-3.5 py-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
                <div className="text-xs" style={{ color: theme.textMuted }}>오늘 복습 상태</div>
                <div className="mt-1 text-base font-semibold" style={{ color: reviewQueueCount === 0 ? theme.tertiary : theme.text }}>
                  {reviewQueueCount === 0 ? '완료' : '진행 중'}
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}</style>
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
            OPIC 단어 학습
          </h3>
          <p className="mb-4 text-sm" style={{ color: theme.textSecondary }}>
            매일 IH 이상 수준의 새로운 영어 단어 20개를 학습합니다.
          </p>
          <div className="mb-4 rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: theme.text }}>{opicStats.totalWords}</div>
                <div className="text-xs" style={{ color: theme.textMuted }}>총 단어</div>
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
            onClick={loadOpicWords}
            disabled={!settings.groqApiKey}
            className="rounded-2xl px-6 py-3 font-semibold disabled:opacity-50"
            style={{ background: settings.groqApiKey ? theme.navActiveBackground : theme.navBackground, color: settings.groqApiKey ? theme.navActiveText : theme.textMuted }}
          >
            {!settings.groqApiKey ? 'API 키 필요' : '오늘의 단어 시작하기'}
          </button>
          {!settings.groqApiKey && (
            <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>설정에서 Groq API 키를 입력해주세요</p>
          )}
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
            AI가 단어를 가져오는 중...
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
                className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold"
                style={{ background: `${theme.accent1}18`, color: theme.accent1 }}
              >
                <XCircle className="h-5 w-5" />
                모름
              </button>
              <button
                onClick={handleOpicCorrect}
                className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold"
                style={{ background: `${theme.tertiary}18`, color: theme.tertiary }}
              >
                <CheckCircle2 className="h-5 w-5" />
                알겠음
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
    return (
      <div
        className="rounded-[22px] border p-4"
        style={{
          background: theme.panelBackground,
          borderColor: theme.panelBorder,
          boxShadow: theme.panelShadow,
        }}
      >
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
            Review Log
          </div>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.text }}>
            날짜별 풀이 기록
          </h3>
        </div>

        {historyDays.length === 0 ? (
          <div className="rounded-2xl border px-4 py-12 text-center text-sm" style={{ background: theme.navBackground, borderColor: theme.line, color: theme.textMuted }}>
            아직 풀이 기록이 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)]">
            <div className="space-y-2">
              {historyDays.map((date, index) => {
                const active = expandedHistoryDay === date;
                return (
                  <button
                    key={date}
                    onClick={() => setExpandedHistoryDay(date)}
                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left"
                    style={{
                      background: active ? theme.panelBackgroundStrong : theme.navBackground,
                      borderColor: active ? theme.primary : theme.line,
                    }}
                  >
                    <div>
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>
                        Day {index + 1}
                      </div>
                      <div className="text-xs" style={{ color: theme.textMuted }}>
                        {format(new Date(date), 'M월 d일', { locale: ko })}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: theme.textMuted }}>
                      {groupedHistory[date].length}문제
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border p-4" style={{ background: theme.navBackground, borderColor: theme.line }}>
              {expandedHistoryDay ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold" style={{ color: theme.text }}>
                      {format(new Date(expandedHistoryDay), 'M월 d일 (E)', { locale: ko })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs" style={{ color: theme.textMuted }}>
                        {activeHistoryEntries.length}문제
                      </div>
                      <div className="flex rounded-2xl border p-1" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line }}>
                        {[
                          { id: 'all' as const, label: '전체' },
                          { id: 'correct' as const, label: '정답' },
                          { id: 'incorrect' as const, label: '오답' },
                        ].map(filter => {
                          const active = historyFilter === filter.id;
                          return (
                            <button
                              key={filter.id}
                              onClick={() => setHistoryFilter(filter.id)}
                              className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                              style={{
                                background: active ? theme.navActiveBackground : 'transparent',
                                color: active ? theme.navActiveText : theme.textMuted,
                              }}
                            >
                              {filter.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeHistoryEntries.length === 0 ? (
                      <div className="rounded-2xl border px-4 py-10 text-center text-sm" style={{ background: theme.panelBackgroundStrong, borderColor: theme.line, color: theme.textMuted }}>
                        선택한 조건의 기록이 없습니다.
                      </div>
                    ) : (
                      activeHistoryEntries.map(entry => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between rounded-2xl px-3 py-3"
                          style={{ background: entry.result === 'correct' ? `${theme.tertiary}12` : `${theme.accent1}12` }}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold" style={{ color: theme.text }}>
                              {entry.front}
                            </div>
                            <div className="mt-1 text-xs" style={{ color: theme.textSecondary }}>
                              {entry.back}
                            </div>
                          </div>
                          <div className="text-xs font-semibold" style={{ color: entry.result === 'correct' ? theme.tertiary : theme.accent1 }}>
                            {entry.result === 'correct' ? '정답' : '오답'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-sm" style={{ color: theme.textMuted }}>
                  기록을 선택해주세요.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[980px] p-3">
      <div className="flex min-h-[720px] flex-col gap-3 md:grid md:grid-cols-[120px_minmax(0,1fr)] md:gap-3">
        <div className="hidden md:block">
          <aside
            className="rounded-[22px] border p-2.5"
            style={{
              background: theme.panelBackground,
              borderColor: theme.panelBorder,
              boxShadow: theme.panelShadow,
            }}
          >
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textMuted }}>
              Study Mode
            </div>
            <div className="space-y-2">
              {modeTabs.map(tab => {
                const Icon = tab.icon;
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium"
                    style={{
                      background: active ? theme.panelBackgroundStrong : 'transparent',
                      color: active ? theme.text : theme.textMuted,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border p-3" style={{ background: theme.navBackground, borderColor: theme.line }}>
              <div className="text-xs" style={{ color: theme.textMuted }}>
                오늘 학습
              </div>
              <div className="text-sm font-semibold" style={{ color: theme.text }}>
                {todaySession ? '완료 ✓' : '미완료'}
              </div>
              <div className="flex items-center gap-1 text-sm" style={{ color: theme.textSecondary }}>
                <Flame className="h-4 w-4" style={{ color: theme.accent1 }} />
                {currentStreak}일 연속
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-1 flex-col gap-3 pb-14 md:pb-0">
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
              {aiStudyNote}
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
                {(mode === 'flashcard' || mode === 'review') && renderFlashcardMode()}
                {mode === 'opic' && renderOpicMode()}
                {mode === 'writing' && renderWritingMode()}
                {mode === 'history' && renderHistoryMode()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
