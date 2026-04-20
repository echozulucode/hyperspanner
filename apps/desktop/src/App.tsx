import { useTheme } from './contexts/ThemeContext';

/**
 * Phase 0 placeholder.
 *
 * Goal: prove the bootstrap is wired up. We render the dark charcoal
 * background, Antonio typography, and a minimal status block confirming
 * theme tokens are flowing to CSS variables. The real shell arrives in
 * Phase 2.
 */
export const App = () => {
  const { theme, themeName } = useTheme();

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
        background: theme.colors.background,
        color: theme.colors.text,
        padding: '2rem',
      }}
    >
      <h1
        style={{
          margin: 0,
          color: theme.colors.orange,
          letterSpacing: '0.08em',
          fontSize: 'clamp(2.5rem, 4vw, 5rem)',
        }}
      >
        HYPERSPANNER
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.5rem 1.5rem',
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: theme.colors.almondCreme,
        }}
      >
        <span>● VARIANT</span>
        <span style={{ color: theme.colors.text }}>{themeName}</span>
        <span>● SHELL</span>
        <span style={{ color: theme.colors.text }}>phase 0 — bootstrap</span>
        <span>● STATUS</span>
        <span style={{ color: theme.colors.green }}>nominal</span>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1.5rem',
          borderRadius: '100vmax',
          background: theme.colors.africanViolet,
          color: theme.colors.textDark,
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        primitives + shell pending — phase 1
      </div>
    </div>
  );
};
