import { callGeminiAI, createGeminiMessage } from './gemini';
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

// IH/AH 수준의 OPIC 실용 단어 로컬 DB
const LOCAL_OPIC_WORD_DB: Omit<OPICWord, 'id'>[] = [
  { word: 'elaborate', meaning: '자세히 설명하다, 정교한', example: 'Could you elaborate on your daily routine?', level: 'IH' },
  { word: 'spontaneous', meaning: '자발적인, 즉흥적인', example: 'I enjoy spontaneous weekend trips with friends.', level: 'IH' },
  { word: 'sustainable', meaning: '지속 가능한', example: 'I try to adopt sustainable habits in daily life.', level: 'IH' },
  { word: 'collaborate', meaning: '협력하다, 공동 작업하다', example: 'We collaborated on a group project last semester.', level: 'IH' },
  { word: 'incorporate', meaning: '통합하다, 포함하다', example: 'I incorporate exercise into my morning routine.', level: 'IH' },
  { word: 'transition', meaning: '전환, 이행', example: 'The transition from student to worker was challenging.', level: 'IH' },
  { word: 'perspective', meaning: '관점, 시각', example: 'Traveling broadened my perspective on life.', level: 'IH' },
  { word: 'simultaneously', meaning: '동시에', example: 'I listen to podcasts and commute simultaneously.', level: 'IH' },
  { word: 'dedication', meaning: '헌신, 전념', example: 'Her dedication to learning English is impressive.', level: 'IH' },
  { word: 'immerse', meaning: '몰입하다', example: 'I immerse myself in Korean dramas to relax.', level: 'IH' },
  { word: 'prioritize', meaning: '우선순위를 두다', example: 'I prioritize sleep over late-night entertainment.', level: 'IH' },
  { word: 'flexible', meaning: '유연한, 융통성 있는', example: 'My schedule is fairly flexible on weekends.', level: 'IH' },
  { word: 'commute', meaning: '통근하다, 통근', example: 'My daily commute takes about 40 minutes.', level: 'IM' },
  { word: 'acquaintance', meaning: '지인, 아는 사람', example: 'I ran into an old acquaintance at the gym.', level: 'IH' },
  { word: 'motivate', meaning: '동기부여하다', example: 'Music motivates me during workouts.', level: 'IM' },
  { word: 'routine', meaning: '일과, 루틴', example: 'Sticking to a routine helps me stay productive.', level: 'IM' },
  { word: 'consistent', meaning: '일관된, 꾸준한', example: 'Being consistent with exercise leads to results.', level: 'IH' },
  { word: 'leisure', meaning: '여가, 여유 시간', example: 'I spend my leisure time reading or hiking.', level: 'IM' },
  { word: 'occasional', meaning: '가끔의, 때때로의', example: 'I take occasional breaks to recharge.', level: 'IH' },
  { word: 'accomplish', meaning: '달성하다, 성취하다', example: 'I feel great when I accomplish my daily goals.', level: 'IH' },
  { word: 'adjust', meaning: '적응하다, 조정하다', example: 'It took time to adjust to the new schedule.', level: 'IH' },
  { word: 'concentrate', meaning: '집중하다', example: 'I find it hard to concentrate without music.', level: 'IH' },
  { word: 'frequently', meaning: '자주, 빈번히', example: 'I frequently visit the local coffee shop.', level: 'IM' },
  { word: 'significant', meaning: '중요한, 상당한', example: 'Exercise has made a significant difference in my life.', level: 'IH' },
  { word: 'enhance', meaning: '향상시키다', example: 'Reading enhances your vocabulary effectively.', level: 'IH' },
  { word: 'overwhelm', meaning: '압도하다', example: 'Deadlines can be overwhelming at times.', level: 'IH' },
  { word: 'anticipate', meaning: '기대하다, 예상하다', example: 'I always anticipate the weekend to go hiking.', level: 'IH' },
  { word: 'accomplish', meaning: '성취하다', example: 'She accomplished her language goals in one year.', level: 'IH' },
  { word: 'exhausted', meaning: '지친, 기진맥진한', example: 'After the marathon, I felt completely exhausted.', level: 'IM' },
  { word: 'maintenance', meaning: '유지, 보수', example: 'Regular maintenance keeps your health in check.', level: 'IH' },
  { word: 'consequence', meaning: '결과, 영향', example: 'Poor sleep has serious health consequences.', level: 'IH' },
  { word: 'socialize', meaning: '사교하다, 어울리다', example: 'I like to socialize with coworkers after work.', level: 'IH' },
  { word: 'obligation', meaning: '의무, 책임', example: 'Work obligations sometimes cut into personal time.', level: 'IH' },
  { word: 'productive', meaning: '생산적인', example: 'Mornings are my most productive time of day.', level: 'IH' },
  { word: 'commitment', meaning: '헌신, 약속', example: 'Learning a language requires real commitment.', level: 'IH' },
  { word: 'stimulate', meaning: '자극하다', example: 'Reading stimulates critical thinking.', level: 'IH' },
  { word: 'genuinely', meaning: '진심으로, 진정으로', example: 'I genuinely enjoy cooking for my family.', level: 'IH' },
  { word: 'constantly', meaning: '끊임없이', example: 'I constantly challenge myself with new skills.', level: 'IH' },
  { word: 'adequate', meaning: '충분한, 적절한', example: 'Getting adequate sleep is essential for health.', level: 'IH' },
  { word: 'reflect', meaning: '반성하다, 반영하다', example: 'I reflect on my day before going to sleep.', level: 'IH' },
  { word: 'interaction', meaning: '상호작용, 교류', example: 'Social interaction boosts mental well-being.', level: 'IH' },
  { word: 'overwhelmingly', meaning: '압도적으로', example: 'The response was overwhelmingly positive.', level: 'IH' },
  { word: 'discipline', meaning: '규율, 절제', example: 'Self-discipline is key to achieving goals.', level: 'IH' },
  { word: 'navigate', meaning: '처리하다, 헤쳐나가다', example: 'It was hard to navigate the busy schedule.', level: 'IH' },
  { word: 'appreciate', meaning: '감사하다, 인식하다', example: 'I appreciate the small moments in daily life.', level: 'IM' },
  { word: 'aspect', meaning: '측면, 면', example: 'Cooking is my favorite aspect of homelife.', level: 'IM' },
  { word: 'accomplish', meaning: '성취하다', example: 'I accomplish my best work in the morning.', level: 'IH' },
  { word: 'overcome', meaning: '극복하다', example: 'I overcame my fear of public speaking.', level: 'IH' },
  { word: 'regardless', meaning: '상관없이', example: 'I exercise regardless of the weather.', level: 'IH' },
  { word: 'alternatively', meaning: '그 대신에, 대안으로', example: 'Alternatively, I take a walk to clear my mind.', level: 'IH' },
  { word: 'thoroughly', meaning: '철저히, 완전히', example: 'I thoroughly enjoyed the documentary.', level: 'IH' },
  { word: 'ultimately', meaning: '결국, 궁극적으로', example: 'Ultimately, consistency leads to success.', level: 'IH' },
  { word: 'intensify', meaning: '강화하다', example: 'I intensify my workouts before exam season.', level: 'IH' },
  { word: 'alleviate', meaning: '완화하다', example: 'Exercise helps alleviate stress effectively.', level: 'AH' },
  { word: 'cultivate', meaning: '기르다, 육성하다', example: 'I try to cultivate healthy reading habits.', level: 'AH' },
  { word: 'meticulous', meaning: '꼼꼼한, 세심한', example: 'She is meticulous about her study schedule.', level: 'AH' },
  { word: 'proactive', meaning: '적극적인, 선제적인', example: 'I try to be proactive about time management.', level: 'AH' },
  { word: 'eloquent', meaning: '유창한, 설득력 있는', example: 'She gave an eloquent speech at the ceremony.', level: 'AH' },
  { word: 'perseverance', meaning: '끈기, 인내', example: 'Perseverance is more important than talent.', level: 'AH' },
  { word: 'substantial', meaning: '상당한, 실질적인', example: 'She made a substantial improvement this year.', level: 'IH' },
  { word: 'efficiency', meaning: '효율성', example: 'I value efficiency in my daily tasks.', level: 'IH' },
  { word: 'instinctively', meaning: '본능적으로', example: 'I instinctively reach for my phone in the morning.', level: 'AH' },
  { word: 'diligently', meaning: '성실하게, 부지런히', example: 'She diligently studies two hours every day.', level: 'IH' },
  { word: 'memorable', meaning: '기억에 남는', example: 'That trip was one of my most memorable experiences.', level: 'IM' },
  { word: 'exceptional', meaning: '뛰어난, 탁월한', example: 'She has exceptional communication skills.', level: 'IH' },
  { word: 'breakthrough', meaning: '돌파구, 획기적인 발전', example: 'Learning to cook was a personal breakthrough.', level: 'IH' },
  { word: 'perspective', meaning: '관점', example: 'Living abroad gave me a new perspective.', level: 'IH' },
  { word: 'manageable', meaning: '관리 가능한', example: 'Breaking goals into steps makes them manageable.', level: 'IH' },
  { word: 'habitual', meaning: '습관적인', example: 'Habitual exercise improves overall wellbeing.', level: 'IH' },
  { word: 'interaction', meaning: '상호작용', example: 'Face-to-face interaction is important for relationships.', level: 'IH' },
  { word: 'exposure', meaning: '노출, 경험', example: 'Regular exposure to English improves fluency.', level: 'IH' },
  { word: 'fundamentally', meaning: '근본적으로', example: 'This experience fundamentally changed my attitude.', level: 'AH' },
  { word: 'spontaneously', meaning: '자발적으로, 즉흥적으로', example: 'We spontaneously decided to go hiking.', level: 'IH' },
  { word: 'rewarding', meaning: '보람 있는', example: 'Volunteering is one of the most rewarding activities.', level: 'IH' },
  { word: 'mentality', meaning: '사고방식', example: 'Having a growth mentality is key to improvement.', level: 'IH' },
  { word: 'acknowledge', meaning: '인정하다', example: 'It is important to acknowledge your mistakes.', level: 'IH' },
  { word: 'challenge', meaning: '도전, 어려움', example: 'Every challenge is a chance to grow.', level: 'IM' },
  { word: 'initiative', meaning: '주도권, 솔선', example: 'I took the initiative to organize the event.', level: 'IH' },
  { word: 'passion', meaning: '열정', example: 'My passion for music started in childhood.', level: 'IM' },
  { word: 'frustration', meaning: '좌절, 답답함', example: 'Language barriers cause a lot of frustration.', level: 'IH' },
  { word: 'resilience', meaning: '회복력, 탄력성', example: 'Resilience helps you bounce back from setbacks.', level: 'AH' },
  { word: 'transparent', meaning: '투명한, 솔직한', example: 'I try to be transparent about my feelings.', level: 'IH' },
  { word: 'phenomenon', meaning: '현상', example: 'The K-pop phenomenon has spread worldwide.', level: 'IH' },
  { word: 'comprehensive', meaning: '포괄적인', example: 'She gave a comprehensive review of the book.', level: 'AH' },
  { word: 'ambitious', meaning: '야심 있는', example: 'I have ambitious goals for this year.', level: 'IH' },
  { word: 'implement', meaning: '실행하다', example: 'I implemented a new study method last month.', level: 'IH' },
  { word: 'preference', meaning: '선호', example: 'My preference is to work out in the morning.', level: 'IM' },
  { word: 'enthusiasm', meaning: '열의, 열정', example: 'Her enthusiasm for learning is contagious.', level: 'IH' },
  { word: 'adaptable', meaning: '적응력 있는', example: 'Being adaptable is crucial in today\'s world.', level: 'IH' },
  { word: 'compromise', meaning: '타협하다, 절충안', example: 'We found a compromise that worked for everyone.', level: 'IH' },
  { word: 'tendency', meaning: '경향', example: 'I have a tendency to over-plan my weekends.', level: 'IH' },
  { word: 'profound', meaning: '깊은, 심오한', example: 'Traveling had a profound effect on my outlook.', level: 'AH' },
  { word: 'specifically', meaning: '구체적으로', example: 'I specifically enjoy hiking in autumn.', level: 'IH' },
  { word: 'relatively', meaning: '비교적', example: 'My workplace is relatively close to home.', level: 'IH' },
  { word: 'effectively', meaning: '효과적으로', example: 'This method effectively reduces stress.', level: 'IH' },
  { word: 'considerably', meaning: '상당히', example: 'My English improved considerably last year.', level: 'IH' },
  { word: 'inevitable', meaning: '피할 수 없는', example: 'Change is inevitable in any career.', level: 'AH' },
  { word: 'relevant', meaning: '관련된, 적절한', example: 'I focus on reading relevant articles for work.', level: 'IH' },
  { word: 'assertive', meaning: '적극적인, 자기주장이 강한', example: 'Being assertive helped me speak up in meetings.', level: 'AH' },
  { word: 'articulate', meaning: '명확히 표현하다, 말을 잘하는', example: 'She is very articulate when explaining ideas.', level: 'AH' },
  { word: 'insightful', meaning: '통찰력 있는', example: 'Her feedback was incredibly insightful.', level: 'AH' },
  { word: 'proficient', meaning: '능숙한', example: 'I am proficient in three languages.', level: 'AH' },
  { word: 'integrate', meaning: '통합하다', example: 'I try to integrate reading into my commute.', level: 'IH' },
  { word: 'analyze', meaning: '분석하다', example: 'I analyze my weekly schedule every Sunday.', level: 'IH' },
  { word: 'optimistic', meaning: '낙관적인', example: 'I try to stay optimistic during tough times.', level: 'IH' },
  { word: 'indulge', meaning: '탐닉하다, 즐기다', example: 'I sometimes indulge in a long afternoon nap.', level: 'IH' },
  { word: 'minimize', meaning: '최소화하다', example: 'I minimize distractions when studying.', level: 'IH' },
  { word: 'underestimate', meaning: '과소평가하다', example: 'Never underestimate the value of rest.', level: 'IH' },
  { word: 'circumstances', meaning: '상황, 환경', example: 'Circumstances forced me to change my plans.', level: 'IH' },
  { word: 'foundation', meaning: '기초, 토대', example: 'Grammar is the foundation of language learning.', level: 'IH' },
  { word: 'exceptional', meaning: '비범한, 예외적인', example: 'She showed exceptional dedication to her craft.', level: 'IH' },
  { word: 'spontaneous', meaning: '즉흥적인', example: 'Spontaneous plans often turn into great memories.', level: 'IH' },
  { word: 'resourceful', meaning: '지략 있는', example: 'Being resourceful helps when plans change.', level: 'AH' },
  { word: 'evolve', meaning: '발전하다, 진화하다', example: 'My taste in music has evolved over the years.', level: 'IH' },
  { word: 'distinguish', meaning: '구별하다', example: 'It is hard to distinguish between the two styles.', level: 'IH' },
  { word: 'milestone', meaning: '이정표, 중요한 사건', example: 'Getting a promotion was a career milestone.', level: 'IH' },
  { word: 'momentum', meaning: '추진력, 탄력', example: 'I try to maintain momentum once I start exercising.', level: 'IH' },
  { word: 'pivotal', meaning: '중추적인, 중요한', example: 'That conversation was pivotal in my growth.', level: 'AH' },
  { word: 'daunting', meaning: '벅찬, 두려운', example: 'Starting over in a new city felt daunting.', level: 'AH' },
  { word: 'fascinated', meaning: '매료된', example: 'I have always been fascinated by astronomy.', level: 'IH' },
  { word: 'versatile', meaning: '다재다능한', example: 'A versatile skill set is valuable today.', level: 'IH' },
  { word: 'candid', meaning: '솔직한', example: 'I appreciate candid feedback from others.', level: 'AH' },
  { word: 'pragmatic', meaning: '실용적인', example: 'I take a pragmatic approach to problem-solving.', level: 'AH' },
  { word: 'relentless', meaning: '끊임없는, 집요한', example: 'Her relentless effort paid off in the end.', level: 'AH' },
  { word: 'immense', meaning: '엄청난', example: 'I felt immense satisfaction after finishing the project.', level: 'IH' },
  { word: 'transform', meaning: '변화시키다', example: 'Exercise transformed my lifestyle completely.', level: 'IH' },
  { word: 'vital', meaning: '필수적인', example: 'Getting feedback is vital for improvement.', level: 'IH' },
  { word: 'simultaneously', meaning: '동시에', example: 'I balance work and study simultaneously.', level: 'IH' },
  { word: 'accumulate', meaning: '쌓이다, 축적하다', example: 'Small habits accumulate into big changes.', level: 'IH' },
  { word: 'deliberate', meaning: '의도적인, 신중한', example: 'She made a deliberate effort to improve.', level: 'AH' },
  { word: 'commendable', meaning: '칭찬할 만한', example: 'Her commitment to health is commendable.', level: 'AH' },
  { word: 'persevere', meaning: '인내하다', example: 'You have to persevere through difficult moments.', level: 'AH' },
  { word: 'empathize', meaning: '공감하다', example: 'I try to empathize with different perspectives.', level: 'AH' },
  { word: 'endeavor', meaning: '노력하다, 시도', example: 'I always endeavor to give my best effort.', level: 'AH' },
  { word: 'reminisce', meaning: '회상하다', example: 'We reminisced about our university days.', level: 'AH' },
  { word: 'deteriorate', meaning: '악화되다', example: 'Bad sleep can deteriorate your mental health.', level: 'AH' },
  { word: 'rejuvenate', meaning: '활력을 되찾다', example: 'A short vacation rejuvenated my energy.', level: 'AH' },
  { word: 'meticulous', meaning: '세심한, 꼼꼼한', example: 'He is meticulous about maintaining his workspace.', level: 'AH' },
  { word: 'straightforward', meaning: '단순한, 솔직한', example: 'The process was surprisingly straightforward.', level: 'IH' },
  { word: 'persistent', meaning: '끈질긴', example: 'Being persistent is key to mastering a skill.', level: 'IH' },
  { word: 'substantial', meaning: '상당한', example: 'I made a substantial investment in self-learning.', level: 'IH' },
  { word: 'vivid', meaning: '생생한', example: 'I have vivid memories of my first trip abroad.', level: 'IH' },
  { word: 'mundane', meaning: '평범한, 일상적인', example: 'Even mundane tasks can be done mindfully.', level: 'IH' },
  { word: 'deliberate', meaning: '신중한', example: 'A deliberate approach leads to better results.', level: 'AH' },
  { word: 'coherent', meaning: '일관성 있는, 논리적인', example: 'It is important to give a coherent answer.', level: 'AH' },
  { word: 'analogy', meaning: '비유, 유추', example: 'She used a great analogy to explain the concept.', level: 'AH' },
  { word: 'initiative', meaning: '주도적으로 나서다', example: 'I took the initiative to lead the project.', level: 'IH' },
  { word: 'skeptical', meaning: '회의적인', example: 'I was initially skeptical but quickly adapted.', level: 'IH' },
];

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

// 로컬 DB에서 단어 선택 (API 호출 없음)
export function fetchNewOPICWords(
  _apiKey: string,
  count: number = 20
): OPICWord[] {
  const existingWords = getWordPool();
  const existingSet = new Set(existingWords.map(w => w.word.toLowerCase()));
  const learned = getLearnedWords();
  const learnedSet = new Set(learned.map(w => w.word.toLowerCase()));

  // 아직 추가되지 않은 단어 필터링
  const available = LOCAL_OPIC_WORD_DB.filter(
    w => !existingSet.has(w.word.toLowerCase()) && !learnedSet.has(w.word.toLowerCase())
  );

  // 랜덤 셔플 후 count개 선택
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count).map(w => ({ ...w, id: generateId() }));

  const allWords = [...existingWords, ...selected];
  saveWordPool(allWords);

  return selected;
}

// Gemini로 상황별 스크립트 생성
export async function generateOPICScript(
  geminiApiKey: string,
  words: OPICWord[]
): Promise<string> {
  if (!geminiApiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');

  const wordList = words.map(w => `${w.word} (${w.meaning})`).join(', ');

  const messages = [
    createGeminiMessage('system', `You are an OPIC exam preparation expert. Create a natural, conversational English script for OPIC speaking practice.`),
    createGeminiMessage('user', `다음 단어들을 자연스럽게 활용한 OPIC 스크립트를 만들어주세요.

단어 목록: ${wordList}

요구사항:
- 일상생활 주제 (취미, 하루 일과, 여행, 학교/직장 등)
- 영어로 작성, 각 단어를 굵게 표시 (**단어**)
- 3~5문단, 자연스러운 구어체
- 마지막에 한국어 해석 요약 한 줄

스크립트:`),
  ];

  return await callGeminiAI(geminiApiKey, messages, 800);
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
