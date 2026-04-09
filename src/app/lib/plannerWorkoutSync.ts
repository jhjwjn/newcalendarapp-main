import { format } from 'date-fns';
import { CalendarEvent, Category } from '../types/planner';
import { WorkoutRecord } from '../types/health';

const PLANNER_EVENTS_KEY = 'planner_events';
const PLANNER_CATEGORIES_KEY = 'planner_categories';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function readPlannerEvents() {
  try {
    return JSON.parse(localStorage.getItem(PLANNER_EVENTS_KEY) || '[]') as CalendarEvent[];
  } catch {
    return [];
  }
}

function writePlannerEvents(events: CalendarEvent[]) {
  localStorage.setItem(PLANNER_EVENTS_KEY, JSON.stringify(events));
}

function readPlannerCategories() {
  try {
    return JSON.parse(localStorage.getItem(PLANNER_CATEGORIES_KEY) || '[]') as Category[];
  } catch {
    return [];
  }
}

function getWorkoutCategoryId() {
  const categories = readPlannerCategories();
  return categories.find(category => category.name === '운동')?.id || categories[0]?.id || '';
}

function getDayDistance(eventDate: string, recordDate: string) {
  const eventTime = new Date(eventDate).getTime();
  const recordTime = new Date(recordDate).getTime();
  return Math.abs(eventTime - recordTime) / (1000 * 60 * 60 * 24);
}

function isWorkoutLikeEvent(event: CalendarEvent, record: WorkoutRecord, workoutCategoryId: string) {
  if (event.categoryId === workoutCategoryId) return true;
  if (event.title.includes('운동')) return true;
  return record.exercises.some(exercise => event.title.includes(exercise.name) || event.memo?.includes(exercise.name));
}

function isScheduledMatch(event: CalendarEvent, record: WorkoutRecord) {
  if (event.date === record.date) return true;
  const sameDayOfWeek = new Date(event.date).getDay() === record.dayOfWeek;
  if (!sameDayOfWeek) return false;
  return getDayDistance(event.date, record.date) <= 28;
}

function findLinkedWorkoutEvent(events: CalendarEvent[], record: WorkoutRecord, workoutCategoryId: string) {
  return events.findIndex(event => {
    if (!isWorkoutLikeEvent(event, record, workoutCategoryId)) return false;
    return isScheduledMatch(event, record);
  });
}

function buildWorkoutMemo(record: WorkoutRecord) {
  const dateLabel = `${format(new Date(record.date), 'M/d')} (${DAY_LABELS[record.dayOfWeek]})`;
  const duration = record.startTime && record.endTime
    ? (() => {
        const [sh, sm] = record.startTime.split(':').map(Number);
        const [eh, em] = record.endTime.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        return mins > 0 ? ` · ${Math.floor(mins / 60)}시간 ${mins % 60}분` : '';
      })()
    : '';

  const header = `🏋️ 운동 기록 | ${dateLabel}${duration}\n총 볼륨 ${record.totalVolume.toLocaleString()} kg`;

  const tableRows = record.exercises.map(exercise => {
    const setLines = exercise.sets
      .filter(set => !set.isWarmup)
      .map((set, i) => `  ${i + 1}세트  ${set.weight > 0 ? set.weight + 'kg' : '—'}  ×  ${set.reps}회`)
      .join('\n');
    return `▸ ${exercise.name}\n${setLines || '  (기록 없음)'}`;
  }).join('\n');

  return [header, '─'.repeat(28), tableRows].join('\n');
}

function appendWorkoutMemo(existingMemo: string | undefined, record: WorkoutRecord) {
  const block = buildWorkoutMemo(record);
  if (!existingMemo?.trim()) return block;
  if (existingMemo.includes(block)) return existingMemo;
  return `${existingMemo}\n\n${block}`;
}

export function syncWorkoutRecordToPlannedEvent(record: WorkoutRecord) {
  const workoutCategoryId = getWorkoutCategoryId();
  if (!workoutCategoryId) {
    return { status: 'missing-schedule' as const };
  }

  const events = readPlannerEvents();
  const targetIndex = findLinkedWorkoutEvent(events, record, workoutCategoryId);
  if (targetIndex < 0) {
    return { status: 'missing-schedule' as const };
  }

  const target = events[targetIndex];
  const updatedEvents = [...events];
  updatedEvents[targetIndex] = {
    ...target,
    memo: appendWorkoutMemo(target.memo, record),
    updatedAt: new Date().toISOString(),
  };
  writePlannerEvents(updatedEvents);

  return { status: 'updated' as const };
}

export function registerWorkoutRecordToPlanner(record: WorkoutRecord) {
  const workoutCategoryId = getWorkoutCategoryId();
  if (!workoutCategoryId) {
    return { status: 'missing-category' as const };
  }

  const events = readPlannerEvents();
  const targetIndex = findLinkedWorkoutEvent(events, record, workoutCategoryId);

  if (targetIndex >= 0) {
    const target = events[targetIndex];
    const updatedEvents = [...events];
    updatedEvents[targetIndex] = {
      ...target,
      memo: appendWorkoutMemo(target.memo, record),
      updatedAt: new Date().toISOString(),
    };
    writePlannerEvents(updatedEvents);
    return { status: 'updated' as const };
  }
  return { status: 'missing-schedule' as const };
}
