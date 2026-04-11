import { PlannerSettings } from '../types/planner';
import { PLANNER_GLASS_THEMES, PLANNER_GLASS_THEMES_DARK } from '../styles/colorThemes';

type PlannerAccent = keyof typeof PLANNER_GLASS_THEMES;

export interface PlannerTheme {
  accent: PlannerAccent;
  isDark: boolean;
  primary: string;
  secondary: string;
  tertiary: string;
  accent1: string;
  accent2: string;
  pageBackground: string;
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  panelBackground: string;
  panelBackgroundStrong: string;
  panelBorder: string;
  panelShadow: string;
  hoverBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  badgeBackground: string;
  badgeText: string;
  navBackground: string;
  navActiveBackground: string;
  navActiveText: string;
  navIdleText: string;
  line: string;
}

export function getPlannerTheme(settings: PlannerSettings): PlannerTheme {
  const isDark = settings.isDarkMode ?? false;
  const accent = (isDark ? settings.glassAccentDark : settings.glassAccent) ?? 'blue';
  const colors = isDark ? PLANNER_GLASS_THEMES_DARK[accent] : PLANNER_GLASS_THEMES[accent];

  if (isDark) {
    return {
      accent,
      isDark,
      ...colors,
      pageBackground: `radial-gradient(circle at 8% 10%, ${colors.primary}18, transparent 28%), radial-gradient(circle at 92% 14%, ${colors.accent1}12, transparent 24%), #000000`,
      shellBackground: 'rgba(0, 0, 0, 0.92)',
      shellBorder: 'rgba(255, 255, 255, 0.08)',
      shellShadow: `0 24px 80px ${colors.primary}14`,
      panelBackground: 'rgba(10, 10, 10, 0.9)',
      panelBackgroundStrong: 'rgb(8, 8, 8)',
      panelBorder: 'rgba(255, 255, 255, 0.08)',
      panelShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
      hoverBackground: 'rgba(255, 255, 255, 0.05)',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#7A8A9F',
      badgeBackground: `${colors.primary}20`,
      badgeText: '#EFF6FF',
      navBackground: 'rgba(255, 255, 255, 0.04)',
      navActiveBackground: `linear-gradient(135deg, ${colors.primary}30, ${colors.accent1}18)`,
      navActiveText: '#F8FAFC',
      navIdleText: '#8A9AB4',
      line: 'rgba(255, 255, 255, 0.08)',
    };
  }

  return {
    accent,
    isDark,
    ...colors,
    pageBackground: `radial-gradient(circle at 8% 12%, ${colors.primary}24, transparent 26%), radial-gradient(circle at 92% 16%, ${colors.accent1}18, transparent 22%), linear-gradient(145deg, #f4f7ff 0%, #fff8fb 52%, #eef6ff 100%)`,
    shellBackground: 'rgba(255, 255, 255, 0.58)',
    shellBorder: 'rgba(255, 255, 255, 0.56)',
    shellShadow: `0 24px 72px ${colors.primary}16`,
    panelBackground: 'rgba(255, 255, 255, 0.72)',
    panelBackgroundStrong: 'rgb(248, 250, 255)',
    panelBorder: 'rgba(255, 255, 255, 0.68)',
    panelShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
    hoverBackground: 'rgba(255, 255, 255, 0.48)',
    text: '#172033',
    textSecondary: '#334155',
    textMuted: '#6B7B93',
    badgeBackground: `${colors.primary}14`,
    badgeText: '#1E293B',
    navBackground: 'rgba(255, 255, 255, 0.42)',
    navActiveBackground: `linear-gradient(135deg, ${colors.primary}24, ${colors.accent1}18)`,
    navActiveText: '#142033',
    navIdleText: '#5A6880',
    line: 'rgba(148, 163, 184, 0.16)',
  };
}
