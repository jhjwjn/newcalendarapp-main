import React, { useState, useEffect } from 'react';
import { useHealth } from '../../../context/HealthContext';
import { Flame, User as UserIcon, Clock, Palette, BarChart3, Moon, Sun, Check, Sparkles } from 'lucide-react';
import { HEALTH_DYNAMIC_THEMES, HEALTH_DYNAMIC_THEMES_DARK } from '../../../styles/colorThemes';

type ThemeMode = 'light' | 'dark';
type AccentColor = 'orange' | 'red' | 'blue' | 'black';

// Dynamic 스타일 - 라이트모드 3가지 악센트 색상
const dynamicAccentThemes = [
  { 
    id: 'orange' as const, 
    name: 'Energy Orange',
    colors: HEALTH_DYNAMIC_THEMES.orange,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES.orange.primary}, ${HEALTH_DYNAMIC_THEMES.orange.tertiary}, ${HEALTH_DYNAMIC_THEMES.orange.accent2})`,
  },
  { 
    id: 'red' as const, 
    name: 'Power Red',
    colors: HEALTH_DYNAMIC_THEMES.red,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES.red.primary}, ${HEALTH_DYNAMIC_THEMES.red.tertiary}, ${HEALTH_DYNAMIC_THEMES.red.accent1})`,
  },
  { 
    id: 'blue' as const, 
    name: 'Electric Blue',
    colors: HEALTH_DYNAMIC_THEMES.blue,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES.blue.primary}, ${HEALTH_DYNAMIC_THEMES.blue.tertiary}, ${HEALTH_DYNAMIC_THEMES.blue.accent2})`,
  },
  {
    id: 'black' as const,
    name: 'Stealth Black',
    colors: HEALTH_DYNAMIC_THEMES.black,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES.black.primary}, ${HEALTH_DYNAMIC_THEMES.black.tertiary}, ${HEALTH_DYNAMIC_THEMES.black.accent2})`,
  },
];

// Dynamic 스타일 - 다크모드 3가지 악센트 색상
const dynamicAccentThemesDark = [
  { 
    id: 'orange' as const, 
    name: 'Energy Orange Dark',
    colors: HEALTH_DYNAMIC_THEMES_DARK.orange,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES_DARK.orange.primary}, ${HEALTH_DYNAMIC_THEMES_DARK.orange.tertiary}, ${HEALTH_DYNAMIC_THEMES_DARK.orange.accent2})`,
  },
  { 
    id: 'red' as const, 
    name: 'Power Red Dark',
    colors: HEALTH_DYNAMIC_THEMES_DARK.red,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES_DARK.red.primary}, ${HEALTH_DYNAMIC_THEMES_DARK.red.tertiary}, ${HEALTH_DYNAMIC_THEMES_DARK.red.accent1})`,
  },
  { 
    id: 'blue' as const, 
    name: 'Electric Blue Dark',
    colors: HEALTH_DYNAMIC_THEMES_DARK.blue,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES_DARK.blue.primary}, ${HEALTH_DYNAMIC_THEMES_DARK.blue.tertiary}, ${HEALTH_DYNAMIC_THEMES_DARK.blue.accent2})`,
  },
  {
    id: 'black' as const,
    name: 'Stealth Black Dark',
    colors: HEALTH_DYNAMIC_THEMES_DARK.black,
    preview: `linear-gradient(135deg, ${HEALTH_DYNAMIC_THEMES_DARK.black.primary}, ${HEALTH_DYNAMIC_THEMES_DARK.black.tertiary}, ${HEALTH_DYNAMIC_THEMES_DARK.black.accent2})`,
  },
];

interface SettingsTabProps {
  theme: any;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

export function SettingsTab({ theme, themeMode, setThemeMode, accentColor, setAccentColor }: SettingsTabProps) {
  const {
    settings,
    updateSettings,
    getTotalWorkoutCount,
    getCurrentStreak,
  } = useHealth();
  
  const [name, setName] = useState(settings.name);
  const [restTime, setRestTime] = useState(settings.defaultRestTime);
  
  // 다크모드일 때는 dynamicAccentDark, 라이트모드일 때는 dynamicAccent 사용
  const [selectedAccent, setSelectedAccent] = useState(
    settings.isDarkMode 
      ? (settings.dynamicAccentDark || 'orange')
      : (settings.dynamicAccent || 'orange')
  );

  // settings가 변경될 때마다 selectedAccent 동기화
  useEffect(() => {
    const newAccent = settings.isDarkMode 
      ? (settings.dynamicAccentDark || 'orange')
      : (settings.dynamicAccent || 'orange');
    setSelectedAccent(newAccent);
  }, [settings.isDarkMode, settings.dynamicAccent, settings.dynamicAccentDark]);

  const handleNameBlur = async () => {
    if (name !== settings.name) {
      await updateSettings({ name });
    }
  };

  const handleThemeChange = async (themeId: string) => {
    await updateSettings({ theme: themeId as any });
  };

  const handleRestTimeChange = async (time: number) => {
    setRestTime(time);
    await updateSettings({ defaultRestTime: time });
  };

  const totalWorkouts = getTotalWorkoutCount();
  const currentStreak = getCurrentStreak();

  return (
    <div className="min-h-full pb-24" style={{ backgroundColor: theme.bg }}>
      <div className="mx-auto max-w-[1320px] px-4 pb-6 pt-3">
        {/* 헤더 */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-1 md:mb-2" style={{ color: theme.text }}>
            SETTINGS
          </h1>
          <p className="text-sm md:text-base font-medium" style={{ color: theme.textSecondary }}>
            설정 및 통계
          </p>
        </div>

        {/* 모바일 1열 / 데스크탑 2열 */}
        <div className="space-y-4 md:space-y-6 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* 프로필 */}
          <div className="rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-xl border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>프로필</h2>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-bold" style={{ color: theme.textSecondary }}>이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="이름 입력"
                className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-right border-0 font-semibold text-xs md:text-sm"
                style={{ background: theme.accentSurface || theme.accent, color: theme.text }}
              />
            </div>
          </div>

          {/* API 설정 */}
          <div className="rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-xl border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>AI 설정</h2>
            </div>
            <input
              type="password"
              value={settings.groqApiKey || ''}
              onChange={(e) => updateSettings({ groqApiKey: e.target.value })}
              placeholder="API 키 입력"
              className="w-full px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm border-0 font-semibold"
              style={{ background: theme.accentSurface || theme.accent, color: theme.text }}
            />
            <div className="text-[10px] md:text-xs font-semibold mt-1.5 md:mt-2" style={{ color: theme.textMuted }}>
              운동 추천에 사용
            </div>
          </div>

          {/* 기본 휴식 시간 */}
          <div className="rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-xl border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>휴식 시간</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[60, 90, 120].map(seconds => {
                const minutes = seconds === 90 ? '1:30' : `${seconds / 60}분`;
                const isSelected = restTime === seconds;
                return (
                  <button
                    key={seconds}
                    onClick={() => handleRestTimeChange(seconds)}
                    className="py-2.5 md:py-4 rounded-lg md:rounded-2xl font-bold md:font-black transition-all text-xs md:text-sm"
                    style={{
                      background: isSelected ? theme.buttonGradient || theme.primary : theme.accent,
                      color: isSelected ? theme.bg : theme.textMuted,
                      border: `2px solid ${isSelected ? theme.primary : theme.cardBorder}`,
                    }}
                  >
                    {minutes}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 다크모드 토글 */}
          <div className="rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-xl border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.isDarkMode ? <Moon className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} /> : <Sun className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />}
                <span className="text-sm md:text-base font-bold" style={{ color: theme.textSecondary }}>
                  {settings.isDarkMode ? '다크 모드' : '라이트 모드'}
                </span>
              </div>
              <button
                onClick={async () => {
                  const newDarkMode = !settings.isDarkMode;
                  await updateSettings({ isDarkMode: newDarkMode });
                  setThemeMode(newDarkMode ? 'dark' : 'light');
                }}
                className="relative w-12 h-6 md:w-16 md:h-8 rounded-full transition-all"
                style={{ background: settings.isDarkMode ? theme.buttonGradient || theme.primary : theme.cardBorder }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 md:top-1 md:w-6 md:h-6 rounded-full bg-white transition-all flex items-center justify-center"
                  style={{ left: settings.isDarkMode ? 'calc(100% - 24px)' : '4px' }}
                >
                  {settings.isDarkMode ? <Moon className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ color: theme.primary }} /> : <Sun className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-500" />}
                </div>
              </button>
            </div>
          </div>

          {/* 운동 통계 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>통계</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md md:shadow-lg border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
                <div className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>총 운동</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-3xl font-black" style={{ color: theme.text }}>{totalWorkouts}</span>
                  <span className="text-[10px] md:text-sm font-semibold" style={{ color: theme.textMuted }}>회</span>
                </div>
              </div>
              <div className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md md:shadow-lg border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
                <div className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>PR</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-3xl font-black" style={{ color: theme.text }}>0</span>
                  <span className="text-[10px] md:text-sm font-semibold" style={{ color: theme.textMuted }}>개</span>
                </div>
              </div>
              <div className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md md:shadow-lg border" style={{ background: theme.panelBackgroundStrong || theme.card, borderColor: theme.cardBorder }}>
                <div className="text-[10px] md:text-xs font-bold" style={{ color: theme.textSecondary }}>연속</div>
                <div className="flex items-center gap-1">
                  <span className="text-xl md:text-3xl font-black" style={{ color: theme.text }}>{currentStreak}</span>
                  <Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                  <span className="text-[10px] md:text-sm font-semibold" style={{ color: theme.textMuted }}>일</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic 악센트 색상 선택 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-sm md:text-lg font-black" style={{ color: theme.text }}>테마 색상</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {(themeMode === 'light' ? dynamicAccentThemes : dynamicAccentThemesDark).map(accentTheme => (
                <button
                  key={accentTheme.id}
                  onClick={() => {
                    setSelectedAccent(accentTheme.id);
                    setAccentColor(accentTheme.id as AccentColor);
                    if (themeMode === 'dark') {
                      updateSettings({ dynamicAccentDark: accentTheme.id as any });
                    } else {
                      updateSettings({ dynamicAccent: accentTheme.id as any });
                    }
                  }}
                  className="rounded-xl md:rounded-2xl border p-2 md:p-3 text-left transition-transform hover:scale-[1.02]"
                  style={{
                    background: selectedAccent === accentTheme.id ? theme.panelBackgroundStrong : theme.navBackground,
                    borderColor: selectedAccent === accentTheme.id ? theme.primary : theme.cardBorder,
                    boxShadow: selectedAccent === accentTheme.id ? theme.buttonShadow : 'none',
                  }}
                >
                  <div className="mb-2 h-10 md:h-16 rounded-lg md:rounded-[18px]" style={{ background: accentTheme.preview }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-sm font-semibold truncate" style={{ color: theme.text }}>
                      {accentTheme.name.split(' ')[0]}
                    </span>
                    {selectedAccent === accentTheme.id && <Check className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" style={{ color: theme.primary }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
