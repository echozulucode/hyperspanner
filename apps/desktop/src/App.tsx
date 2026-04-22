import { PrimitiveGallery } from './pages/PrimitiveGallery';
import { ScreensHub, DerisScreen } from './pages/Screens';
import { AppShell } from './shell';
import { useHashRoute } from './hooks/useHashRoute';

/**
 * App root.
 *
 * Routes (hash-based — replaced by a real router once deep-links matter):
 *   #/gallery              → PrimitiveGallery (dev / design review)
 *   #/screens              → ScreensHub (index of de-risk screens)
 *   #/screens/<name>       → one de-risk screen in full-viewport view
 *   everything else        → AppShell
 *
 * De-risk screens exist so we can iterate on LCARS visuals in isolation
 * from AppShell's workspace state. See docs/plan-006.
 */
export const App = () => {
  const [route, navigate] = useHashRoute();

  if (route === 'gallery') {
    return (
      <PrimitiveGallery
        onBack={() => navigate('/')}
        onOpenScreens={() => navigate('/screens')}
      />
    );
  }

  if (route === 'screens') {
    return (
      <ScreensHub
        onBack={() => navigate('/')}
        onOpenScreen={(name) => navigate(`/screens/${name}`)}
      />
    );
  }

  if (route.startsWith('screens/')) {
    const name = route.slice('screens/'.length);
    return (
      <DerisScreen
        name={name}
        onBackToHub={() => navigate('/screens')}
        onBackToShell={() => navigate('/')}
      />
    );
  }

  return (
    <AppShell
      onOpenGallery={() => navigate('/gallery')}
      onOpenScreens={() => navigate('/screens')}
    />
  );
};
