import { HealthSettings } from '../types/health';
import { HEALTH_DYNAMIC_THEMES, HEALTH_DYNAMIC_THEMES_DARK } from '../styles/colorThemes';

type HealthAccent = keyof typeof HEALTH_DYNAMIC_THEMES;

export interface HealthTheme {
  bg: string;
  card: string;
  cardBorder: string;
  accent: string;
  panelBackground: string;
  panelBackgroundStrong: string;
  panelShadow: string;
  elevatedShadow: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  tertiary: string;
  accent1: string;
  accent2: string;
  pageBackground: string;
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  navBackground: string;
  navActiveBackground: string;
  navActiveText: string;
  navIdleText: string;
  buttonGradient: string;
  buttonShadow: string;
  accentSurface: string;
  accentSurfaceStrong: string;
  line: string;
}

export function getHealthTheme(settings: HealthSettings): HealthTheme {
  const isDark = settings.isDarkMode ?? false;
  const rawAccent = (isDark ? settings.dynamicAccentDark : settings.dynamicAccent) ?? 'orange';
  // migrate 'black' → 'teal'
  const accent = (rawAccent === 'black' ? 'teal' : rawAccent) as HealthAccent;
  const colors = isDark ? HEALTH_DYNAMIC_THEMES_DARK[accent] : HEALTH_DYNAMIC_THEMES[accent];

  if (isDark) {
    return {
      bg: '#05070a',
      card: 'rgba(12, 16, 24, 0.88)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      accent: 'rgba(255, 255, 255, 0.06)',
      panelBackground: `linear-gradient(180deg, rgba(16, 22, 33, 0.92), rgba(10, 14, 22, 0.88))`,
      panelBackgroundStrong: `linear-gradient(180deg, rgba(17, 24, 36, 0.96), rgba(9, 13, 20, 0.94))`,
      panelShadow: `0 18px 42px rgba(2, 6, 12, 0.42), 0 1px 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.03) inset`,
      elevatedShadow: `0 24px 56px ${colors.primary}24, 0 0 0 1px rgba(255,255,255,0.04) inset`,
      text: '#F7FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#7C8A9F',
      primary: colors.primary,
      primaryDark: colors.accent1,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      accent1: colors.accent1,
      accent2: colors.accent2,
      pageBackground: `radial-gradient(circle at 10% 10%, ${colors.primary}26, transparent 26%), radial-gradient(circle at 88% 22%, ${colors.accent1}20, transparent 22%), linear-gradient(160deg, #030507 0%, #0c1118 45%, #090d14 100%)`,
      shellBackground: 'rgba(5, 8, 13, 0.82)',
      shellBorder: 'rgba(255, 255, 255, 0.08)',
      shellShadow: `0 28px 90px ${colors.primary}1c`,
      navBackground: 'rgba(255, 255, 255, 0.04)',
      navActiveBackground: `linear-gradient(135deg, ${colors.primary}45 0%, ${colors.secondary}30 45%, ${colors.accent1}32 100%)`,
      navActiveText: '#FFFFFF',
      navIdleText: '#A5B4C8',
      buttonGradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.tertiary} 48%, ${colors.accent1} 100%)`,
      buttonShadow: `0 18px 34px ${colors.primary}36, inset 0 1px 0 rgba(255,255,255,0.18)`,
      accentSurface: `linear-gradient(180deg, ${colors.primary}18 0%, ${colors.accent1}10 100%)`,
      accentSurfaceStrong: `linear-gradient(135deg, ${colors.primary}26 0%, ${colors.tertiary}1a 50%, ${colors.accent1}18 100%)`,
      line: 'rgba(255, 255, 255, 0.08)',
    };
  }

  return {
    bg: '#f5f7fb',
    card: 'rgba(255, 255, 255, 0.94)',
    cardBorder: 'rgba(15, 23, 42, 0.08)',
    accent: 'rgba(15, 23, 42, 0.05)',
    panelBackground: `linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,252,0.86))`,
    panelBackgroundStrong: `linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,247,251,0.94))`,
    panelShadow: `0 18px 46px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255,255,255,0.9) inset`,
    elevatedShadow: `0 24px 54px ${colors.primary}1f, 0 1px 0 rgba(255,255,255,0.96) inset`,
    text: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    primary: colors.primary,
    primaryDark: colors.accent1,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    accent1: colors.accent1,
    accent2: colors.accent2,
    pageBackground: `radial-gradient(circle at 8% 10%, ${colors.primary}18, transparent 24%), radial-gradient(circle at 92% 18%, ${colors.accent1}16, transparent 20%), linear-gradient(160deg, #f4f6fb 0%, #edf2f7 46%, #f8fbff 100%)`,
    shellBackground: 'rgba(255, 255, 255, 0.92)',
    shellBorder: 'rgba(255, 255, 255, 0.7)',
    shellShadow: `0 28px 80px ${colors.primary}22`,
    navBackground: 'rgba(15, 23, 42, 0.05)',
    navActiveBackground: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    navActiveText: '#FFFFFF',
    navIdleText: '#475569',
    buttonGradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 55%, ${colors.accent1} 100%)`,
    buttonShadow: `0 8px 24px ${colors.primary}40, inset 0 1px 0 rgba(255,255,255,0.34)`,
    accentSurface: `linear-gradient(180deg, ${colors.primary}10 0%, ${colors.accent1}08 100%)`,
    accentSurfaceStrong: `linear-gradient(135deg, ${colors.primary}18 0%, ${colors.tertiary}10 52%, ${colors.accent1}10 100%)`,
    line: 'rgba(15, 23, 42, 0.08)',
  };
}
