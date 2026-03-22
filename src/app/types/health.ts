// Health 앱 전용 타입 정의

// 운동 카테고리
export const WORKOUT_CATEGORIES = [
  '가슴',
  '등',
  '어깨',
  '팔',
  '하체',
  '코어',
  '유산소',
  '기타',
] as const;

export type WorkoutCategory = typeof WORKOUT_CATEGORIES[number];

export interface WorkoutSet {
  id: string;
  weight: number; // kg
  reps: number;
  isWarmup: boolean;
  completed?: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  order: number;
}

export interface DayRoutine {
  dayOfWeek: number; // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  exercises: WorkoutExercise[];
  isRestDay: boolean;
  routineName?: string; // 사용자 정의 루틴 이름 (예: "가슴 데이", "등 운동" 등)
}

export interface WeekPlan {
  id: string;
  weekNumber: number; // 1주차, 2주차...
  days: DayRoutine[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutRecord {
  id: string;
  date: string; // yyyy-MM-dd
  weekNumber: number;
  dayOfWeek: number;
  exercises: WorkoutExercise[];
  startTime?: string;
  endTime?: string;
  notes?: string;
  totalVolume: number; // 세트 × 중량 × 횟수의 합
  userId: string;
  createdAt: string;
}

export interface BodyRecord {
  id: string;
  date: string;
  weight: number; // kg
  muscleMass?: number; // 골격근량 kg
  bodyFat?: number; // 체지방률 %
  bodyFatMass?: number; // 체지방량 kg
  bmi?: number;
  visceralFat?: number; // 내장지방 수치
  userId: string;
  createdAt: string;
}

export interface HealthSettings {
  name: string;
  theme: 'slate' | 'forest' | 'amber' | 'rose' | 'mono' | 'white';
  dynamicAccent?: 'orange' | 'red' | 'blue' | 'black'; // Dynamic 테마 악센트 색상 (라이트모드)
  dynamicAccentDark?: 'orange' | 'red' | 'blue' | 'black'; // Dynamic 테마 악센트 색상 (다크모드)
  isDarkMode?: boolean; // 다크모드 설정
  defaultRestTime: number; // 초 단위
  height: number; // cm (BMI 계산용)
  groqApiKey: string;
}

export interface HealthSyncState {
  status: 'syncing' | 'synced' | 'error';
  lastSync: Date | null;
  error: string | null;
}

// 주간 운동량 (볼륨) 계산용
export interface WeeklyVolume {
  weekStart: string; // yyyy-MM-dd
  totalVolume: number;
  workoutCount: number;
}

// 운동 진행 상태 (실시간 운동용)
export interface WorkoutSession {
  currentExerciseIndex: number;
  currentSetIndex: number;
  startTime: string;
  isResting: boolean;
  restTimeLeft: number; // 초
}
