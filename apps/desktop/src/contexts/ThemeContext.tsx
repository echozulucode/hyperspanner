import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { themes } from '../themes';
import type { LcarsTheme, ThemeName } from '../themes';

interface ThemeContextValue {
  theme: LcarsTheme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'picard-modern',
}) => {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);
  const theme = themes[themeName];

  useEffect(() => {
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--lcars-color-${toKebabCase(key)}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--lcars-spacing-${toKebabCase(key)}`, value);
    });

    root.style.setProperty('--lcars-font-family', theme.typography.fontFamily);
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--lcars-font-size-${toKebabCase(key)}`, value);
    });

    Object.entries(theme.animations).forEach(([key, value]) => {
      root.style.setProperty(`--lcars-animation-${toKebabCase(key)}`, value);
    });

    root.style.fontSize = theme.typography.fontSize.base;
    root.style.fontFamily = theme.typography.fontFamily;
    root.style.backgroundColor = theme.colors.background;
    root.style.color = theme.colors.text;
    root.dataset.lcarsTheme = theme.name;
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    themeName,
    setTheme: setThemeName,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
