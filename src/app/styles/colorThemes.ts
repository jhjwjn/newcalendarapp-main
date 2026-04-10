// 플래너 및 헬스 앱 색상 테마 정의

// 플래너 앱 Glass 스타일 색상 (부드럽고 우아하게)
export const PLANNER_GLASS_THEMES = {
  blue: {
    primary: '#5B9BD5',      // 소프트 블루 - 메인
    secondary: '#A78BFA',     // 라벤더 퍼플 - 유사색
    tertiary: '#7DD3C0',      // 아쿠아 민트 - 시원한 포인트
    accent1: '#FFB4C8',       // 소프트 핑크 - 보색 계열, 로맨틱
    accent2: '#FFD4A3',       // 피치 - 따뜻한 대비
  },
  purple: {
    primary: '#A78BFA',       // 소프트 퍼플 - 메인
    secondary: '#F5A3D0',     // 연한 핑크 - 유사색
    tertiary: '#C4A5E5',      // 연보라 - 깊이감
    accent1: '#F4C896',       // 골드/피치 - 보색 대비
    accent2: '#94C9E8',       // 소프트 블루 - 시원한 포인트
  },
  peach: {
    primary: '#FFB4A2',       // 피치 - 메인
    secondary: '#FFD4C8',     // 코랄 핑크 - 유사색
    tertiary: '#F4B5D8',      // 로즈 핑크 - 로맨틱
    accent1: '#C8B6E2',       // 라벤더 - 대비
    accent2: '#FFEAA7',       // 라이트 골드 - 따뜻한 포인트
  },
  black: {
    primary: '#1F2937',
    secondary: '#475569',
    tertiary: '#94A3B8',
    accent1: '#CBD5E1',
    accent2: '#E2E8F0',
  },
} as const;

// 플래너 앱 다크모드 Glass 스타일 (깊고 신비로운 네온 계열)
export const PLANNER_GLASS_THEMES_DARK = {
  blue: {
    primary: '#60A5FA',       // 브라이트 블루 - 메인, 블랙과 대비
    secondary: '#A78BFA',     // 라벤더 퍼플 - 유사색
    tertiary: '#22D3EE',      // 사이언 - 네온 느낌
    accent1: '#F472B6',       // 네온 핑크 - 강렬한 대비
    accent2: '#FBBF24',       // 골드 - 따뜻한 포인트
  },
  purple: {
    primary: '#C084FC',       // 네온 퍼플 - 메인
    secondary: '#F0ABFC',     // 네온 핑크 - 유사색
    tertiary: '#A78BFA',      // 라벤더 - 깊이감
    accent1: '#FCD34D',       // 골든 옐로우 - 보색 대비
    accent2: '#67E8F9',       // 브라이트 사이언 - 시원한 포인트
  },
  peach: {
    primary: '#FB923C',       // 네온 오렌지 - 메인 (피치보다 강렬)
    secondary: '#F472B6',     // 네온 핑크 - 유사색
    tertiary: '#EC4899',      // 핫 핑크 - 로맨틱
    accent1: '#A78BFA',       // 라벤더 - 대비
    accent2: '#FBBF24',       // 골드 - 따뜻한 포인트
  },
  black: {
    primary: '#E5E7EB',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    accent1: '#CBD5E1',
    accent2: '#F8FAFC',
  },
} as const;

// 헬스 앱 Dynamic 스타일 색상 (라이트모드)
export const HEALTH_DYNAMIC_THEMES = {
  orange: {
    primary: '#8B5CF6',     // 바이올렛 — Cosmic
    secondary: '#7C3AED',   // 딥 퍼플
    tertiary: '#A78BFA',    // 소프트 라벤더
    accent1: '#EC4899',     // 핫 핑크 포인트
    accent2: '#06B6D4',     // 사이언 보색
  },
  red: {
    primary: '#06B6D4',     // 사이언 — Neo
    secondary: '#0891B2',   // 딥 사이언
    tertiary: '#67E8F9',    // 라이트 사이언
    accent1: '#8B5CF6',     // 퍼플 포인트
    accent2: '#10B981',     // 에메랄드 보색
  },
  blue: {
    primary: '#F59E0B',     // 앰버 골드 — Ember
    secondary: '#D97706',   // 딥 앰버
    tertiary: '#FCD34D',    // 라이트 골드
    accent1: '#EF4444',     // 레드 포인트
    accent2: '#8B5CF6',     // 퍼플 보색
  },
  teal: {
    primary: '#EC4899',     // 로즈 마젠타 — Bloom
    secondary: '#DB2777',   // 딥 핑크
    tertiary: '#F9A8D4',    // 소프트 로즈
    accent1: '#8B5CF6',     // 퍼플 포인트
    accent2: '#F59E0B',     // 골드 보색
  },
} as const;

// 헬스 앱 다크모드 Dynamic 스타일 (더 강렬한 네온/비비드 계열)
export const HEALTH_DYNAMIC_THEMES_DARK = {
  orange: {
    primary: '#A78BFA',     // 네온 바이올렛 — Cosmic
    secondary: '#8B5CF6',   // 비비드 퍼플
    tertiary: '#C4B5FD',    // 소프트 라벤더
    accent1: '#F472B6',     // 네온 핑크
    accent2: '#22D3EE',     // 사이언
  },
  red: {
    primary: '#22D3EE',     // 네온 사이언 — Neo
    secondary: '#06B6D4',   // 비비드 사이언
    tertiary: '#67E8F9',    // 소프트 사이언
    accent1: '#A78BFA',     // 라벤더
    accent2: '#34D399',     // 에메랄드
  },
  blue: {
    primary: '#FBBF24',     // 네온 골드 — Ember
    secondary: '#F59E0B',   // 비비드 앰버
    tertiary: '#FDE68A',    // 소프트 옐로우
    accent1: '#F87171',     // 소프트 레드
    accent2: '#A78BFA',     // 라벤더
  },
  teal: {
    primary: '#F472B6',     // 네온 핑크 — Bloom
    secondary: '#EC4899',   // 비비드 로즈
    tertiary: '#FBCFE8',    // 소프트 핑크
    accent1: '#A78BFA',     // 라벤더
    accent2: '#FBBF24',     // 골든
  },
};

// 타입 추론
export type PlannerGlassAccent = keyof typeof PLANNER_GLASS_THEMES;
export type HealthDynamicAccent = keyof typeof HEALTH_DYNAMIC_THEMES;
