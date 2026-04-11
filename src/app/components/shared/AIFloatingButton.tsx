import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Calendar, Clock, Tag, Plus, Check, AlertCircle, Repeat, Bell, FileText, ShoppingCart, Target, Dumbbell, BookOpen, TrendingUp, Lightbulb, TargetIcon } from 'lucide-react';
import { toast } from '../../lib/toast';
import { usePlanner } from '../../context/PlannerContext';
import { callGroqAI, createSystemPrompt, createUserMessage } from '../../lib/ai/groq';
import { callGeminiAI, createGeminiMessage } from '../../lib/ai/gemini';
import { getPlannerTheme } from '../../lib/plannerTheme';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, parseISO } from 'date-fns';

interface PendingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
  notification: 'none' | '5min' | '15min' | '30min' | '1hour' | '1day';
  memo: string;
}

interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
}

interface Habit {
  id: string;
  name: string;
  targetDays: number[];
  streak: number;
  lastCheck: string;
}

interface Goal {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
}

interface StudyPlan {
  id: string;
  examName: string;
  examDate: string;
  topics: string[];
  currentDay: number;
  totalDays: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  blockType?: 'event' | 'summary' | 'analysis' | 'shopping' | 'habit' | 'goal' | 'study_plan' | 'workout' | 'schedule';
  blockData?: any;
}

interface AIFloatingButtonProps {
  className?: string;
}

export function AIFloatingButton({ className = '' }: AIFloatingButtonProps) {
  const { settings, addEvent, categories, events } = usePlanner();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const theme = getPlannerTheme(settings);

  useEffect(() => {
    const saved = localStorage.getItem('ai_shopping_list');
    if (saved) setShoppingList(JSON.parse(saved));
    const savedHabits = localStorage.getItem('ai_habits');
    if (savedHabits) setHabits(JSON.parse(savedHabits));
    const savedGoals = localStorage.getItem('ai_goals');
    if (savedGoals) setGoals(JSON.parse(savedGoals));
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('ai_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('ai_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'ai',
        content: '안녕하세요! 저는 당신의 AI 어시스턴트예요.\n\n무엇을 도와드릴까요?\n• "일정 등록해줘" - 자연어로 일정 추가\n• "이번 주 일정 요약해줘" - 일정 분석\n• "장보기 목록 추가해줘" - 쇼핑 목록\n• "습관 만들어줘" - 목표 습관 설정\n• "시험 공부 계획 세워줘" - 학습 전략\n• "운동 루틴 추천해줘" - 운동 프로그램',
      }]);
    }
  }, [isOpen]);

  const parseRelativeDate = (text: string): string => {
    const today = new Date();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('오늘')) return format(today, 'yyyy-MM-dd');
    if (lowerText.includes('내일')) return format(addDays(today, 1), 'yyyy-MM-dd');
    if (lowerText.includes('모레')) return format(addDays(today, 2), 'yyyy-MM-dd');
    if (lowerText.includes('글피')) return format(addDays(today, 3), 'yyyy-MM-dd');
    if (lowerText.includes('주말')) {
      const day = today.getDay();
      const daysUntilSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
      return format(addDays(today, daysUntilSaturday), 'yyyy-MM-dd');
    }
    
    const daysMatch = lowerText.match(/(\d+)일\s*(뒤|후|나중에)/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return format(addDays(today, days), 'yyyy-MM-dd');
    }
    
    return format(today, 'yyyy-MM-dd');
  };

  const parseTime = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    const timePatterns = [
      { regex: /오전\s*(\d{1,2})시\s*(\d{1,2})?분?/, handler: (m: RegExpMatchArray) => `${String(parseInt(m[1])).padStart(2, '0')}:${m[2] ? m[2].padStart(2, '0') : '00'}` },
      { regex: /오후\s*(\d{1,2})시\s*(\d{1,2})?분?/, handler: (m: RegExpMatchArray) => `${String(parseInt(m[1]) + 12).padStart(2, '0')}:${m[2] ? m[2].padStart(2, '0') : '00'}` },
      { regex: /(\d{1,2})시\s*(\d{1,2})분/, handler: (m: RegExpMatchArray) => `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}` },
      { regex: /(\d{1,2})시\s*반/, handler: (m: RegExpMatchArray) => `${String(parseInt(m[1]) + (parseInt(m[1]) < 12 ? 0 : 0)).padStart(2, '0')}:30` },
      { regex: /(\d{1,2})시/, handler: (m: RegExpMatchArray) => `${String(parseInt(m[1])).padStart(2, '0')}:00` },
      { regex: /(\d{1,2}):\s*(\d{2})/, handler: (m: RegExpMatchArray) => `${m[1].padStart(2, '0')}:${m[2]}` },
    ];
    
    for (const pattern of timePatterns) {
      const match = lowerText.match(pattern.regex);
      if (match) {
        return pattern.handler(match);
      }
    }
    
    return '09:00';
  };

  const parseCategory = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('시험') || lowerText.includes('중간고사') || lowerText.includes('기말고사') || lowerText.includes('퀴즈') || lowerText.includes('과제')) {
      return '시험';
    }
    if (lowerText.includes('공부') || lowerText.includes('수업') || lowerText.includes('강의') || lowerText.includes('독서')) {
      return '공부';
    }
    if (lowerText.includes('운동') || lowerText.includes('헬스') || lowerText.includes('조깅') || lowerText.includes('러닝') || lowerText.includes('수영') || lowerText.includes('요가')) {
      return '운동';
    }
    if (lowerText.includes('미팅') || lowerText.includes('회의') || lowerText.includes('발표') || lowerText.includes('면접') || lowerText.includes('상담')) {
      return '업무';
    }
    if (lowerText.includes('약속') || lowerText.includes('만나') || lowerText.includes('친구') || lowerText.includes('카페') || lowerText.includes('밥')) {
      return '개인';
    }
    return categories[0]?.name || '일반';
  };

  const isScheduleRegistration = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    const hasDateTime = ['오늘', '내일', '모레', '글피', '주말', '시', '분에', '때', '일', '달', '주', '오전', '오후', '년', '월'].some(w => lowerText.includes(w));
    
    const eventWords = ['시험', '중간', '기말', '미팅', '회의', '공부', '운동', '약속', '수업', '강의', '발표', '면접', '개인', '할일', '일정', '고사', '퀴즈', '과제', '컨퍼런스', '세미나', '친구', '가족', '여자친구', '남자친구', '데이트', '산책', '여행', '드라마', '영화', '게임', '콘서트'];
    
    const hasEventWord = eventWords.some(w => lowerText.includes(w));
    
    return hasDateTime || hasEventWord;
  };

  const parseScheduleText = (text: string): { title: string; date: string; time: string; category: string } | null => {
    if (!isScheduleRegistration(text)) {
      return null;
    }
    
    let title = text
      .replace(/(오늘|내일|모레|글피|주말)/g, ' ')
      .replace(/(에|은|는|이|가|을|를|의|로|으로|때|때문에)/g, ' ')
      .replace(/(있어|있고|있습니다|있네요|있네|있음|있었어)/g, ' ')
      .replace(/(것 같아|것 같은데|것 같습니다|듯해|듯한데|해야할|해야하는|좀 |참 |그냥 |일단 |우선)/g, ' ')
      .replace(/(해야해|해야돼|해야한다|했어|할게|할래)/g, ' ')
      .replace(/(오전|오후)/g, ' ')
      .replace(/(등록|추가|일정|잡아|넣어|만들어)/g, ' ')
      .replace(/\d+일\s*(뒤|후|나중에)/g, '')
      .replace(/\d{1,2}시\s*(반|\d{1,2}분)?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const coreWords = ['시험', '중간', '기말', '미팅', '회의', '공부', '운동', '약속', '수업', '발표', '고사', '강의', '면접', '컨퍼런스', '세미나', '산책', '여행', '드라마', '영화', '게임', '콘서트'];
    
    let foundCore = '';
    for (const word of coreWords) {
      if (title.includes(word)) {
        foundCore = word;
        break;
      }
    }
    
    if (foundCore) {
      const coreIndex = title.indexOf(foundCore);
      title = title.substring(coreIndex);
      title = title.replace(/\s+(것|좀|해야|할|해|했)/g, '');
      title = title.replace(/^(것|좀|해야|할|해|했)\s+/g, '');
    }
    
    title = title.replace(/^(시험|중간|기말|미팅|회의|공부|운동|약속|수업|발표|고사|강의)/g, '$1');
    
    if (title.length < 2) {
      title = foundCore || '새 일정';
    }
    
    return {
      title: title.trim(),
      date: parseRelativeDate(text),
      time: parseTime(text),
      category: parseCategory(text),
    };
  };

  const getEventSummary = (): { thisWeek: any[]; thisMonth: any[]; byCategory: Record<string, number> } => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const thisWeek = events.filter(e => {
      const date = parseISO(e.date);
      return date >= weekStart && date <= weekEnd;
    });

    const thisMonth = events.filter(e => {
      const date = parseISO(e.date);
      return date >= monthStart && date <= monthEnd;
    });

    const byCategory: Record<string, number> = {};
    thisMonth.forEach(e => {
      const cat = categories.find(c => c.id === e.categoryId);
      const name = cat?.name || '기타';
      byCategory[name] = (byCategory[name] || 0) + 1;
    });

    return { thisWeek, thisMonth, byCategory };
  };

  const handleSubmit = async () => {
    if (!input.trim() || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    console.log('handleSubmit called with:', input);
    console.trace('Stack trace:');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('장보기') && (lowerInput.includes('추가') || lowerInput.includes('사와') || lowerInput.includes('넣어'))) {
      const items = input.replace(/장보기|목록|추가|해주세요|해줘|해라/g, '').trim().split(/,|，/).map(s => s.trim()).filter(Boolean);
      const newItems = items.map(name => ({ id: `shop-${Date.now()}-${Math.random()}`, name, checked: false }));
      setShoppingList(prev => [...prev, ...newItems]);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: newItems.length > 0 ? `"${newItems.map(i => i.name).join(', ')}" 장보기 목록에 추가했어요!` : '장보기 목록에 추가했어요!',
        blockType: 'shopping',
        blockData: { items: [...shoppingList, ...newItems] },
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('장보기') && lowerInput.includes('지워') || lowerInput.includes('삭제')) {
      const items = input.replace(/장보기|목록|지워|삭제|해주세요|해줘/g, '').trim().split(/,|，/).map(s => s.trim()).filter(Boolean);
      setShoppingList(prev => prev.filter(i => !items.some(name => i.name.includes(name))));
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `"${items.join(', ')}" 장보기 목록에서 삭제했어요!`,
        blockType: 'shopping',
        blockData: { items: shoppingList },
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('장보기')) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '장보기 목록이에요!',
        blockType: 'shopping',
        blockData: { items: shoppingList },
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('습관') && (lowerInput.includes('만들') || lowerInput.includes('추가') || lowerInput.includes('설정'))) {
      const habitName = input.replace(/습관|만들어|추가해|설정해|줘|줘요|해주세요/g, '').trim();
      if (habitName) {
        const newHabit: Habit = {
          id: `habit-${Date.now()}`,
          name: habitName,
          targetDays: [1, 2, 3, 4, 5],
          streak: 0,
          lastCheck: '',
        };
        setHabits(prev => [...prev, newHabit]);
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: `"${habitName}" 습관을 만들었어요! 월~금 목표 automessage`,
          blockType: 'habit',
          blockData: { habits: [...habits, newHabit] },
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: '습관 이름을 알려주세요! 예: "매일 아침 스트레칭 습관 만들어줘"',
        }]);
      }
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('목표') && (lowerInput.includes('만들') || lowerInput.includes('추가') || lowerInput.includes('설정'))) {
      const goalMatch = input.match(/(.+?)\s*(까지|에|까지에)\s*(\d+.*)/);
      if (goalMatch) {
        const newGoal: Goal = {
          id: `goal-${Date.now()}`,
          title: goalMatch[1].replace(/목표|만들어|추가해|설정해|줘|줘요|해주세요/g, '').trim(),
          deadline: goalMatch[3].includes('일') ? format(addDays(new Date(), parseInt(goalMatch[3])), 'yyyy-MM-dd') : goalMatch[3],
          completed: false,
        };
        setGoals(prev => [...prev, newGoal]);
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: `"${newGoal.title}" 목표를 ${newGoal.deadline}까지 설정했어요!`,
          blockType: 'goal',
          blockData: { goals: [...goals, newGoal] },
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: '목표 이름과 마감일을 알려주세요! 예: "토익 공부 목표를 30일 후에 만들어줘"',
        }]);
      }
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('목표') || lowerInput.includes('습관')) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '현재 설정된 목표와 습관이에요!',
        blockType: 'habit',
        blockData: { habits, goals },
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('요약') || (lowerInput.includes('이번') && (lowerInput.includes('주') || lowerInput.includes('달')))) {
      const summary = getEventSummary();
      const percentage = Object.entries(summary.byCategory).map(([cat, count]) => {
        const total = summary.thisMonth.length || 1;
        return `${cat}: ${Math.round((count / total) * 100)}%`;
      }).join(', ');

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `📊 ${format(new Date(), 'M월')} 일정 분석\n\n이번 주: ${summary.thisWeek.length}개 일정\n이번 달: ${summary.thisMonth.length}개 일정\n\n카테고리별 분포:\n${percentage}`,
        blockType: 'summary',
        blockData: summary,
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('시험') && (lowerInput.includes('계획') || lowerInput.includes('전략') || lowerInput.includes('공부'))) {
      const examName = input.replace(/시험|공부|계획|전략|세워|만들어|줘|줘요|해주세요/g, '').trim() || '시험';
      
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `"${examName}" 학습 계획을 세워드릴게요!\n\n아래에서 시험 날짜와 범위를 설정해주세요.`,
        blockType: 'study_plan',
        blockData: { examName, topics: [] },
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (lowerInput.includes('운동') && (lowerInput.includes('루틴') || lowerInput.includes('추천') || lowerInput.includes('프로그램'))) {
      const systemPrompt = createSystemPrompt('운동 코치', `
당신은 전문 운동 코치입니다. 사용자의 목표와 조건에 맞는 운동 루틴을 추천해주세요.

[중요] 한국어만 사용하세요. 한자(漢字, 中国語 등)는 절대 사용하지 마세요. 모든 응답은 순수 한국어로만 작성하세요.

JSON 형식으로 응답:
{
  "routine": "루틴 이름",
  "duration": "주 몇회, 회당 몇분",
  "exercises": [
    {"name": "운동명", "sets": "세트", "rest": "휴식"},
    ...
  ],
  "tips": ["팁1", "팁2"]
}
`);
      const userMessage = createUserMessage(`사용자 요청: "${input}"\n현재 날짜: ${format(new Date(), 'yyyy-MM-dd')}`);

      try {
        const response = await callGroqAI(settings.groqApiKey, [systemPrompt, userMessage], 1000, true);
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setMessages(prev => [...prev, {
            id: `ai-${Date.now()}`,
            role: 'ai',
            content: `💪 운동 루틴 추천\n\n${parsed.routine}\n${parsed.duration}\n\n${parsed.exercises?.map((e: any) => `• ${e.name}: ${e.sets} (${e.rest})`).join('\n') || ''}\n\n💡 ${parsed.tips?.join(', ') || ''}`,
            blockType: 'workout',
            blockData: parsed,
          }]);
        }
      } catch {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: '죄송합니다. 운동 루틴을 생성하는 중 문제가 발생했어요.',
        }]);
      }
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    if (isScheduleRegistration(input)) {
      const parsed = parseScheduleText(input);
      if (parsed) {
        const newPending: PendingEvent = {
          id: `pending-${Date.now()}`,
          title: parsed.title,
          date: parsed.date,
          time: parsed.time,
          category: parsed.category,
          repeat: 'none',
          notification: 'none',
          memo: '',
        };
        setPendingEvents(prev => [...prev, newPending]);
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: `"${parsed.title}" 일정을 발견했어요!`,
          blockType: 'event',
          blockData: newPending,
        }]);
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }
    }

    if (!settings.groqApiKey && !settings.geminiApiKey) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '죄송해요, 아직 AI가 활성화되지 않았어요. 설정에서 Groq 또는 Gemini API 키를 입력해주세요.',
      }]);
      setIsLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    const weeklyEventCount = events.filter(e => {
      const date = parseISO(e.date);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      return date >= weekStart && date <= weekEnd;
    }).length;

    try {
      let response: string;

      if (settings.geminiApiKey) {
        // Step 1: Llama-8B(fast)로 의도 분류
        let intent = 'general';
        if (settings.groqApiKey) {
          try {
            const routerMsg = createUserMessage(`다음 사용자 입력의 의도를 분류하세요. 반드시 단어 하나만 응답하세요: "schedule" (일정/날짜 관련) 또는 "general" (일반 대화/조언).
사용자 입력: "${input}"`);
            const routerResp = await callGroqAI(settings.groqApiKey, [routerMsg], 10, true);
            if (routerResp.toLowerCase().includes('schedule')) intent = 'schedule';
          } catch {
            // router 실패 시 general로 처리
          }
        }

        // Step 2: Gemini로 응답 생성
        const geminiMessages = [
          createGeminiMessage('system', `당신은 친절하고 똑똑한 AI 어시스턴트입니다. 일정 관리, 학습 계획, 운동 루틴, 목표 설정, 일상 조언 등 다양한 분야에서 도움을 줍니다. 답변은 항상 친절하고 도움이 되는 톤으로 해주세요. 한국어로만 응답하세요.`),
          createGeminiMessage('user', `사용자: "${input}"\n\n현재 일정 수: ${events.length}개\n이번 주 일정: ${weeklyEventCount}개${intent === 'schedule' ? '\n\n[일정/날짜 관련 질문입니다. 구체적인 날짜와 일정을 포함해 답변해주세요.]' : ''}`),
        ];
        response = await callGeminiAI(settings.geminiApiKey, geminiMessages, 800);
      } else {
        // Gemini 없을 때 Groq-8B fallback
        const systemPrompt = createSystemPrompt('스마트 어시스턴트', '친절하고 도움이 되는 AI 어시스턴트입니다. 한국어로만 응답하세요. 한자를 절대 섞지 마세요.');
        const aiUserMsg = createUserMessage(`사용자: "${input}"\n\n현재 일정 수: ${events.length}개\n이번 주 일정: ${weeklyEventCount}개`);
        response = await callGroqAI(settings.groqApiKey, [systemPrompt, aiUserMsg], 800, true);
      }

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: response,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: '죄송합니다. 응답을 처리하는 중 문제가 발생했어요.',
      }]);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const updatePendingEvent = (id: string, field: keyof PendingEvent, value: string) => {
    setPendingEvents(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
    setMessages(prev => prev.map(msg => {
      if (msg.blockType === 'event' && msg.blockData?.id === id) {
        return { ...msg, blockData: { ...msg.blockData, [field]: value } };
      }
      return msg;
    }));
  };

  const removePendingEvent = (id: string) => {
    setPendingEvents(prev => prev.filter(e => e.id !== id));
    setMessages(prev => prev.map(msg => {
      if (msg.blockType === 'event' && msg.blockData?.id === id) {
        return { ...msg, blockData: null };
      }
      return msg;
    }));
  };

  const handleSaveEvent = async (event: PendingEvent) => {
    const categoryId = categories.find(c => c.name === event.category)?.id || categories[0]?.id || '';
    const [hours, minutes] = event.time.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + 60;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;

    await addEvent({
      title: event.title,
      date: event.date,
      startTime: event.time,
      endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      categoryId,
      memo: event.memo || undefined,
    });

    setPendingEvents(prev => prev.filter(e => e.id !== event.id));
    toast.success(`"${event.title}" 일정이 등록되었어요!`);
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
  };

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const isSameDay = h.lastCheck === today;
        return {
          ...h,
          streak: isSameDay ? h.streak : h.streak + 1,
          lastCheck: today,
        };
      }
      return h;
    }));
  };

  const removeHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingEvents([]);
  };

  const renderBlock = (msg: ChatMessage) => {
    switch (msg.blockType) {
      case 'event':
        return renderEventBlock(msg.blockData);
      case 'shopping':
        return renderShoppingBlock(msg.blockData?.items || shoppingList);
      case 'habit':
        return renderHabitBlock();
      case 'summary':
        return renderSummaryBlock(msg.blockData);
      case 'study_plan':
        return renderStudyPlanBlock(msg.blockData);
      case 'workout':
        return renderWorkoutBlock(msg.blockData);
      default:
        return null;
    }
  };

  const renderEventBlock = (event: PendingEvent) => (
    <motion.div
      className="rounded-2xl border-2 p-4 mt-3"
      style={{ background: theme.panelBackground, borderColor: theme.primary }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: theme.textMuted }}>📅 새 일정</span>
        <button onClick={() => removePendingEvent(event.id)} className="text-xs" style={{ color: theme.accent1 }}>삭제</button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs" style={{ color: theme.textMuted }}><Calendar className="h-3 w-3" /> 제목</label>
          <input type="text" value={event.title} onChange={e => updatePendingEvent(event.id, 'title', e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 text-xs" style={{ color: theme.textMuted }}>날짜</label>
            <input type="date" value={event.date} onChange={e => updatePendingEvent(event.id, 'date', e.target.value)}
              className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
              style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} />
          </div>
          <div>
            <label className="mb-1 text-xs" style={{ color: theme.textMuted }}>시간</label>
            <input type="time" value={event.time} onChange={e => updatePendingEvent(event.id, 'time', e.target.value)}
              className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
              style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} />
          </div>
        </div>
        
        <div>
          <label className="mb-1 text-xs" style={{ color: theme.textMuted }}>카테고리</label>
          <select value={event.category} onChange={e => updatePendingEvent(event.id, 'category', e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }}>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.emoji} {cat.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="mb-1 text-xs" style={{ color: theme.textMuted }}>메모</label>
          <textarea value={event.memo} onChange={e => updatePendingEvent(event.id, 'memo', e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none" rows={2}
            style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} />
        </div>
      </div>
      
      <button onClick={() => handleSaveEvent(event)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` }}>
        <Check className="h-4 w-4" /> 등록
      </button>
    </motion.div>
  );

  const renderShoppingBlock = (items: ShoppingItem[]) => (
    <motion.div className="rounded-2xl border p-4 mt-3" style={{ background: theme.panelBackground, borderColor: theme.line }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium" style={{ color: theme.text }}>🛒 장보기 목록</span>
        <span className="text-xs" style={{ color: theme.textMuted }}>{items.filter(i => i.checked).length}/{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: theme.textMuted }}>장보기 목록이 비어있어요</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <button onClick={() => toggleShoppingItem(item.id)}
                className={`w-5 h-5 rounded border flex items-center justify-center ${item.checked ? 'bg-green-500 border-green-500' : ''}`}
                style={{ borderColor: item.checked ? undefined : theme.line }}>
                {item.checked && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${item.checked ? 'line-through' : ''}`} style={{ color: item.checked ? theme.textMuted : theme.text }}>{item.name}</span>
              <button onClick={() => removeShoppingItem(item.id)} className="text-xs" style={{ color: theme.accent1 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs" style={{ color: theme.textMuted }}>"우유, 계란 추가해줘"라고 말하면 목록에 추가할 수 있어요</p>
    </motion.div>
  );

  const renderHabitBlock = () => (
    <motion.div className="rounded-2xl border p-4 mt-3 space-y-4" style={{ background: theme.panelBackground, borderColor: theme.line }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {habits.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TargetIcon className="h-4 w-4" style={{ color: theme.primary }} />
            <span className="font-medium" style={{ color: theme.text }}>🎯 습관</span>
          </div>
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: theme.navBackground }}>
              <button onClick={() => toggleHabit(habit.id)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center" style={{ borderColor: theme.primary }}>
                <span className="text-xs" style={{ color: theme.primary }}>{habit.streak > 0 ? '🔥' : ''}</span>
              </button>
              <span className="flex-1 text-sm" style={{ color: theme.text }}>{habit.name}</span>
              <span className="text-xs" style={{ color: theme.accent1 }}>{habit.streak}일</span>
              <button onClick={() => removeHabit(habit.id)} className="text-xs" style={{ color: theme.textMuted }}>✕</button>
            </div>
          ))}
        </div>
      )}
      
      {goals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4" style={{ color: theme.accent1 }} />
            <span className="font-medium" style={{ color: theme.text }}>⭐ 목표</span>
          </div>
          {goals.map(goal => (
            <div key={goal.id} className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: theme.navBackground }}>
              <button onClick={() => toggleGoal(goal.id)}
                className={`w-5 h-5 rounded border flex items-center justify-center ${goal.completed ? 'bg-green-500 border-green-500' : ''}`}
                style={{ borderColor: goal.completed ? undefined : theme.line }}>
                {goal.completed && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${goal.completed ? 'line-through' : ''}`} style={{ color: goal.completed ? theme.textMuted : theme.text }}>{goal.title}</span>
              <span className="text-xs" style={{ color: theme.textMuted }}>~{goal.deadline}</span>
              <button onClick={() => removeGoal(goal.id)} className="text-xs" style={{ color: theme.textMuted }}>✕</button>
            </div>
          ))}
        </div>
      )}
      
      {habits.length === 0 && goals.length === 0 && (
        <p className="text-sm" style={{ color: theme.textMuted }}>아직 설정된 습관과 목표가 없어요</p>
      )}
    </motion.div>
  );

  const renderSummaryBlock = (data: any) => (
    <motion.div className="rounded-2xl border p-4 mt-3" style={{ background: theme.panelBackground, borderColor: theme.line }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4" style={{ color: theme.primary }} />
        <span className="font-medium" style={{ color: theme.text }}>📊 일정 분석</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg" style={{ background: theme.navBackground }}>
          <p className="text-2xl font-bold" style={{ color: theme.primary }}>{data.thisWeek?.length || 0}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>이번 주</p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: theme.navBackground }}>
          <p className="text-2xl font-bold" style={{ color: theme.accent1 }}>{data.thisMonth?.length || 0}</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>이번 달</p>
        </div>
      </div>
      {Object.keys(data.byCategory || {}).length > 0 && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: theme.textMuted }}>카테고리별</p>
          <div className="space-y-1">
            {Object.entries(data.byCategory).map(([cat, count]: [string, any]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: theme.text }}>{cat}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: theme.navBackground }}>
                  <div className="h-full rounded-full" style={{ 
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})`,
                    width: `${(count / (data.thisMonth?.length || 1)) * 100}%` 
                  }} />
                </div>
                <span className="text-xs" style={{ color: theme.textMuted }}>{count}개</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderStudyPlanBlock = (data: any) => (
    <motion.div className="rounded-2xl border p-4 mt-3" style={{ background: theme.panelBackground, borderColor: theme.line }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4" style={{ color: theme.primary }} />
        <span className="font-medium" style={{ color: theme.text }}>📚 학습 계획</span>
      </div>
      <p className="text-sm mb-3" style={{ color: theme.text }}>"{data.examName}" 시험을 준비 중이군요!</p>
      <p className="text-xs" style={{ color: theme.textMuted }}>AI가 시험 날짜와 범위를 분석해서 학습 계획을 세워드릴게요.</p>
    </motion.div>
  );

  const renderWorkoutBlock = (data: any) => (
    <motion.div className="rounded-2xl border p-4 mt-3" style={{ background: theme.panelBackground, borderColor: theme.line }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell className="h-4 w-4" style={{ color: theme.primary }} />
        <span className="font-medium" style={{ color: theme.text }}>💪 운동 루틴</span>
      </div>
      {data?.exercises?.map((ex: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: theme.navBackground }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: theme.primary, color: '#fff' }}>{idx + 1}</span>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: theme.text }}>{ex.name}</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>{ex.sets} • 휴식 {ex.rest}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-6 md:right-6 ${className}`}
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="h-6 w-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-[100] flex justify-end p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
            
            <motion.div className="flex h-[calc(100vh-48px)] w-full max-w-md flex-col rounded-3xl border shadow-2xl"
              style={{ background: theme.panelBackground, borderColor: theme.panelBorder }}
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: theme.line }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` }}>
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: theme.text }}>AI 어시스턴트</h3>
                    <p className="text-xs" style={{ color: theme.textMuted }}>무엇을 도와드릴까요?</p>
                  </div>
                </div>
                <button onClick={handleClose} className="rounded-full p-2" style={{ background: theme.navBackground }}>
                  <X className="h-5 w-5" style={{ color: theme.textMuted }} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ 
                        background: msg.role === 'user' ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` : theme.navBackground,
                        color: msg.role === 'user' ? '#fff' : theme.text,
                      }}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                    {msg.blockType && renderBlock(msg)}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3" style={{ background: theme.navBackground }}>
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.primary, animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={e => { e.preventDefault(); if (!isLoading && input.trim()) handleSubmit(); }} className="border-t p-4" style={{ borderColor: theme.line }}>
                <div className="flex gap-2">
                  <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder="말해보세요..."
                    className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{ background: theme.navBackground, borderColor: theme.line, color: theme.text }} disabled={isLoading} />
                  <button type="submit" disabled={isLoading || !input.trim()}
                    className="flex h-12 w-12 items-center justify-center rounded-full disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent1})` }}>
                    <Send className="h-5 w-5 text-white" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {['일정 추가', '주간 요약', '장보기', '습관 만들기', '운동 추천'].map(cmd => (
                    <button key={cmd} onClick={() => setInput(cmd)}
                      className="whitespace-nowrap rounded-full px-3 py-1 text-xs" style={{ background: theme.navBackground, color: theme.textMuted }}>
                      {cmd}
                    </button>
                  ))}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
