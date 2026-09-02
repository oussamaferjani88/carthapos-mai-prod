// Converts the flat `theme.*` shape written into app-config.json (see
// backend/utils/generators/ThemeCustomizer.js::updateAppConfig) into the
// nested {colors, typography, effects, layout} shape useThemeApplier expects.
const SHADOW_INTENSITY_TO_NUMBER = {
  none: 0,
  light: 0.5,
  medium: 1,
  large: 1.5,
  heavy: 2
};

export function mapThemeForApplier(theme) {
  if (!theme) return {};

  return {
    colors: theme.colors || {
      primary: theme.primaryColor,
      secondary: theme.secondaryColor,
      accent: theme.accentColor,
      background: theme.backgroundColor,
      text: theme.textColor,
      textMuted: theme.textMutedColor,
      border: theme.cardBorderColor,
      cardBackground: theme.cardBackgroundColor
    },
    typography: {
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      fontWeight: theme.fontWeight
    },
    effects: {
      borderRadius: theme.borderRadius,
      shadowIntensity: theme.shadows === false
        ? 0
        : (SHADOW_INTENSITY_TO_NUMBER[theme.shadowIntensity] ?? 1)
    },
    layout: {
      navbarPosition: theme.navbarPosition,
      spacingScale: theme.spacingScale,
      maxWidth: theme.maxWidth
    },
    appTitle: theme.appTitle,
    businessName: theme.businessName
  };
}
