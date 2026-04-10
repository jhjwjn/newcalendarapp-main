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

// 헬스 앱 Dynamic 스타일 색상 (강렬하고 역동적으로)
export const HEALTH_DYNAMIC_THEMES = {
  orange: {
    primary: '#F97316',
    secondary: '#EA580C',
    tertiary: '#C2410C',
    accent1: '#EF4444',
    accent2: '#8B5CF6',
  },
  red: {
    primary: '#DC2626',
    secondary: '#EF4444',
    tertiary: '#F87171',
    accent1: '#7C3AED',
    accent2: '#F59E0B',
  },
  blue: {
    primary: '#1D4ED8',
    secondary: '#2563EB',
    tertiary: '#3B82F6',
    accent1: '#7C3AED',
    accent2: '#06B6D4',
  },
  black: {
    primary: '#18181B',
    secondary: '#27272A',
    tertiary: '#71717A',
    accent1: '#A1A1AA',
    accent2: '#D4D4D8',
  },
} as const;

// 헬스 앱 다크모드 Dynamic 스타일 (더 강렬한 네온/비비드 계열)
export const HEALTH_DYNAMIC_THEMES_DARK = {
  orange: {
    primary: '#F97316',
    secondary: '#FB923C',
    tertiary: '#FED7AA',
    accent1: '#F43F5E',
    accent2: '#A855F7',
  },
  red: {
    primary: '#F43F5E',
    secondary: '#FB7185',
    tertiary: '#FCA5A5',
    accent1: '#A855F7',
    accent2: '#FBBF24',
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    tertiary: '#BAE6FD',
    accent1: '#A78BFA',
    accent2: '#34D399',
  },
  black: {
    primary: '#F8FAFC',
    secondary: '#E2E8F0',
    tertiary: '#94A3B8',
    accent1: '#CBD5E1',
    accent2: '#FFFFFF',
  },
};

// 타입 추론
export type PlannerGlassAccent = keyof typeof PLANNER_GLASS_THEMES;
export type HealthDynamicAccent = keyof typeof HEALTH_DYNAMIC_THEMES;
